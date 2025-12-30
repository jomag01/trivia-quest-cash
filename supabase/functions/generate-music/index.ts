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
    const body = await req.json();
    const KIE_API_KEY = Deno.env.get('KIE_API_KEY');
    
    // Handle test connection request
    if (body.type === 'test-connection') {
      if (!KIE_API_KEY) {
        return new Response(
          JSON.stringify({ 
            status: 'error', 
            message: 'Kie.ai API key not configured' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          status: 'ok', 
          message: 'Kie.ai music generation is available' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!KIE_API_KEY) {
      console.error('Kie.ai API key not configured');
      return new Response(
        JSON.stringify({ error: 'Kie.ai API key not configured. Please contact admin.' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { prompt, duration = 30, instrumental = true } = body;

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating music with Kie.ai:', { prompt, duration, instrumental });

    // Call Kie.ai music generation API
    const response = await fetch('https://api.kie.ai/api/v1/music/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KIE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        duration,
        instrumental,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Kie.ai API error:', response.status, errorText);
      
      // Check for quota/credit errors
      if (response.status === 402 || response.status === 429 || errorText.includes('quota') || errorText.includes('credit')) {
        return new Response(
          JSON.stringify({ 
            error: 'Kie.ai API quota exceeded or insufficient credits. Please contact admin.',
            provider_error: true
          }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: `Kie.ai API error: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('Kie.ai music generation successful');

    return new Response(
      JSON.stringify({ 
        audioUrl: data.audio_url || data.url,
        duration: data.duration,
        provider: 'kie.ai'
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
