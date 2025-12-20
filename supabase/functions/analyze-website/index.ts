import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, title, description, markdown, branding, images } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Analyzing website:', url);

    const prompt = `Analyze this website and provide detailed information for cloning it:

Website URL: ${url}
Title: ${title || 'N/A'}
Description: ${description || 'N/A'}

Content Sample:
${markdown?.substring(0, 5000) || 'No content available'}

${branding ? `
Branding Info:
- Colors: ${JSON.stringify(branding.colors || {})}
- Fonts: ${JSON.stringify(branding.fonts || [])}
- Logo: ${branding.logo || 'N/A'}
` : ''}

Images found: ${images?.length || 0}

Please analyze this website and respond with a JSON object containing:
1. designAnalysis: Brief description of the overall design aesthetic and style (2-3 sentences)
2. techStack: Array of likely technologies used (e.g., ["React", "Tailwind CSS", "Next.js"])
3. colorPalette: Array of main colors in hex format
4. layoutStructure: Description of the page layout structure
5. features: Array of key features/sections detected on the page
6. cloneInstructions: Step-by-step instructions on how to recreate this website/app (be specific about components, layout, styling)

Respond ONLY with valid JSON, no markdown code blocks.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'You are a web development expert that analyzes websites and provides detailed instructions for recreating them. Always respond with valid JSON only.' 
          },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    console.log('AI response received');

    // Parse JSON from response
    let analysis;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Return a default structure
      analysis = {
        designAnalysis: content.substring(0, 500) || 'Unable to analyze design',
        techStack: ['HTML', 'CSS', 'JavaScript'],
        colorPalette: branding?.colors ? Object.values(branding.colors).slice(0, 5) : ['#3b82f6', '#10b981', '#f59e0b'],
        layoutStructure: 'Standard web layout with header, main content, and footer',
        features: ['Navigation', 'Content sections', 'Footer'],
        cloneInstructions: 'Unable to generate specific instructions. Please try again or analyze the content manually.',
      };
    }

    return new Response(
      JSON.stringify({ success: true, analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error analyzing website:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to analyze website' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
