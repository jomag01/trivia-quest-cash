import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // Check user role
    const { data: userRole } = await supabase
      .from("courier_user_roles")
      .select("role, hub_id")
      .eq("user_id", userId)
      .single();

    if (req.method === "POST" && action === "rider-turnover") {
      // Hub staff receives COD from rider
      if (!userRole || !["hub_staff", "hub_manager", "admin"].includes(userRole.role)) {
        return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { rider_id, amount, reference_number, notes } = await req.json();

      // Get rider's pending COD
      const { data: rider } = await supabase
        .from("courier_riders")
        .select("*")
        .eq("id", rider_id)
        .single();

      if (!rider) {
        return new Response(JSON.stringify({ error: "Rider not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (amount > rider.current_cod_amount) {
        return new Response(JSON.stringify({ 
          error: `Amount exceeds rider's COD balance: ₱${rider.current_cod_amount}` 
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create turnover record
      const { data: turnover, error: turnoverError } = await supabase
        .from("courier_rider_turnovers")
        .insert({
          rider_id,
          hub_id: userRole.hub_id,
          amount,
          received_by: userId,
          reference_number,
          notes,
          status: "completed",
        })
        .select()
        .single();

      if (turnoverError) {
        return new Response(JSON.stringify({ error: turnoverError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update rider's COD balance
      await supabase
        .from("courier_riders")
        .update({
          current_cod_amount: rider.current_cod_amount - amount,
        })
        .eq("id", rider_id);

      // Update COD transactions status
      const { data: pendingTxns } = await supabase
        .from("courier_cod_transactions")
        .select("id, amount")
        .eq("rider_id", rider_id)
        .eq("status", "pending_turnover")
        .order("created_at", { ascending: true });

      let remaining = amount;
      for (const txn of pendingTxns || []) {
        if (remaining <= 0) break;
        
        if (txn.amount <= remaining) {
          await supabase
            .from("courier_cod_transactions")
            .update({ 
              status: "turned_over",
              turnover_id: turnover.id 
            })
            .eq("id", txn.id);
          remaining -= txn.amount;
        }
      }

      // Audit log
      await supabase.from("courier_audit_logs").insert({
        entity_type: "cod_turnover",
        entity_id: turnover.id,
        action: "rider_turnover",
        performed_by: userId,
        new_values: { rider_id, amount, reference_number },
      });

      console.log("COD turnover:", amount, "from rider:", rider_id);

      return new Response(JSON.stringify({ success: true, turnover }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST" && action === "credit-seller") {
      // Admin credits seller wallet from COD
      if (!userRole || !["admin", "finance"].includes(userRole.role)) {
        return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { shipment_id } = await req.json();

      // Get shipment with COD info
      const { data: shipment } = await supabase
        .from("courier_shipments")
        .select("*")
        .eq("id", shipment_id)
        .eq("status", "delivered")
        .eq("is_cod", true)
        .single();

      if (!shipment) {
        return new Response(JSON.stringify({ error: "Shipment not found or not eligible" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if already credited
      const { data: existingCredit } = await supabase
        .from("courier_cod_transactions")
        .select("id")
        .eq("shipment_id", shipment_id)
        .eq("transaction_type", "seller_credit")
        .single();

      if (existingCredit) {
        return new Response(JSON.stringify({ error: "Already credited to seller" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Calculate seller amount (COD - shipping fee - COD fee)
      const sellerAmount = shipment.cod_amount - shipment.shipping_fee - (shipment.cod_fee || 0);

      // Get or create seller wallet
      let { data: wallet } = await supabase
        .from("courier_seller_wallets")
        .select("*")
        .eq("seller_id", shipment.seller_id)
        .single();

      if (!wallet) {
        const { data: newWallet } = await supabase
          .from("courier_seller_wallets")
          .insert({ seller_id: shipment.seller_id, balance: 0 })
          .select()
          .single();
        wallet = newWallet;
      }

      // Credit wallet
      await supabase
        .from("courier_seller_wallets")
        .update({
          balance: wallet.balance + sellerAmount,
          total_earned: wallet.total_earned + sellerAmount,
        })
        .eq("id", wallet.id);

      // Record transaction
      await supabase.from("courier_wallet_transactions").insert({
        wallet_id: wallet.id,
        shipment_id,
        amount: sellerAmount,
        transaction_type: "cod_credit",
        description: `COD credit for ${shipment.tracking_number}`,
        balance_after: wallet.balance + sellerAmount,
      });

      // Record COD transaction
      await supabase.from("courier_cod_transactions").insert({
        shipment_id,
        amount: sellerAmount,
        transaction_type: "seller_credit",
        status: "completed",
      });

      // Update shipment COD status
      await supabase
        .from("courier_shipments")
        .update({ cod_status: "credited" })
        .eq("id", shipment_id);

      console.log("Seller credited:", sellerAmount, "for:", shipment.tracking_number);

      return new Response(JSON.stringify({ 
        success: true, 
        amount_credited: sellerAmount,
        new_balance: wallet.balance + sellerAmount 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "GET" && action === "pending-credits") {
      // Get delivered COD shipments not yet credited
      const { data: pending } = await supabase
        .from("courier_shipments")
        .select(`
          id,
          tracking_number,
          seller_id,
          cod_amount,
          shipping_fee,
          cod_fee,
          delivered_at,
          profiles:seller_id(full_name)
        `)
        .eq("status", "delivered")
        .eq("is_cod", true)
        .is("cod_status", null)
        .order("delivered_at", { ascending: true });

      const credits = pending?.map((s: any) => ({
        ...s,
        seller_name: s.profiles?.full_name,
        net_amount: s.cod_amount - s.shipping_fee - (s.cod_fee || 0),
      })) || [];

      return new Response(JSON.stringify({ pending_credits: credits }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "GET" && action === "seller-wallet") {
      // Seller views their wallet
      const { data: wallet } = await supabase
        .from("courier_seller_wallets")
        .select("*")
        .eq("seller_id", userId)
        .single();

      const { data: transactions } = await supabase
        .from("courier_wallet_transactions")
        .select("*")
        .eq("wallet_id", wallet?.id)
        .order("created_at", { ascending: false })
        .limit(50);

      return new Response(JSON.stringify({ 
        wallet: wallet || { balance: 0, pending_withdrawal: 0 },
        transactions: transactions || [] 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST" && action === "request-withdrawal") {
      const { amount, payout_method, payout_details } = await req.json();

      const { data: wallet } = await supabase
        .from("courier_seller_wallets")
        .select("*")
        .eq("seller_id", userId)
        .single();

      if (!wallet || wallet.balance < amount) {
        return new Response(JSON.stringify({ error: "Insufficient balance" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create withdrawal request
      const { data: transaction, error } = await supabase
        .from("courier_wallet_transactions")
        .insert({
          wallet_id: wallet.id,
          amount: -amount,
          transaction_type: "withdrawal_request",
          description: `Withdrawal to ${payout_method}`,
          payout_method,
          payout_details,
          status: "pending",
        })
        .select()
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update pending withdrawal
      await supabase
        .from("courier_seller_wallets")
        .update({
          pending_withdrawal: wallet.pending_withdrawal + amount,
        })
        .eq("id", wallet.id);

      console.log("Withdrawal requested:", amount, "by seller:", userId);

      return new Response(JSON.stringify({ success: true, transaction }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "GET" && action === "reconciliation-report") {
      if (!userRole || !["admin", "finance", "hub_manager"].includes(userRole.role)) {
        return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const dateFrom = url.searchParams.get("from") || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const dateTo = url.searchParams.get("to") || new Date().toISOString();

      // COD collected
      const { data: collected } = await supabase
        .from("courier_cod_transactions")
        .select("amount")
        .eq("transaction_type", "collection")
        .gte("created_at", dateFrom)
        .lte("created_at", dateTo);

      // COD turned over
      const { data: turnedOver } = await supabase
        .from("courier_rider_turnovers")
        .select("amount")
        .eq("status", "completed")
        .gte("created_at", dateFrom)
        .lte("created_at", dateTo);

      // COD credited to sellers
      const { data: credited } = await supabase
        .from("courier_cod_transactions")
        .select("amount")
        .eq("transaction_type", "seller_credit")
        .gte("created_at", dateFrom)
        .lte("created_at", dateTo);

      const totalCollected = collected?.reduce((sum, t) => sum + t.amount, 0) || 0;
      const totalTurnedOver = turnedOver?.reduce((sum, t) => sum + t.amount, 0) || 0;
      const totalCredited = credited?.reduce((sum, t) => sum + t.amount, 0) || 0;

      return new Response(JSON.stringify({
        period: { from: dateFrom, to: dateTo },
        total_collected: totalCollected,
        total_turned_over: totalTurnedOver,
        total_credited_to_sellers: totalCredited,
        pending_with_riders: totalCollected - totalTurnedOver,
        pending_seller_credits: totalTurnedOver - totalCredited,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("COD API error:", error);
    return new Response(JSON.stringify({ error: error?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
