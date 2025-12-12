import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { productName, productDescription, productPrice, productCategory, targetLanguage } = await req.json();

    console.log('Generating sales pitch for:', productName, 'in language:', targetLanguage);

    const systemPrompt = `You are a friendly, enthusiastic AI sales assistant. Your job is to create a compelling, natural-sounding sales pitch for products. Keep it conversational, warm, and persuasive but not pushy. The pitch should be 2-3 sentences max and end with an invitation to add the item to cart. Speak as if you're directly talking to the customer.

IMPORTANT: You MUST respond in ${targetLanguage || 'English'}. The entire pitch must be in ${targetLanguage || 'English'}.`;

    const userPrompt = `Create a short, engaging sales pitch for this product in ${targetLanguage || 'English'}:
- Name: ${productName}
- Category: ${productCategory || 'General'}
- Price: ₱${productPrice}
- Description: ${productDescription || 'No description available'}

If the description is missing or vague, use your knowledge to describe what this type of product typically offers. Make it sound natural and conversational, as if you're speaking to a friend about why they should buy this.

REMEMBER: Respond entirely in ${targetLanguage || 'English'}.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (response.status === 402) {
        throw new Error('AI credits exhausted. Please add more credits.');
      }
      throw new Error('Failed to generate sales pitch');
    }

    const data = await response.json();
    const pitch = data.choices?.[0]?.message?.content || 
      `Hi there! Check out this amazing ${productName}! At just ₱${productPrice}, it's a fantastic value. Would you like to add it to your cart?`;

    console.log('Generated pitch:', pitch);

    return new Response(JSON.stringify({ pitch }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Product avatar pitch error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    
    // Return a fallback pitch if AI fails
    return new Response(JSON.stringify({ 
      pitch: "Hi! I'm here to help you with this product. It looks like a great choice! Feel free to add it to your cart if you're interested.",
      error: errorMessage 
    }), {
      status: 200, // Return 200 with fallback to not break UX
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
