import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const { amount, paymentMethod, description, metadata } = await req.json();

    if (!amount || amount <= 0) {
      throw new Error("Invalid amount");
    }

    console.log("Creating payment for user:", user.id, "Amount:", amount, "Method:", paymentMethod);

    // Create PayMongo checkout session for simpler flow
    const paymongoSecret = Deno.env.get("PAYMONGO_SECRET_KEY");
    if (!paymongoSecret) {
      throw new Error("Payment provider not configured. Please add PAYMONGO_SECRET_KEY to secrets.");
    }
    const authHeader = btoa(paymongoSecret + ":");

    // Get the app URL for redirects
    const appUrl = Deno.env.get("APP_URL") || "https://c512181307b84e4689a38c4951e10c56.lovableproject.com";

    // Map payment methods for checkout
    const paymentMethodMap: Record<string, string[]> = {
      'gcash': ['gcash'],
      'paymaya': ['paymaya'],
      'card': ['card'],
      'grab_pay': ['grab_pay'],
    };

    const allowedMethods = paymentMethodMap[paymentMethod] || ['gcash', 'paymaya', 'card', 'grab_pay'];

    // Create checkout session (simpler than payment intents for e-wallets)
    const checkoutData = {
      data: {
        attributes: {
          send_email_receipt: true,
          show_description: true,
          show_line_items: true,
          description: description || `AI Credits Purchase`,
          line_items: [
            {
              currency: "PHP",
              amount: Math.floor(amount * 100), // Convert to centavos
              name: description || `AI Credits - ${metadata?.credits || Math.floor(amount / 10)} credits`,
              quantity: 1,
            }
          ],
          payment_method_types: allowedMethods,
          success_url: `${appUrl}?payment=success&credits=${metadata?.credits || 0}`,
          cancel_url: `${appUrl}?payment=cancelled`,
          metadata: {
            user_id: user.id,
            purchase_type: metadata?.purchase_type || 'ai_credits',
            credits: metadata?.credits || Math.floor(amount / 10),
            tier_index: metadata?.tier_index,
          },
        },
      },
    };

    console.log("Creating checkout session with data:", JSON.stringify(checkoutData));

    const checkoutResponse = await fetch(
      "https://api.paymongo.com/v1/checkout_sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${authHeader}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(checkoutData),
      }
    );

    const responseText = await checkoutResponse.text();
    console.log("PayMongo response:", responseText);

    if (!checkoutResponse.ok) {
      try {
        const errorData = JSON.parse(responseText);
        if (errorData.errors && errorData.errors[0]) {
          const error = errorData.errors[0];
          if (error.code === "account_not_activated") {
            throw new Error("Payment provider account needs to be activated. Please activate your PayMongo account.");
          }
          throw new Error(error.detail || error.code || "Payment processing failed");
        }
      } catch (parseError) {
        if (parseError instanceof Error && parseError.message.includes("Payment provider")) {
          throw parseError;
        }
      }
      throw new Error("Payment processing failed. Please try again.");
    }

    const checkoutSession = JSON.parse(responseText);
    const checkoutUrl = checkoutSession.data.attributes.checkout_url;

    console.log("Checkout session created:", checkoutSession.data.id, "URL:", checkoutUrl);

    // Record pending purchase
    const { error: purchaseError } = await supabaseClient
      .from('credit_purchases')
      .insert({
        user_id: user.id,
        amount: amount,
        credits: metadata?.credits || Math.floor(amount / 10),
        payment_method: paymentMethod,
        status: 'pending',
        reference_number: checkoutSession.data.id,
      });

    if (purchaseError) {
      console.error("Error recording purchase:", purchaseError);
      // Don't throw - still return checkout URL
    }

    return new Response(
      JSON.stringify({
        success: true,
        checkout_url: checkoutUrl,
        session_id: checkoutSession.data.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in create-payment:", error);
    
    let userMessage = "Payment processing failed. Please try again.";
    if (error instanceof Error) {
      userMessage = error.message;
    }
    
    return new Response(
      JSON.stringify({ error: userMessage }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
