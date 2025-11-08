import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { timingSafeEqual } from "https://deno.land/std@0.168.0/crypto/timing_safe_equal.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, paymongo-signature',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify webhook signature
    const signature = req.headers.get("paymongo-signature");
    const webhookSecret = Deno.env.get("PAYMONGO_WEBHOOK_SECRET");

    if (!webhookSecret) {
      console.error("PAYMONGO_WEBHOOK_SECRET not configured");
      return new Response(JSON.stringify({ error: "Webhook configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!signature) {
      console.error("Missing PayMongo signature header");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get raw body for signature verification
    const rawBody = await req.text();
    
    // PayMongo uses HMAC SHA256 for signature verification
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(webhookSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signatureData = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(rawBody)
    );
    
    const expectedSignature = Array.from(new Uint8Array(signatureData))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Timing-safe comparison
    const providedSig = encoder.encode(signature);
    const expectedSig = encoder.encode(expectedSignature);

    if (
      providedSig.length !== expectedSig.length ||
      !timingSafeEqual(providedSig, expectedSig)
    ) {
      console.error("Invalid webhook signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse the validated payload
    const payload = JSON.parse(rawBody);
    console.log("Verified webhook received:", payload.data?.attributes?.type);

    const eventType = payload.data?.attributes?.type;
    
    if (eventType === "payment.paid") {
      const paymentIntent = payload.data.attributes.data;
      const transactionId = paymentIntent.attributes.metadata?.transaction_id;

      if (!transactionId) {
        console.error("No transaction ID in webhook");
        return new Response("No transaction ID", { status: 400 });
      }

      console.log("Processing payment for transaction:", transactionId);

      // Get transaction
      const { data: transaction, error: txError } = await supabaseClient
        .from("transactions")
        .select("*")
        .eq("id", transactionId)
        .single();

      if (txError || !transaction) {
        console.error("Transaction not found:", txError);
        return new Response("Transaction not found", { status: 404 });
      }

      // Update transaction status
      const { error: updateError } = await supabaseClient
        .from("transactions")
        .update({ status: "completed" })
        .eq("id", transactionId);

      if (updateError) {
        console.error("Failed to update transaction:", updateError);
        throw updateError;
      }

      // Get or create user wallet
      const { data: wallet } = await supabaseClient
        .from("user_wallets")
        .select("*")
        .eq("user_id", transaction.user_id)
        .single();

      const credits = transaction.metadata?.credits || 0;
      const currentBalance = wallet?.balance || 0;
      const currentCredits = wallet?.credits || 0;

      if (wallet) {
        // Update existing wallet
        await supabaseClient
          .from("user_wallets")
          .update({
            balance: currentBalance + transaction.amount,
            credits: currentCredits + credits,
          })
          .eq("user_id", transaction.user_id);
      } else {
        // Create new wallet
        await supabaseClient
          .from("user_wallets")
          .insert({
            user_id: transaction.user_id,
            balance: transaction.amount,
            credits: credits,
          });
      }

      console.log("Payment processed successfully");
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});