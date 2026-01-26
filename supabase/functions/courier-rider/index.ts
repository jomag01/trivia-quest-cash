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

    // Get rider info
    const { data: rider } = await supabase
      .from("courier_riders")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .single();

    if (!rider) {
      return new Response(JSON.stringify({ error: "Rider not found or inactive" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "GET" && action === "jobs") {
      const jobType = url.searchParams.get("type") || "all";
      const status = url.searchParams.get("status") || "pending";

      let query = supabase
        .from("courier_rider_jobs")
        .select(`
          *,
          courier_shipments(
            id,
            tracking_number,
            sender_name,
            sender_phone,
            sender_address,
            sender_city,
            receiver_name,
            receiver_phone,
            receiver_address,
            receiver_city,
            is_cod,
            cod_amount,
            package_type,
            weight_kg,
            special_instructions
          )
        `)
        .eq("rider_id", rider.id)
        .order("created_at", { ascending: false });

      if (jobType !== "all") {
        query = query.eq("job_type", jobType);
      }

      if (status !== "all") {
        query = query.eq("status", status);
      }

      const { data: jobs, error } = await query;

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ jobs }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST" && action === "accept-job") {
      const { job_id } = await req.json();

      const { data: job, error } = await supabase
        .from("courier_rider_jobs")
        .update({
          status: "accepted",
          accepted_at: new Date().toISOString(),
        })
        .eq("id", job_id)
        .eq("rider_id", rider.id)
        .eq("status", "pending")
        .select()
        .single();

      if (error || !job) {
        return new Response(JSON.stringify({ error: "Job not found or already accepted" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update shipment status
      const newStatus = job.job_type === "pickup" ? "pickup_assigned" : "out_for_delivery";
      await supabase
        .from("courier_shipments")
        .update({ status: newStatus })
        .eq("id", job.shipment_id);

      console.log("Job accepted:", job_id, "by rider:", rider.id);

      return new Response(JSON.stringify({ success: true, job }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST" && action === "complete-pickup") {
      const { job_id, latitude, longitude, notes } = await req.json();

      const { data: job, error: jobError } = await supabase
        .from("courier_rider_jobs")
        .select("*, courier_shipments(*)")
        .eq("id", job_id)
        .eq("rider_id", rider.id)
        .single();

      if (jobError || !job) {
        return new Response(JSON.stringify({ error: "Job not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update job
      await supabase
        .from("courier_rider_jobs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          completion_latitude: latitude,
          completion_longitude: longitude,
          notes,
        })
        .eq("id", job_id);

      // Update shipment
      await supabase
        .from("courier_shipments")
        .update({
          status: "picked_up",
          picked_up_at: new Date().toISOString(),
        })
        .eq("id", job.shipment_id);

      // Add tracking event
      await supabase.from("courier_tracking_events").insert({
        shipment_id: job.shipment_id,
        status: "picked_up",
        location: job.courier_shipments?.sender_city,
        latitude,
        longitude,
        notes: "Package picked up by rider",
        performed_by: userId,
      });

      console.log("Pickup completed:", job.courier_shipments?.tracking_number);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST" && action === "complete-delivery") {
      const { 
        job_id, 
        latitude, 
        longitude, 
        signature_url, 
        photo_url,
        received_by,
        cod_collected,
        notes 
      } = await req.json();

      const { data: job, error: jobError } = await supabase
        .from("courier_rider_jobs")
        .select("*, courier_shipments(*)")
        .eq("id", job_id)
        .eq("rider_id", rider.id)
        .single();

      if (jobError || !job) {
        return new Response(JSON.stringify({ error: "Job not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const shipment = job.courier_shipments;

      // Validate COD if applicable
      if (shipment.is_cod && cod_collected !== shipment.cod_amount) {
        return new Response(JSON.stringify({ 
          error: `COD amount mismatch. Expected: ₱${shipment.cod_amount}, Collected: ₱${cod_collected}` 
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update job
      await supabase
        .from("courier_rider_jobs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          completion_latitude: latitude,
          completion_longitude: longitude,
          signature_url,
          photo_url,
          notes,
        })
        .eq("id", job_id);

      // Update shipment
      await supabase
        .from("courier_shipments")
        .update({
          status: "delivered",
          delivered_at: new Date().toISOString(),
          pod_signature_url: signature_url,
          pod_photo_url: photo_url,
          pod_received_by: received_by,
        })
        .eq("id", job.shipment_id);

      // Add tracking event
      await supabase.from("courier_tracking_events").insert({
        shipment_id: job.shipment_id,
        status: "delivered",
        location: shipment.receiver_city,
        latitude,
        longitude,
        notes: `Delivered to ${received_by}`,
        performed_by: userId,
      });

      // Handle COD
      if (shipment.is_cod && cod_collected > 0) {
        // Record COD transaction
        await supabase.from("courier_cod_transactions").insert({
          shipment_id: job.shipment_id,
          rider_id: rider.id,
          amount: cod_collected,
          transaction_type: "collection",
          status: "pending_turnover",
        });

        // Update rider's pending COD
        await supabase
          .from("courier_riders")
          .update({
            current_cod_amount: rider.current_cod_amount + cod_collected,
          })
          .eq("id", rider.id);
      }

      console.log("Delivery completed:", shipment.tracking_number, "COD:", cod_collected || 0);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST" && action === "failed-delivery") {
      const { job_id, reason_code, notes, latitude, longitude, photo_url } = await req.json();

      const { data: job, error: jobError } = await supabase
        .from("courier_rider_jobs")
        .select("*, courier_shipments(*)")
        .eq("id", job_id)
        .eq("rider_id", rider.id)
        .single();

      if (jobError || !job) {
        return new Response(JSON.stringify({ error: "Job not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update job as failed
      await supabase
        .from("courier_rider_jobs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          completion_latitude: latitude,
          completion_longitude: longitude,
          photo_url,
          notes: `${reason_code}: ${notes}`,
        })
        .eq("id", job_id);

      // Update shipment
      const failedAttempts = (job.courier_shipments?.failed_attempts || 0) + 1;
      const newStatus = failedAttempts >= 3 ? "returned" : "failed_delivery";

      await supabase
        .from("courier_shipments")
        .update({
          status: newStatus,
          failed_attempts: failedAttempts,
          last_failed_reason: reason_code,
        })
        .eq("id", job.shipment_id);

      // Add tracking event
      await supabase.from("courier_tracking_events").insert({
        shipment_id: job.shipment_id,
        status: newStatus,
        location: job.courier_shipments?.receiver_city,
        latitude,
        longitude,
        notes: `Delivery failed: ${reason_code}. Attempt ${failedAttempts}/3`,
        performed_by: userId,
      });

      console.log("Delivery failed:", job.courier_shipments?.tracking_number, reason_code);

      return new Response(JSON.stringify({ 
        success: true, 
        attempts: failedAttempts,
        will_return: failedAttempts >= 3 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST" && action === "update-location") {
      const { latitude, longitude } = await req.json();

      await supabase
        .from("courier_riders")
        .update({
          current_latitude: latitude,
          current_longitude: longitude,
          last_location_update: new Date().toISOString(),
        })
        .eq("id", rider.id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "GET" && action === "cod-summary") {
      const { data: summary } = await supabase
        .from("courier_cod_transactions")
        .select("amount, status")
        .eq("rider_id", rider.id)
        .eq("status", "pending_turnover");

      const totalPending = summary?.reduce((sum, t) => sum + t.amount, 0) || 0;

      return new Response(JSON.stringify({
        pending_cod: totalPending,
        current_balance: rider.current_cod_amount,
        pending_transactions: summary?.length || 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Rider API error:", error);
    return new Response(JSON.stringify({ error: error?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
