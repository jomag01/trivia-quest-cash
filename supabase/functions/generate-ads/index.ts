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
    const { brandData, platforms } = await req.json();

    if (!brandData || !platforms || platforms.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Brand data and platforms are required' }),
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

    // Deduct credits
    const creditCost = platforms.length * 3;
    const { data: profile } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .single();

    if (!profile || profile.credits < creditCost) {
      return new Response(
        JSON.stringify({ error: 'Insufficient credits' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate ads using AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const platformSpecs: Record<string, string> = {
      facebook: "Facebook: Create engaging ad with attention-grabbing headline (max 40 chars), primary text (max 125 chars), description (max 30 chars), and clear CTA. Use conversational tone.",
      instagram: "Instagram: Create visually-focused ad with short punchy headline, aesthetic description, lifestyle-oriented text. Include 5-7 relevant hashtags. Use trendy, engaging tone.",
      twitter: "Twitter/X: Create concise ad with bold headline, short impactful text (max 280 chars total), trending hashtags. Use direct, witty tone.",
      linkedin: "LinkedIn: Create professional ad with business-oriented headline, value-proposition focused text, industry-relevant description. Use authoritative, professional tone.",
      youtube: "YouTube: Create video-style ad with clickbait-worthy headline, curiosity-driven description, viewer-action CTA. Use energetic, engaging tone.",
      tiktok: "TikTok: Create Gen-Z friendly ad with trendy headline, fun casual text, viral-potential description. Include trending hashtags. Use playful, authentic tone.",
    };

    const platformPrompts = platforms.map((p: string) => platformSpecs[p] || platformSpecs.facebook);

    const systemPrompt = `You are an expert social media advertising copywriter and marketing strategist. 
You create high-converting, platform-optimized ad copy that resonates with target audiences.
You understand each platform's unique requirements, character limits, and best practices.

IMPORTANT: Respond ONLY with valid JSON array, no markdown, no code blocks.`;

    const userPrompt = `Create unique, engaging ads for a brand with the following details:

BRAND INFORMATION:
- Website: ${brandData.url}
- Brand Name: ${brandData.title}
- Description: ${brandData.description}
- Content Summary: ${brandData.content?.substring(0, 2000) || 'Not available'}
${brandData.branding ? `- Brand Colors: ${JSON.stringify(brandData.branding.colors || [])}` : ''}
${brandData.branding?.tagline ? `- Tagline: ${brandData.branding.tagline}` : ''}

Create ONE unique ad for each of these platforms:
${platformPrompts.join('\n')}

For EACH ad, provide:
1. headline: Attention-grabbing headline
2. primaryText: Main ad copy/body text
3. description: Short supporting description
4. callToAction: Clear CTA button text (e.g., "Shop Now", "Learn More", "Sign Up")
5. hashtags: Array of 3-7 relevant hashtags (with # prefix)
6. imagePrompt: Detailed prompt for AI image generation that would create a perfect ad visual for this brand

Return a JSON array with objects containing: platform, headline, primaryText, description, callToAction, hashtags (array), imagePrompt

Example format:
[
  {
    "platform": "facebook",
    "headline": "Transform Your Space Today",
    "primaryText": "Discover the secret to stunning home decor...",
    "description": "Shop our collection",
    "callToAction": "Shop Now",
    "hashtags": ["#homedecor", "#interiordesign"],
    "imagePrompt": "Modern living room with elegant furniture..."
  }
]`;

    console.log('Generating ads for platforms:', platforms);

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
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add funds.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error('Failed to generate ads');
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || '';

    // Parse the JSON response
    let ads: any[] = [];
    try {
      // Clean the response - remove markdown code blocks if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.slice(7);
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith('```')) {
        cleanContent = cleanContent.slice(0, -3);
      }
      cleanContent = cleanContent.trim();
      
      ads = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Failed to parse generated ads');
    }

    // Add unique IDs to each ad
    ads = ads.map((ad: any, index: number) => ({
      ...ad,
      id: `${Date.now()}-${index}`,
    }));

    // Deduct credits
    await supabase
      .from('profiles')
      .update({ credits: profile.credits - creditCost })
      .eq('id', user.id);

    // Log the generation
    await supabase.from('ai_generations').insert({
      user_id: user.id,
      generation_type: 'ads',
      prompt: `Generated ${platforms.length} ads for ${brandData.url}`,
      credits_used: creditCost,
    });

    console.log('Generated ads successfully:', ads.length);

    return new Response(
      JSON.stringify({ success: true, ads }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating ads:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to generate ads' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
