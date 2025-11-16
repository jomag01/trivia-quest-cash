import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      courier, 
      weight, 
      from_address, 
      to_address,
      service_type = "Standard" 
    } = await req.json();

    console.log('Calculating shipping rate for courier:', courier);
    console.log('Weight:', weight, 'kg');

    let shippingRate = null;

    if (courier === 'ninja_van') {
      const ninjaVanApiKey = Deno.env.get('NINJA_VAN_API_KEY');
      
      if (!ninjaVanApiKey) {
        console.log('Ninja Van API key not configured, using fallback rates');
        // Fallback rate calculation based on weight
        shippingRate = {
          courier: 'ninja_van',
          service_type: service_type,
          base_rate: 50,
          per_kg_rate: 15,
          estimated_cost: 50 + (weight * 15),
          currency: 'PHP',
          estimated_delivery_days: '2-3',
          is_estimated: true
        };
      } else {
        // Call Ninja Van API
        const ninjaVanPayload = {
          service_type: "Parcel",
          service_level: service_type,
          from: from_address,
          to: to_address,
          parcel_job: {
            dimensions: {
              weight: weight
            },
            items: [{
              item_description: "Product shipment",
              quantity: 1,
              is_dangerous_good: false
            }]
          }
        };

        const response = await fetch('https://api-sandbox.ninjavan.co/ph/4.1/orders', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${ninjaVanApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(ninjaVanPayload)
        });

        if (!response.ok) {
          throw new Error(`Ninja Van API error: ${response.statusText}`);
        }

        const data = await response.json();
        
        shippingRate = {
          courier: 'ninja_van',
          service_type: service_type,
          estimated_cost: data.price?.amount || (50 + (weight * 15)),
          currency: data.price?.currency || 'PHP',
          tracking_id: data.tracking_id,
          estimated_delivery_days: data.estimated_delivery_date,
          is_estimated: false
        };
      }
    } else if (courier === 'jnt') {
      // J&T Express fallback rates
      shippingRate = {
        courier: 'jnt',
        service_type: service_type,
        base_rate: 45,
        per_kg_rate: 12,
        estimated_cost: 45 + (weight * 12),
        currency: 'PHP',
        estimated_delivery_days: '2-4',
        is_estimated: true
      };
    } else if (courier === 'lbc') {
      // LBC fallback rates
      shippingRate = {
        courier: 'lbc',
        service_type: service_type,
        base_rate: 60,
        per_kg_rate: 18,
        estimated_cost: 60 + (weight * 18),
        currency: 'PHP',
        estimated_delivery_days: '3-5',
        is_estimated: true
      };
    } else if (courier === 'flash_express') {
      // Flash Express fallback rates
      shippingRate = {
        courier: 'flash_express',
        service_type: service_type,
        base_rate: 40,
        per_kg_rate: 10,
        estimated_cost: 40 + (weight * 10),
        currency: 'PHP',
        estimated_delivery_days: '1-2',
        is_estimated: true
      };
    }

    return new Response(
      JSON.stringify({ success: true, shipping_rate: shippingRate }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error calculating courier rate:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
