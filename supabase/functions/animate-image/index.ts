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
    
    // Handle test connection request
    if (body.type === 'test-connection') {
      return new Response(
        JSON.stringify({ 
          status: 'unavailable', 
          message: 'Image animation is currently not available. Only OpenAI, Google Gemini, and ElevenLabs are enabled.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Image animation is disabled - only OpenAI, Gemini, and ElevenLabs are enabled
    return new Response(
      JSON.stringify({ 
        error: 'Image animation is currently not available. The system only supports OpenAI, Google Gemini, and ElevenLabs. For video content, please use the Content Creator to combine images with voiceovers.' 
      }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to animate image';
    console.error('Animate image error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
