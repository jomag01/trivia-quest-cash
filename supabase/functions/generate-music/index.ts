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
          message: 'Music generation is currently not available. Only OpenAI, Google Gemini, and ElevenLabs are enabled.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Music generation is disabled - only OpenAI, Gemini, and ElevenLabs are enabled
    return new Response(
      JSON.stringify({ 
        error: 'Music generation is currently not available. The system only supports OpenAI, Google Gemini, and ElevenLabs. Please contact admin to enable additional AI tools.' 
      }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
