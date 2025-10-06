import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const payload = await req.json();
    console.log("Webhook received:", payload);

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
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});