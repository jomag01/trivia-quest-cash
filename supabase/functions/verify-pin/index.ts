import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: authError } = await supabase.auth.getClaims(token);
    
    if (authError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;
    const { action, pin, newPin } = await req.json();

    // Get wallet with service role for PIN operations
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: wallet, error: walletError } = await serviceClient
      .from("cash_wallets")
      .select("pin_hash, pin_attempts, locked_until")
      .eq("user_id", userId)
      .single();

    if (walletError) {
      return new Response(
        JSON.stringify({ error: "Wallet not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if locked
    if (wallet.locked_until && new Date(wallet.locked_until) > new Date()) {
      const unlockTime = new Date(wallet.locked_until);
      return new Response(
        JSON.stringify({ error: "Wallet is locked", locked_until: wallet.locked_until }),
        { status: 423, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "verify") {
      // Verify existing PIN
      if (!wallet.pin_hash) {
        return new Response(
          JSON.stringify({ error: "No PIN set" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Handle legacy base64 PINs - migrate them on successful verification
      let isValid = false;
      const isLegacyHash = !wallet.pin_hash.startsWith("$2");
      
      if (isLegacyHash) {
        // Legacy base64 comparison
        isValid = wallet.pin_hash === btoa(pin);
        
        if (isValid) {
          // Migrate to bcrypt
          const newHash = await bcrypt.hash(pin);
          await serviceClient
            .from("cash_wallets")
            .update({ pin_hash: newHash, pin_attempts: 0 })
            .eq("user_id", userId);
        }
      } else {
        isValid = await bcrypt.compare(pin, wallet.pin_hash);
      }

      if (!isValid) {
        const attempts = (wallet.pin_attempts || 0) + 1;
        const updates: Record<string, unknown> = { pin_attempts: attempts };
        
        if (attempts >= 3) {
          updates.locked_until = new Date(Date.now() + 30 * 60 * 1000).toISOString();
        }

        await serviceClient
          .from("cash_wallets")
          .update(updates)
          .eq("user_id", userId);

        if (attempts >= 3) {
          return new Response(
            JSON.stringify({ error: "Too many attempts. Wallet locked for 30 minutes.", locked: true }),
            { status: 423, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ error: `Invalid PIN. ${3 - attempts} attempts remaining.`, attempts_remaining: 3 - attempts }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Reset attempts on success
      await serviceClient
        .from("cash_wallets")
        .update({ pin_attempts: 0 })
        .eq("user_id", userId);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (action === "set" || action === "change") {
      // Set or change PIN
      if (action === "change" && wallet.pin_hash) {
        // Verify current PIN first
        const isLegacyHash = !wallet.pin_hash.startsWith("$2");
        let isValid = false;
        
        if (isLegacyHash) {
          isValid = wallet.pin_hash === btoa(pin);
        } else {
          isValid = await bcrypt.compare(pin, wallet.pin_hash);
        }

        if (!isValid) {
          return new Response(
            JSON.stringify({ error: "Current PIN is incorrect" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      if (!newPin || newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
        return new Response(
          JSON.stringify({ error: "PIN must be exactly 4 digits" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Hash with bcrypt
      const hashedPin = await bcrypt.hash(newPin);

      const { error: updateError } = await serviceClient
        .from("cash_wallets")
        .update({ pin_hash: hashedPin, pin_attempts: 0, locked_until: null })
        .eq("user_id", userId);

      if (updateError) {
        console.error("Error updating PIN:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update PIN" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("PIN verification error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
