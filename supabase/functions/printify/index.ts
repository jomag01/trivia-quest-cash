import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PRINTIFY_API_URL = 'https://api.printify.com/v1';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('PRINTIFY_API_KEY');
    if (!apiKey) {
      console.error('PRINTIFY_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Printify API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, ...params } = await req.json();
    console.log('Printify action:', action, 'params:', JSON.stringify(params));

    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    let response: Response;
    let data: unknown;

    switch (action) {
      case 'get_shops': {
        response = await fetch(`${PRINTIFY_API_URL}/shops.json`, { headers });
        data = await response.json();
        console.log('Shops fetched:', data);
        break;
      }

      case 'get_catalog': {
        response = await fetch(`${PRINTIFY_API_URL}/catalog/blueprints.json`, { headers });
        data = await response.json();
        console.log('Catalog blueprints count:', Array.isArray(data) ? data.length : 'N/A');
        break;
      }

      case 'get_blueprint': {
        const { blueprintId } = params;
        response = await fetch(`${PRINTIFY_API_URL}/catalog/blueprints/${blueprintId}.json`, { headers });
        data = await response.json();
        break;
      }

      case 'get_print_providers': {
        const { blueprintId } = params;
        response = await fetch(`${PRINTIFY_API_URL}/catalog/blueprints/${blueprintId}/print_providers.json`, { headers });
        data = await response.json();
        break;
      }

      case 'get_variants': {
        const { blueprintId, printProviderId } = params;
        response = await fetch(`${PRINTIFY_API_URL}/catalog/blueprints/${blueprintId}/print_providers/${printProviderId}/variants.json`, { headers });
        data = await response.json();
        break;
      }

      case 'get_products': {
        const { shopId } = params;
        response = await fetch(`${PRINTIFY_API_URL}/shops/${shopId}/products.json`, { headers });
        data = await response.json();
        break;
      }

      case 'get_product': {
        const { shopId, productId } = params;
        response = await fetch(`${PRINTIFY_API_URL}/shops/${shopId}/products/${productId}.json`, { headers });
        data = await response.json();
        break;
      }

      case 'create_product': {
        const { shopId, product } = params;
        response = await fetch(`${PRINTIFY_API_URL}/shops/${shopId}/products.json`, {
          method: 'POST',
          headers,
          body: JSON.stringify(product),
        });
        data = await response.json();
        console.log('Product created:', data);
        break;
      }

      case 'publish_product': {
        const { shopId, productId, publishData } = params;
        response = await fetch(`${PRINTIFY_API_URL}/shops/${shopId}/products/${productId}/publish.json`, {
          method: 'POST',
          headers,
          body: JSON.stringify(publishData || {
            title: true,
            description: true,
            images: true,
            variants: true,
            tags: true,
          }),
        });
        data = await response.json();
        console.log('Product published:', data);
        break;
      }

      case 'upload_image': {
        const { fileName, base64Image, url } = params;
        const body = url 
          ? { file_name: fileName, url }
          : { file_name: fileName, contents: base64Image };
        
        response = await fetch(`${PRINTIFY_API_URL}/uploads/images.json`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });
        data = await response.json();
        console.log('Image uploaded:', data);
        break;
      }

      case 'get_orders': {
        const { shopId } = params;
        response = await fetch(`${PRINTIFY_API_URL}/shops/${shopId}/orders.json`, { headers });
        data = await response.json();
        break;
      }

      case 'get_order': {
        const { shopId, orderId } = params;
        response = await fetch(`${PRINTIFY_API_URL}/shops/${shopId}/orders/${orderId}.json`, { headers });
        data = await response.json();
        break;
      }

      case 'create_order': {
        const { shopId, order } = params;
        response = await fetch(`${PRINTIFY_API_URL}/shops/${shopId}/orders.json`, {
          method: 'POST',
          headers,
          body: JSON.stringify(order),
        });
        data = await response.json();
        console.log('Order created:', data);
        break;
      }

      case 'calculate_shipping': {
        const { shopId, order } = params;
        response = await fetch(`${PRINTIFY_API_URL}/shops/${shopId}/orders/shipping.json`, {
          method: 'POST',
          headers,
          body: JSON.stringify(order),
        });
        data = await response.json();
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    if (!response.ok) {
      console.error('Printify API error:', response.status, data);
      return new Response(
        JSON.stringify({ error: 'Printify API error', details: data }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Printify function error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
