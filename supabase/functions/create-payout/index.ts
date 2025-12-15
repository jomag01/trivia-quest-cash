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

    const { amount, payoutAccountId } = await req.json();

    if (!amount || amount <= 0) {
      throw new Error("Invalid amount");
    }

    // Check if user is admin (admins can process payouts for any user)
    const userIsAdmin = await isAdmin(supabaseClient, user.id);

    console.log("Creating payout for user:", user.id, "Amount:", amount, "Admin:", userIsAdmin);

    // Get user wallet
    const { data: wallet, error: walletError } = await supabaseClient
      .from("user_wallets")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (walletError || !wallet) {
      throw new Error("Wallet not found");
    }

    if (wallet.balance < amount) {
      throw new Error("Insufficient balance");
    }

    // Get payout account details
    const { data: payoutAccount, error: accountError } = await supabaseClient
      .from("payout_accounts")
      .select("*")
      .eq("id", payoutAccountId)
      .eq("user_id", user.id)
      .single();

    if (accountError || !payoutAccount) {
      throw new Error("Payout account not found");
    }

    // Create transaction record
    const { data: transaction, error: transactionError } = await supabaseClient
      .from("transactions")
      .insert({
        user_id: user.id,
        type: "cashout",
        amount,
        status: "pending",
        payment_method: payoutAccount.account_type,
        payout_account_id: payoutAccountId,
        metadata: {
          account_name: payoutAccount.account_name,
          account_number: payoutAccount.account_number,
        },
      })
      .select()
      .single();

    if (transactionError) {
      console.error("Transaction creation error:", transactionError);
      throw transactionError;
    }

    // Deduct from wallet balance
    const { error: updateError } = await supabaseClient
      .from("user_wallets")
      .update({ balance: wallet.balance - amount })
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Wallet update error:", updateError);
      throw updateError;
    }

    console.log("Payout created successfully:", transaction.id);

    return new Response(
      JSON.stringify({
        success: true,
        transaction_id: transaction.id,
        message: "Payout request submitted. Processing may take 1-3 business days.",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in create-payout:", error);
    
    // Map internal errors to user-friendly messages
    let userMessage = "Payout request failed. Please try again.";
    if (error instanceof Error) {
      if (error.message === "Insufficient balance") {
        userMessage = "Insufficient balance for this payout.";
      } else if (error.message === "Payout account not found") {
        userMessage = "Selected payout account not found.";
      } else if (error.message === "Wallet not found") {
        userMessage = "Wallet not found. Please contact support.";
      } else if (error.message === "Not authenticated") {
        userMessage = "Please log in to continue.";
      } else if (error.message === "Invalid amount") {
        userMessage = "Invalid payout amount.";
      }
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