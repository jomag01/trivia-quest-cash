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

    // Verify user has hub staff role
    const { data: userRole } = await supabase
      .from("courier_user_roles")
      .select("role, hub_id")
      .eq("user_id", userId)
      .in("role", ["hub_staff", "hub_manager", "admin"])
      .single();

    if (!userRole) {
      return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hubId = userRole.hub_id;

    if (req.method === "POST" && action === "scan") {
      const { tracking_number, scan_type, notes } = await req.json();

      // Find shipment
      const { data: shipment, error: shipmentError } = await supabase
        .from("courier_shipments")
        .select("*")
        .eq("tracking_number", tracking_number.toUpperCase())
        .single();

      if (shipmentError || !shipment) {
        return new Response(JSON.stringify({ error: "Shipment not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Determine new status based on scan type and current location
      let newStatus = shipment.status;
      let destinationHubId = null;

      switch (scan_type) {
        case "arrival":
          if (hubId === shipment.origin_hub_id) {
            newStatus = "at_origin_hub";
          } else if (hubId === shipment.destination_hub_id) {
            newStatus = "at_destination_hub";
          } else {
            newStatus = "in_transit";
          }
          break;
        case "sorting":
          newStatus = "in_transit";
          break;
        case "dispatch":
          newStatus = "in_transit";
          break;
        case "out_for_delivery":
          newStatus = "out_for_delivery";
          break;
      }

      // Record hub scan
      const { data: hubScan, error: scanError } = await supabase
        .from("courier_hub_scans")
        .insert({
          shipment_id: shipment.id,
          hub_id: hubId,
          scan_type,
          scanned_by: userId,
          destination_hub_id: destinationHubId,
          notes,
        })
        .select()
        .single();

      if (scanError) {
        return new Response(JSON.stringify({ error: scanError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update shipment status
      const updateData: any = { status: newStatus };
      if (scan_type === "arrival" && hubId === shipment.destination_hub_id) {
        updateData.destination_hub_id = hubId;
      }

      await supabase
        .from("courier_shipments")
        .update(updateData)
        .eq("id", shipment.id);

      // Get hub info for tracking event
      const { data: hub } = await supabase
        .from("courier_hubs")
        .select("hub_name, city")
        .eq("id", hubId)
        .single();

      // Add tracking event
      await supabase.from("courier_tracking_events").insert({
        shipment_id: shipment.id,
        status: newStatus,
        location: hub?.city,
        hub_id: hubId,
        notes: `${scan_type} scan at ${hub?.hub_name}`,
        performed_by: userId,
      });

      console.log("Hub scan:", tracking_number, scan_type, "->", newStatus);

      return new Response(JSON.stringify({
        success: true,
        scan: hubScan,
        new_status: newStatus,
        shipment_id: shipment.id,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "GET" && action === "pending-parcels") {
      const { data: parcels, error } = await supabase
        .from("courier_shipments")
        .select(`
          *,
          courier_zones!destination_zone_id(zone_name, zone_code)
        `)
        .or(`origin_hub_id.eq.${hubId},destination_hub_id.eq.${hubId}`)
        .in("status", ["at_origin_hub", "in_transit", "at_destination_hub"])
        .order("created_at", { ascending: true });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ parcels }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST" && action === "create-linehaul") {
      const { destination_hub_id, vehicle_number, driver_name, shipment_ids } = await req.json();

      // Create linehaul trip
      const { data: trip, error: tripError } = await supabase
        .from("courier_linehaul_trips")
        .insert({
          origin_hub_id: hubId,
          destination_hub_id,
          vehicle_number,
          driver_name,
          departed_at: new Date().toISOString(),
          status: "in_transit",
        })
        .select()
        .single();

      if (tripError) {
        return new Response(JSON.stringify({ error: tripError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Add parcels to linehaul
      const linehaulParcels = shipment_ids.map((id: string) => ({
        linehaul_id: trip.id,
        shipment_id: id,
        loaded_at: new Date().toISOString(),
      }));

      await supabase.from("courier_linehaul_parcels").insert(linehaulParcels);

      // Update shipment statuses
      await supabase
        .from("courier_shipments")
        .update({ status: "in_transit", current_hub_id: null })
        .in("id", shipment_ids);

      // Add tracking events
      const trackingEvents = shipment_ids.map((id: string) => ({
        shipment_id: id,
        status: "in_transit",
        location: `En route to destination`,
        hub_id: hubId,
        notes: `Dispatched via ${vehicle_number}`,
        performed_by: userId,
      }));

      await supabase.from("courier_tracking_events").insert(trackingEvents);

      console.log("Linehaul created:", trip.id, "with", shipment_ids.length, "parcels");

      return new Response(JSON.stringify({
        success: true,
        trip,
        parcels_count: shipment_ids.length,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST" && action === "receive-linehaul") {
      const { linehaul_id } = await req.json();

      // Update linehaul trip
      await supabase
        .from("courier_linehaul_trips")
        .update({
          arrived_at: new Date().toISOString(),
          status: "completed",
        })
        .eq("id", linehaul_id);

      // Get parcels in this linehaul
      const { data: linehaulParcels } = await supabase
        .from("courier_linehaul_parcels")
        .select("shipment_id")
        .eq("linehaul_id", linehaul_id);

      const shipmentIds = linehaulParcels?.map((p) => p.shipment_id) || [];

      // Update unloaded_at
      await supabase
        .from("courier_linehaul_parcels")
        .update({ unloaded_at: new Date().toISOString() })
        .eq("linehaul_id", linehaul_id);

      // Update shipment statuses
      await supabase
        .from("courier_shipments")
        .update({ 
          status: "at_destination_hub", 
          current_hub_id: hubId,
          destination_hub_id: hubId 
        })
        .in("id", shipmentIds);

      // Get hub info
      const { data: hub } = await supabase
        .from("courier_hubs")
        .select("hub_name, city")
        .eq("id", hubId)
        .single();

      // Add tracking events
      const trackingEvents = shipmentIds.map((id: string) => ({
        shipment_id: id,
        status: "at_destination_hub",
        location: hub?.city,
        hub_id: hubId,
        notes: `Arrived at ${hub?.hub_name}`,
        performed_by: userId,
      }));

      await supabase.from("courier_tracking_events").insert(trackingEvents);

      console.log("Linehaul received:", linehaul_id, "parcels:", shipmentIds.length);

      return new Response(JSON.stringify({
        success: true,
        parcels_received: shipmentIds.length,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Hub operations error:", error);
    return new Response(JSON.stringify({ error: error?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
