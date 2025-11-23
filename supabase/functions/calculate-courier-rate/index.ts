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
      operation = 'calculate_rate', // calculate_rate, create_order, track_order, cancel_order, get_waybill, get_pudos
      courier, 
      weight, 
      from_address, 
      to_address,
      service_type = "Standard",
      tracking_number,
      order_data
    } = await req.json();

    console.log('Ninja Van operation:', operation);
    console.log('Courier:', courier);

    let result = null;

    if (courier === 'ninja_van') {
      const ninjaVanApiKey = Deno.env.get('NINJA_VAN_API_KEY');
      const apiBaseUrl = 'https://api-sandbox.ninjavan.co/ph';
      
      if (!ninjaVanApiKey && operation !== 'calculate_rate') {
        throw new Error('Ninja Van API key is required for this operation');
      }

      // Handle different operations
      switch (operation) {
        case 'calculate_rate':
          if (!ninjaVanApiKey) {
            // Fallback rate calculation
            result = {
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
            const ratePayload = {
              weight: weight,
              service_level: service_type,
              from: {
                l1_tier_code: from_address?.l1_tier_code || "PH-MNL",
                l2_tier_code: from_address?.l2_tier_code || "PH-MNL-QC"
              },
              to: {
                l1_tier_code: to_address?.l1_tier_code || "PH-MNL",
                l2_tier_code: to_address?.l2_tier_code || "PH-MNL-MKT"
              }
            };

            const response = await fetch(`${apiBaseUrl}/4.1/rates`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${ninjaVanApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(ratePayload)
            });

            if (!response.ok) {
              throw new Error(`Ninja Van API error: ${response.statusText}`);
            }

            const data = await response.json();
            result = {
              courier: 'ninja_van',
              service_type: service_type,
              estimated_cost: data.price?.amount || (50 + (weight * 15)),
              currency: data.price?.currency || 'PHP',
              tracking_id: data.tracking_id,
              estimated_delivery_days: data.estimated_delivery_date,
              is_estimated: false
            };
          }
          break;

        case 'create_order':
          const createResponse = await fetch(`${apiBaseUrl}/4.1/orders`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${ninjaVanApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(order_data)
          });

          if (!createResponse.ok) {
            const errorData = await createResponse.text();
            throw new Error(`Failed to create order: ${errorData}`);
          }

          result = await createResponse.json();
          break;

        case 'track_order':
          if (!tracking_number) {
            throw new Error('Tracking number is required');
          }

          const trackResponse = await fetch(`${apiBaseUrl}/2.0/orders/${tracking_number}`, {
            headers: {
              'Authorization': `Bearer ${ninjaVanApiKey}`,
            }
          });

          if (!trackResponse.ok) {
            throw new Error(`Failed to track order: ${trackResponse.statusText}`);
          }

          result = await trackResponse.json();
          break;

        case 'cancel_order':
          if (!tracking_number) {
            throw new Error('Tracking number is required');
          }

          const cancelResponse = await fetch(`${apiBaseUrl}/2.2/orders/${tracking_number}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${ninjaVanApiKey}`,
            }
          });

          if (!cancelResponse.ok) {
            throw new Error(`Failed to cancel order: ${cancelResponse.statusText}`);
          }

          result = await cancelResponse.json();
          break;

        case 'get_waybill':
          if (!tracking_number) {
            throw new Error('Tracking number is required');
          }

          const waybillResponse = await fetch(
            `${apiBaseUrl}/2.0/reports/waybill?tid=${tracking_number}&hide_shipper_details=1`,
            {
              headers: {
                'Authorization': `Bearer ${ninjaVanApiKey}`,
              }
            }
          );

          if (!waybillResponse.ok) {
            throw new Error(`Failed to get waybill: ${waybillResponse.statusText}`);
          }

          // Waybill returns PDF binary data
          const waybillBlob = await waybillResponse.blob();
          result = {
            waybill_url: URL.createObjectURL(waybillBlob),
            tracking_number: tracking_number
          };
          break;

        case 'get_pudos':
          const pudoParams = new URLSearchParams({
            can_customer_collect: 'true',
            allow_create_post: 'false',
            allow_customer_return: 'false',
            allow_shipper_send: 'false',
            allow_create_pack: 'false',
            can_sell_packs: 'false'
          });

          const pudoResponse = await fetch(`${apiBaseUrl}/2.1/pudos?${pudoParams}`, {
            headers: {
              'Authorization': `Bearer ${ninjaVanApiKey}`,
            }
          });

          if (!pudoResponse.ok) {
            throw new Error(`Failed to get PUDO locations: ${pudoResponse.statusText}`);
          }

          result = await pudoResponse.json();
          break;

        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
    } else if (courier === 'jnt' && operation === 'calculate_rate') {
      result = {
        courier: 'jnt',
        service_type: service_type,
        base_rate: 45,
        per_kg_rate: 12,
        estimated_cost: 45 + (weight * 12),
        currency: 'PHP',
        estimated_delivery_days: '2-4',
        is_estimated: true
      };
    } else if (courier === 'lbc' && operation === 'calculate_rate') {
      result = {
        courier: 'lbc',
        service_type: service_type,
        base_rate: 60,
        per_kg_rate: 18,
        estimated_cost: 60 + (weight * 18),
        currency: 'PHP',
        estimated_delivery_days: '3-5',
        is_estimated: true
      };
    } else if (courier === 'flash_express' && operation === 'calculate_rate') {
      result = {
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
      JSON.stringify({ success: true, data: result }),
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
