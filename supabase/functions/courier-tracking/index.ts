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

    const url = new URL(req.url);
    const trackingNumber = url.searchParams.get("tracking_number");

    if (!trackingNumber) {
      return new Response(JSON.stringify({ error: "Tracking number required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch shipment with tracking events
    const { data: shipment, error } = await supabase
      .from("courier_shipments")
      .select(`
        id,
        tracking_number,
        status,
        sender_name,
        sender_city,
        sender_province,
        receiver_name,
        receiver_city,
        receiver_province,
        package_type,
        weight_kg,
        is_cod,
        cod_amount,
        shipping_fee,
        created_at,
        picked_up_at,
        delivered_at,
        estimated_delivery,
        courier_tracking_events(
          id,
          status,
          location,
          hub_id,
          notes,
          created_at,
          courier_hubs(hub_name, city)
        )
      `)
      .eq("tracking_number", trackingNumber.toUpperCase())
      .single();

    if (error || !shipment) {
      return new Response(JSON.stringify({ 
        error: "Shipment not found",
        tracking_number: trackingNumber 
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Format timeline
    const timeline = shipment.courier_tracking_events
      ?.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map((event: any) => ({
        status: event.status,
        location: event.location || event.courier_hubs?.city || "Processing Center",
        hub_name: event.courier_hubs?.hub_name,
        notes: event.notes,
        timestamp: event.created_at,
      })) || [];

    // Get status display info
    const statusInfo = getStatusInfo(shipment.status);

    console.log("Tracking lookup:", trackingNumber, "Status:", shipment.status);

    return new Response(JSON.stringify({
      tracking_number: shipment.tracking_number,
      status: shipment.status,
      status_display: statusInfo.display,
      status_description: statusInfo.description,
      origin: {
        name: shipment.sender_name,
        city: shipment.sender_city,
        province: shipment.sender_province,
      },
      destination: {
        name: shipment.receiver_name,
        city: shipment.receiver_city,
        province: shipment.receiver_province,
      },
      package: {
        type: shipment.package_type,
        weight: shipment.weight_kg,
        is_cod: shipment.is_cod,
        cod_amount: shipment.cod_amount,
      },
      dates: {
        created: shipment.created_at,
        picked_up: shipment.picked_up_at,
        delivered: shipment.delivered_at,
        estimated_delivery: shipment.estimated_delivery,
      },
      timeline,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Tracking error:", error);
    return new Response(JSON.stringify({ error: error?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function getStatusInfo(status: string): { display: string; description: string } {
  const statusMap: Record<string, { display: string; description: string }> = {
    pending_pickup: {
      display: "Pending Pickup",
      description: "Shipment created, waiting for pickup",
    },
    pickup_assigned: {
      display: "Pickup Scheduled",
      description: "Rider assigned for pickup",
    },
    picked_up: {
      display: "Picked Up",
      description: "Package collected from sender",
    },
    at_origin_hub: {
      display: "At Origin Hub",
      description: "Package received at origin sorting facility",
    },
    in_transit: {
      display: "In Transit",
      description: "Package on the way to destination",
    },
    at_destination_hub: {
      display: "At Destination Hub",
      description: "Package arrived at destination facility",
    },
    out_for_delivery: {
      display: "Out for Delivery",
      description: "Package is being delivered to recipient",
    },
    delivered: {
      display: "Delivered",
      description: "Package successfully delivered",
    },
    failed_delivery: {
      display: "Delivery Failed",
      description: "Delivery attempt unsuccessful",
    },
    returned: {
      display: "Returned to Sender",
      description: "Package returned to origin",
    },
    cancelled: {
      display: "Cancelled",
      description: "Shipment cancelled",
    },
  };

  return statusMap[status] || { display: status, description: "" };
}
