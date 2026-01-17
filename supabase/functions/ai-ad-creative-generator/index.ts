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
    const { product_id, sponsored_product_id, variation_count = 3 } = await req.json();

    if (!product_id || !sponsored_product_id) {
      return new Response(
        JSON.stringify({ error: 'product_id and sponsored_product_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch product details
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, description, price, original_price, image_url, additional_images, category_id, rating')
      .eq('id', product_id)
      .single();

    if (productError || !product) {
      return new Response(
        JSON.stringify({ error: 'Product not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch category name
    let categoryName = 'General';
    if (product.category_id) {
      const { data: category } = await supabase
        .from('product_categories')
        .select('name')
        .eq('id', product.category_id)
        .single();
      if (category) categoryName = category.name;
    }

    // Generate ad creatives using AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const discount = product.original_price && product.price < product.original_price
      ? Math.round((1 - product.price / product.original_price) * 100)
      : 0;

    const systemPrompt = `You are an expert e-commerce ad copywriter. Create compelling, high-converting ad creatives for products.
Your ads should:
- Be attention-grabbing and benefit-focused
- Include urgency and social proof when appropriate
- Have clear calls-to-action
- Be suitable for various placements (homepage, search results, product pages)

IMPORTANT: Return ONLY valid JSON array, no markdown code blocks.`;

    const userPrompt = `Create ${variation_count} ad creative variations for this product:

Product: ${product.name}
Category: ${categoryName}
Price: ₱${product.price}
${discount > 0 ? `Discount: ${discount}% OFF` : ''}
${product.rating ? `Rating: ${product.rating} stars` : ''}
Description: ${product.description?.substring(0, 200) || 'Quality product'}

For each variation, provide:
1. headline (max 50 chars) - attention-grabbing title
2. description (max 100 chars) - benefit-focused description
3. cta_text (max 20 chars) - compelling call-to-action
4. variation_key - unique identifier like "urgent", "value", "quality", "social_proof"
5. creative_type - one of: "standard", "discount", "bestseller", "new_arrival", "limited"

Return JSON array with ${variation_count} objects.`;

    console.log('Generating ad creatives for product:', product.name);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error('Failed to generate creatives');
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || '';

    // Parse AI response
    let creatives: any[] = [];
    try {
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) cleanContent = cleanContent.slice(7);
      else if (cleanContent.startsWith('```')) cleanContent = cleanContent.slice(3);
      if (cleanContent.endsWith('```')) cleanContent = cleanContent.slice(0, -3);
      creatives = JSON.parse(cleanContent.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      // Fallback creatives
      creatives = [
        {
          headline: product.name.substring(0, 50),
          description: `Great deal on ${product.name}`,
          cta_text: 'Shop Now',
          variation_key: 'default',
          creative_type: 'standard'
        }
      ];
    }

    // Store creatives in database
    const creativesToInsert = creatives.map((c: any, index: number) => ({
      sponsored_product_id,
      product_id,
      seller_id: user.id,
      headline: c.headline || product.name,
      description: c.description || '',
      cta_text: c.cta_text || 'Shop Now',
      primary_image_url: product.image_url,
      secondary_images: product.additional_images || [],
      creative_type: c.creative_type || 'standard',
      variation_key: c.variation_key || `var_${index}`,
      is_control: index === 0,
      is_active: true,
    }));

    const { data: insertedCreatives, error: insertError } = await supabase
      .from('ai_ad_creatives')
      .insert(creativesToInsert)
      .select();

    if (insertError) {
      console.error('Error inserting creatives:', insertError);
      throw new Error('Failed to save creatives');
    }

    console.log('Generated and saved', insertedCreatives?.length, 'creatives');

    return new Response(
      JSON.stringify({ success: true, creatives: insertedCreatives }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating ad creatives:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to generate creatives' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
