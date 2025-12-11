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
    const SUNO_API_KEY = Deno.env.get('SUNO_API_KEY');
    if (!SUNO_API_KEY) {
      throw new Error('SUNO_API_KEY is not configured');
    }

    const { prompt, duration = 30, instrumental = false } = await req.json();
    
    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating music with prompt:', prompt, 'duration:', duration, 'instrumental:', instrumental);

    // Generate music using Suno API
    const response = await fetch('https://api.suno.ai/v1/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUNO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt,
        duration: duration,
        make_instrumental: instrumental,
        wait_audio: true, // Wait for audio to be generated
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Suno API error:', response.status, errorText);
      
      // Try alternative endpoint format
      const altResponse = await fetch('https://studio-api.suno.ai/api/external/generate/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUNO_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          make_instrumental: instrumental,
        }),
      });

      if (!altResponse.ok) {
        const altError = await altResponse.text();
        console.error('Suno Alt API error:', altResponse.status, altError);
        throw new Error(`Suno API error: ${response.status}`);
      }

      const altResult = await altResponse.json();
      console.log('Suno Alt response:', JSON.stringify(altResult));
      
      const audioUrl = altResult.audio_url || altResult[0]?.audio_url || altResult.clips?.[0]?.audio_url;
      
      if (!audioUrl) {
        throw new Error('No audio URL returned from Suno');
      }

      return new Response(
        JSON.stringify({ 
          audioUrl,
          title: altResult.title || altResult[0]?.title || 'AI Generated Music',
          success: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();
    console.log('Suno response:', JSON.stringify(result));

    // Extract audio URL from response
    const audioUrl = result.audio_url || result[0]?.audio_url || result.clips?.[0]?.audio_url;
    
    if (!audioUrl) {
      console.error('No audio URL in response:', result);
      throw new Error('No audio URL returned from Suno');
    }

    return new Response(
      JSON.stringify({ 
        audioUrl,
        title: result.title || result[0]?.title || 'AI Generated Music',
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
