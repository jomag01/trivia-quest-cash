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
    const FAL_API_KEY = Deno.env.get('FAL_API_KEY');
    if (!FAL_API_KEY) {
      throw new Error('FAL_API_KEY is not configured');
    }

    const { prompt, duration = 30, instrumental = false } = await req.json();
    
    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating music with prompt:', prompt, 'duration:', duration, 'instrumental:', instrumental);

    // Generate music using fal.ai's MusicGen model (more reliable than Suno API)
    const response = await fetch('https://queue.fal.run/fal-ai/stable-audio', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: instrumental ? `${prompt}, instrumental, no vocals` : prompt,
        seconds_total: Math.min(duration, 45), // Max 45 seconds
        steps: 100,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Fal.ai music error:', response.status, errorText);
      throw new Error(`Music generation error: ${response.status}`);
    }

    const result = await response.json();
    console.log('Fal.ai music response:', JSON.stringify(result));

    // Extract audio URL from response
    const audioUrl = result.audio_file?.url || result.audio?.url || result.output?.audio?.url;
    
    if (!audioUrl) {
      console.error('No audio URL in response:', result);
      throw new Error('No audio URL returned');
    }

    return new Response(
      JSON.stringify({ 
        audioUrl,
        title: 'AI Generated Music',
        success: true,
        message: 'Music generated successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate music';
    console.error('Music generation error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
