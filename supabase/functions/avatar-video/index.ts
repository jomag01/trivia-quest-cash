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

    const { imageUrl, audioUrl, enhancer = 'gfpgan' } = await req.json();
    
    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: 'Image URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!audioUrl) {
      return new Response(
        JSON.stringify({ error: 'Audio URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Creating talking avatar video with SadTalker...');
    console.log('Image URL:', imageUrl.substring(0, 100) + '...');
    console.log('Audio URL:', audioUrl.substring(0, 100) + '...');

    // Use fal.ai's SadTalker model for talking head generation
    const submitResponse = await fetch('https://queue.fal.run/fal-ai/sadtalker', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_image_url: imageUrl,
        driven_audio_url: audioUrl,
        face_enhancer: enhancer, // 'gfpgan' for better quality
        still_mode: false, // Allow head movement
        preprocess: 'crop', // Crop to face
      }),
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      console.error('Fal.ai SadTalker error:', submitResponse.status, errorText);
      throw new Error(`Fal.ai error: ${submitResponse.status} - ${errorText}`);
    }

    const result = await submitResponse.json();
    console.log('Fal.ai SadTalker response:', JSON.stringify(result));

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
        message: 'Avatar video created successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to create avatar video';
    console.error('Avatar video error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
