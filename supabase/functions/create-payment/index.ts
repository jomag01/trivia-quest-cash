import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isAdmin } from "../_shared/adminAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    const { amount, paymentMethod } = await req.json();

    if (!amount || amount <= 0) {
      throw new Error("Invalid amount");
    }

    // Check if user is admin (for logging/auditing purposes)
    const userIsAdmin = await isAdmin(supabaseClient, user.id);

    console.log("Creating payment for user:", user.id, "Amount:", amount, "Admin:", userIsAdmin);

    // Create transaction record
    const { data: transaction, error: transactionError } = await supabaseClient
      .from("transactions")
      .insert({
        user_id: user.id,
        type: "credit_purchase",
        amount,
        status: "pending",
        payment_method: paymentMethod,
        metadata: { credits: Math.floor(amount / 10) }, // 1 credit = 10 PHP
      })
      .select()
      .single();

    if (transactionError) {
      console.error("Transaction creation error:", transactionError);
      throw transactionError;
    }

    // Create PayMongo payment intent
    const paymongoSecret = Deno.env.get("PAYMONGO_SECRET_KEY");
    const authHeader = btoa(paymongoSecret + ":");

    const paymentData: any = {
      data: {
        attributes: {
          amount: Math.floor(amount * 100), // Convert to centavos
          currency: "PHP",
          description: `Credit Purchase - ${Math.floor(amount / 10)} credits`,
          statement_descriptor: "QuizB Credits",
          metadata: {
            transaction_id: transaction.id,
            user_id: user.id,
          },
        },
      },
    };

    // Add payment method specific configuration
    if (paymentMethod === "gcash" || paymentMethod === "paymaya") {
      paymentData.data.attributes.payment_method_allowed = [paymentMethod];
    } else if (paymentMethod === "card") {
      paymentData.data.attributes.payment_method_allowed = ["card"];
    }

    const paymentResponse = await fetch(
      "https://api.paymongo.com/v1/payment_intents",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${authHeader}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paymentData),
      }
    );

    if (!paymentResponse.ok) {
      const errorText = await paymentResponse.text();
      console.error("PayMongo API error:", errorText);
      
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.errors && errorData.errors[0]) {
          const error = errorData.errors[0];
          if (error.code === "account_not_activated") {
            throw new Error("Payment provider account needs to be activated. Please activate your PayMongo account at https://dashboard.paymongo.com to enable payments.");
          }
          throw new Error(error.detail || error.code || "Payment processing failed");
        }
      } catch (parseError) {
        // If we can't parse it, throw the original error
        if (parseError instanceof Error && parseError.message.includes("Payment provider")) {
          throw parseError;
        }
      }
      
      throw new Error("Payment processing failed. Please try again or contact support.");
    }

    const paymentIntent = await paymentResponse.json();
    console.log("Payment intent created:", paymentIntent.data.id);

    // Update transaction with payment provider ID
    await supabaseClient
      .from("transactions")
      .update({ payment_provider_id: paymentIntent.data.id })
      .eq("id", transaction.id);

    // Create payment method if needed (for e-wallets)
    let checkoutUrl = null;
    if (paymentMethod === "gcash" || paymentMethod === "paymaya") {
      const paymentMethodResponse = await fetch(
        "https://api.paymongo.com/v1/payment_methods",
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${authHeader}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            data: {
              attributes: {
                type: paymentMethod,
              },
            },
          }),
        }
      );

      const paymentMethodData = await paymentMethodResponse.json();

      // Attach payment method to payment intent
      const attachResponse = await fetch(
        `https://api.paymongo.com/v1/payment_intents/${paymentIntent.data.id}/attach`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${authHeader}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            data: {
              attributes: {
                payment_method: paymentMethodData.data.id,
                return_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/payment-webhook`,
              },
            },
          }),
        }
      );

      const attachedPayment = await attachResponse.json();
      checkoutUrl = attachedPayment.data.attributes.next_action?.redirect?.url;
    }

    return new Response(
      JSON.stringify({
        success: true,
        transaction_id: transaction.id,
        payment_intent_id: paymentIntent.data.id,
        client_key: paymentIntent.data.attributes.client_key,
        checkout_url: checkoutUrl,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in create-payment:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});