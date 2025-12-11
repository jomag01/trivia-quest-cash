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

    const { prompt, duration = 5 } = await req.json();
    
    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating video with prompt:', prompt, 'duration:', duration);

    // Submit video generation request to fal.ai using Vidu text-to-video model
    const submitResponse = await fetch('https://queue.fal.run/fal-ai/vidu/q1/text-to-video', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt,
        aspect_ratio: "16:9",
        duration: duration <= 4 ? "4s" : "8s",
      }),
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      console.error('Fal.ai submit error:', submitResponse.status, errorText);
      throw new Error(`Fal.ai error: ${submitResponse.status} - ${errorText}`);
    }

    const result = await submitResponse.json();
    console.log('Fal.ai response:', JSON.stringify(result));

    // Extract video URL from response
    const videoUrl = result.video?.url || result.output?.video?.url || result.video_url;
    
    if (!videoUrl) {
      console.error('No video URL in response:', result);
      throw new Error('No video URL returned from fal.ai');
    }

    return new Response(
      JSON.stringify({ 
        videoUrl,
        success: true,
        message: 'Video generated successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate video';
    console.error('Text-to-video error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
