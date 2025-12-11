import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

  try {
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const { action, topic, script, targetAudience, style, numScenes } = await req.json();

    if (action === 'research-topic') {
      console.log('Researching topic:', topic);
      
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{
            role: "user",
            content: `Research the topic "${topic}" and provide:
1. Key facts and statistics
2. Trending angles and hooks
3. Common questions people ask about this topic
4. Viral content ideas related to this topic
5. Best hashtags for social media

Format as a structured JSON object with these sections.`
          }]
        }),
      });

      if (!response.ok) {
        throw new Error('Topic research failed');
      }

      const data = await response.json();
      return new Response(JSON.stringify({ 
        research: data.choices?.[0]?.message?.content 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'generate-script') {
      console.log('Generating script for topic:', topic);
      
      const styleGuide = style || 'engaging and conversational';
      const audience = targetAudience || 'general audience';
      const scenes = numScenes || 5;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{
            role: "user",
            content: `Create a video script for a ${scenes}-scene video about "${topic}".

Target Audience: ${audience}
Style: ${styleGuide}

For each scene, provide:
1. Scene number
2. Visual description (what should be shown)
3. Voice-over text (narration)
4. Duration in seconds
5. Suggested background music mood

Also provide:
- Video title (catchy, SEO-friendly)
- Video description (for YouTube/social media)
- Hashtags
- Call-to-action

Format as JSON with structure:
{
  "title": "",
  "description": "",
  "hashtags": [],
  "callToAction": "",
  "totalDuration": 0,
  "scenes": [
    {
      "sceneNumber": 1,
      "visualDescription": "",
      "voiceOver": "",
      "durationSeconds": 0,
      "musicMood": ""
    }
  ]
}`
          }]
        }),
      });

      if (!response.ok) {
        throw new Error('Script generation failed');
      }

      const data = await response.json();
      let scriptContent = data.choices?.[0]?.message?.content || '';
      
      // Try to parse as JSON
      try {
        // Extract JSON from the response
        const jsonMatch = scriptContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          scriptContent = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.log('Could not parse script as JSON, returning as text');
      }

      return new Response(JSON.stringify({ script: scriptContent }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'generate-image-prompts') {
      console.log('Generating image prompts from script');
      
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{
            role: "user",
            content: `Based on this video script, create detailed image generation prompts for each scene:

${JSON.stringify(script)}

For each scene, provide a detailed prompt that can be used with AI image generation. Include:
- Visual style (realistic, animated, cinematic, etc.)
- Lighting and mood
- Key elements and objects
- Camera angle/perspective
- Color palette

Return as JSON array of prompts matching each scene.`
          }]
        }),
      });

      if (!response.ok) {
        throw new Error('Image prompt generation failed');
      }

      const data = await response.json();
      return new Response(JSON.stringify({ 
        prompts: data.choices?.[0]?.message?.content 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error: unknown) {
    console.error('Content creator error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
