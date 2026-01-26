import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateShipmentRequest {
  order_id?: string;
  sender_name: string;
  sender_phone: string;
  sender_address: string;
  sender_city: string;
  sender_province: string;
  sender_postal_code: string;
  receiver_name: string;
  receiver_phone: string;
  receiver_address: string;
  receiver_city: string;
  receiver_province: string;
  receiver_postal_code: string;
  package_type: string;
  weight_kg: number;
  length_cm?: number;
  width_cm?: number;
  height_cm?: number;
  declared_value: number;
  is_cod: boolean;
  cod_amount?: number;
  special_instructions?: string;
  items_description: string;
}

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
    const action = url.searchParams.get("action") || "create";

    if (req.method === "POST" && action === "create") {
      const body: CreateShipmentRequest = await req.json();
      
      // Calculate volumetric weight
      let volumetricWeight = 0;
      if (body.length_cm && body.width_cm && body.height_cm) {
        volumetricWeight = (body.length_cm * body.width_cm * body.height_cm) / 5000;
      }
      const chargeableWeight = Math.max(body.weight_kg, volumetricWeight);

      // Find origin and destination zones
      const { data: originZone } = await supabase
        .from("courier_zones")
        .select("id, zone_code")
        .eq("province", body.sender_province)
        .eq("is_active", true)
        .single();

      const { data: destZone } = await supabase
        .from("courier_zones")
        .select("id, zone_code")
        .eq("province", body.receiver_province)
        .eq("is_active", true)
        .single();

      // Find nearest origin hub
      const { data: originHub } = await supabase
        .from("courier_hubs")
        .select("id")
        .eq("zone_id", originZone?.id)
        .eq("is_active", true)
        .limit(1)
        .single();

      // Calculate pricing
      const { data: pricingRule } = await supabase
        .from("courier_pricing_rules")
        .select("*")
        .eq("origin_zone_id", originZone?.id)
        .eq("destination_zone_id", destZone?.id)
        .eq("is_active", true)
        .gte("weight_max_kg", chargeableWeight)
        .lte("weight_min_kg", chargeableWeight)
        .single();

      let shippingFee = pricingRule?.base_rate || 100;
      if (chargeableWeight > 1) {
        shippingFee += (chargeableWeight - 1) * (pricingRule?.per_kg_rate || 20);
      }

      let codFee = 0;
      if (body.is_cod && body.cod_amount) {
        codFee = Math.max(25, body.cod_amount * 0.02); // 2% or minimum 25
      }

      const totalAmount = shippingFee + codFee;

      // Create shipment
      const { data: shipment, error: shipmentError } = await supabase
        .from("courier_shipments")
        .insert({
          seller_id: userId,
          order_id: body.order_id,
          sender_name: body.sender_name,
          sender_phone: body.sender_phone,
          sender_address: body.sender_address,
          sender_city: body.sender_city,
          sender_province: body.sender_province,
          sender_postal_code: body.sender_postal_code,
          receiver_name: body.receiver_name,
          receiver_phone: body.receiver_phone,
          receiver_address: body.receiver_address,
          receiver_city: body.receiver_city,
          receiver_province: body.receiver_province,
          receiver_postal_code: body.receiver_postal_code,
          origin_zone_id: originZone?.id,
          destination_zone_id: destZone?.id,
          origin_hub_id: originHub?.id,
          package_type: body.package_type,
          weight_kg: body.weight_kg,
          volumetric_weight_kg: volumetricWeight,
          chargeable_weight_kg: chargeableWeight,
          length_cm: body.length_cm,
          width_cm: body.width_cm,
          height_cm: body.height_cm,
          declared_value: body.declared_value,
          shipping_fee: shippingFee,
          cod_fee: codFee,
          total_amount: totalAmount,
          is_cod: body.is_cod,
          cod_amount: body.cod_amount,
          special_instructions: body.special_instructions,
          items_description: body.items_description,
          status: "pending_pickup",
        })
        .select()
        .single();

      if (shipmentError) {
        console.error("Shipment creation error:", shipmentError);
        return new Response(JSON.stringify({ error: shipmentError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Log audit
      await supabase.from("courier_audit_logs").insert({
        entity_type: "shipment",
        entity_id: shipment.id,
        action: "created",
        performed_by: userId,
        new_values: shipment,
      });

      console.log("Shipment created:", shipment.tracking_number);

      return new Response(JSON.stringify({ 
        success: true, 
        shipment,
        pricing: {
          shipping_fee: shippingFee,
          cod_fee: codFee,
          total: totalAmount,
          chargeable_weight: chargeableWeight
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST" && action === "create-from-order") {
      const { order_id } = await req.json();

      // Fetch order details
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select(`
          *,
          order_items(*, products(*)),
          profiles:user_id(full_name, phone)
        `)
        .eq("id", order_id)
        .single();

      if (orderError || !order) {
        return new Response(JSON.stringify({ error: "Order not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get seller info
      const sellerId = order.order_items?.[0]?.products?.seller_id;
      const { data: seller } = await supabase
        .from("profiles")
        .select("full_name, phone, address, city, province, postal_code")
        .eq("id", sellerId)
        .single();

      // Calculate total weight from products
      const totalWeight = order.order_items?.reduce((sum: number, item: any) => {
        return sum + ((item.products?.weight || 0.5) * item.quantity);
      }, 0) || 0.5;

      const itemsDescription = order.order_items
        ?.map((item: any) => `${item.quantity}x ${item.products?.name}`)
        .join(", ") || "Package";

      const shipmentData: CreateShipmentRequest = {
        order_id: order.id,
        sender_name: seller?.full_name || "Seller",
        sender_phone: seller?.phone || "",
        sender_address: seller?.address || "",
        sender_city: seller?.city || "",
        sender_province: seller?.province || "",
        sender_postal_code: seller?.postal_code || "",
        receiver_name: order.shipping_name || order.profiles?.full_name || "",
        receiver_phone: order.shipping_phone || order.profiles?.phone || "",
        receiver_address: order.shipping_address || "",
        receiver_city: order.shipping_city || "",
        receiver_province: order.shipping_province || "",
        receiver_postal_code: order.shipping_postal_code || "",
        package_type: "parcel",
        weight_kg: totalWeight,
        declared_value: order.total_amount || 0,
        is_cod: order.payment_method === "cod",
        cod_amount: order.payment_method === "cod" ? order.total_amount : 0,
        items_description: itemsDescription,
      };

      // Create shipment directly
      const { data: shipment, error: shipmentError } = await supabase
        .from("courier_shipments")
        .insert({
          seller_id: userId,
          order_id: order_id,
          ...shipmentData,
          status: "pending_pickup",
        })
        .select()
        .single();

      if (shipmentError) {
        return new Response(JSON.stringify({ error: shipmentError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, shipment }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "GET" && action === "list") {
      const status = url.searchParams.get("status");
      const page = parseInt(url.searchParams.get("page") || "1");
      const limit = parseInt(url.searchParams.get("limit") || "20");
      const offset = (page - 1) * limit;

      let query = supabase
        .from("courier_shipments")
        .select("*, courier_tracking_events(*)", { count: "exact" })
        .eq("seller_id", userId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) {
        query = query.eq("status", status);
      }

      const { data: shipments, count, error } = await query;

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ 
        shipments, 
        total: count,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Courier shipment error:", error);
    return new Response(JSON.stringify({ error: error?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
