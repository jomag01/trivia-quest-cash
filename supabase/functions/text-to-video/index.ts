import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Save alert to database for admin notification
async function saveProviderAlert(provider: string, alertType: string, message: string) {
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: existing } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'ai_provider_alerts')
      .single();

    let alerts = [];
    if (existing?.value) {
      try {
        alerts = JSON.parse(existing.value);
      } catch (e) {
        alerts = [];
      }
    }

    const newAlert = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      provider,
      type: alertType,
      message,
      timestamp: new Date().toISOString(),
      dismissed: false
    };

    alerts = [newAlert, ...alerts.slice(0, 49)];

    await supabase
      .from('app_settings')
      .upsert({
        key: 'ai_provider_alerts',
        value: JSON.stringify(alerts)
      }, { onConflict: 'key' });

    console.log('Alert saved:', provider, alertType);
  } catch (error) {
    console.error('Failed to save alert:', error);
  }
}

// Poll for fal.ai result
async function pollFalResult(requestId: string, apiKey: string, maxAttempts = 60): Promise<any> {
  const statusUrl = `https://queue.fal.run/fal-ai/minimax-video/requests/${requestId}/status`;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    console.log(`Polling attempt ${attempt + 1}/${maxAttempts} for request ${requestId}`);
    
    const statusResponse = await fetch(statusUrl, {
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      console.error('Status check error:', statusResponse.status, errorText);
      throw new Error(`Failed to check status: ${statusResponse.status}`);
    }

    const statusData = await statusResponse.json();
    console.log('Status:', statusData.status);

    if (statusData.status === 'COMPLETED') {
      // Fetch the result
      const resultUrl = `https://queue.fal.run/fal-ai/minimax-video/requests/${requestId}`;
      const resultResponse = await fetch(resultUrl, {
        headers: {
          'Authorization': `Key ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!resultResponse.ok) {
        throw new Error('Failed to fetch result');
      }

      return await resultResponse.json();
    }

    if (statusData.status === 'FAILED') {
      throw new Error(statusData.error || 'Video generation failed');
    }

    // Wait 3 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  throw new Error('Video generation timed out. Please try again.');
}

// Generate video using fal.ai (actual video generation)
async function generateWithFalAI(prompt: string, duration: number, aspectRatio: string) {
  const FAL_API_KEY = Deno.env.get('FAL_API_KEY');
  if (!FAL_API_KEY) {
    throw new Error('FAL_API_KEY is not configured. Please add your fal.ai API key.');
  }

  console.log('Generating video with fal.ai:', prompt, 'duration:', duration, 'aspect:', aspectRatio);

  // Use minimax-video model for actual video generation
  const response = await fetch('https://queue.fal.run/fal-ai/minimax-video', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: prompt,
      prompt_optimizer: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('fal.ai error:', response.status, errorText);
    
    if (response.status === 402 || response.status === 401 ||
        errorText.toLowerCase().includes('credit') || 
        errorText.toLowerCase().includes('billing') ||
        errorText.toLowerCase().includes('insufficient')) {
      await saveProviderAlert('fal.ai', 'credit_exhausted', 'fal.ai credits exhausted. Please check your account.');
      throw new Error('fal.ai credits exhausted. Please top up your account at fal.ai');
    }
    
    if (response.status === 429) {
      await saveProviderAlert('fal.ai', 'rate_limit', 'fal.ai rate limit reached.');
      throw new Error('Rate limit reached. Please try again later.');
    }
    
    throw new Error(`fal.ai error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log('fal.ai queue response:', result);

  // Get the request ID for polling
  const requestId = result.request_id;
  if (!requestId) {
    throw new Error('No request ID returned from fal.ai');
  }

  // Poll for result
  const finalResult = await pollFalResult(requestId, FAL_API_KEY);
  console.log('fal.ai final result:', finalResult);

  const videoUrl = finalResult.video?.url;
  
  if (!videoUrl) {
    console.error('No video URL in response:', finalResult);
    throw new Error('No video returned from fal.ai');
  }

  return videoUrl;
}

// Alternative: Use Kling video model
async function generateWithKling(prompt: string, duration: number, aspectRatio: string) {
  const FAL_API_KEY = Deno.env.get('FAL_API_KEY');
  if (!FAL_API_KEY) {
    throw new Error('FAL_API_KEY is not configured');
  }

  console.log('Generating video with Kling:', prompt);

  const response = await fetch('https://queue.fal.run/fal-ai/kling-video/v1.5/pro/text-to-video', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: prompt,
      duration: duration === 10 ? "10" : "5",
      aspect_ratio: aspectRatio === '9:16' ? '9:16' : aspectRatio === '1:1' ? '1:1' : '16:9',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Kling error:', response.status, errorText);
    throw new Error(`Kling error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  const requestId = result.request_id;
  
  if (!requestId) {
    throw new Error('No request ID returned');
  }

  // Poll for Kling result
  const statusUrl = `https://queue.fal.run/fal-ai/kling-video/v1.5/pro/text-to-video/requests/${requestId}/status`;
  
  for (let attempt = 0; attempt < 120; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const statusResponse = await fetch(statusUrl, {
      headers: { 'Authorization': `Key ${FAL_API_KEY}` },
    });

    const statusData = await statusResponse.json();
    
    if (statusData.status === 'COMPLETED') {
      const resultUrl = `https://queue.fal.run/fal-ai/kling-video/v1.5/pro/text-to-video/requests/${requestId}`;
      const resultResponse = await fetch(resultUrl, {
        headers: { 'Authorization': `Key ${FAL_API_KEY}` },
      });
      const finalResult = await resultResponse.json();
      return finalResult.video?.url;
    }

    if (statusData.status === 'FAILED') {
      throw new Error('Kling video generation failed');
    }
  }

  throw new Error('Video generation timed out');
}

// Generate image using Lovable AI (fallback for image generation)
async function generateWithGemini(prompt: string, aspectRatio: string) {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY is not configured');
  }

  console.log('Generating image with Gemini (fallback):', prompt);

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-3-pro-image-preview',
      messages: [
        {
          role: 'user',
          content: `Generate a cinematic image for: ${prompt}. Style: movie-like, ${aspectRatio} aspect ratio, high quality.`
        }
      ],
      modalities: ['image', 'text']
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini error:', response.status, errorText);
    throw new Error(`Gemini error: ${response.status}`);
  }

  const result = await response.json();
  return result.choices?.[0]?.message?.images?.[0]?.image_url?.url;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Handle test connection request
    if (body.type === 'test-connection') {
      const provider = body.provider || 'fal';
      
      if (provider === 'fal') {
        const FAL_API_KEY = Deno.env.get('FAL_API_KEY');
        if (!FAL_API_KEY) {
          return new Response(
            JSON.stringify({ status: 'error', message: 'FAL_API_KEY not configured' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        return new Response(
          JSON.stringify({ status: 'ok', message: 'fal.ai connected - Ready for video generation' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
        if (!LOVABLE_API_KEY) {
          return new Response(
            JSON.stringify({ status: 'error', message: 'LOVABLE_API_KEY not configured' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        return new Response(
          JSON.stringify({ status: 'ok', message: 'Gemini connected (image only)' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const { prompt, duration = 5, aspectRatio = "16:9", provider = "fal" } = body;
    
    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating video with provider:', provider, 'prompt:', prompt, 'duration:', duration, 'aspectRatio:', aspectRatio);

    let videoUrl: string;
    let isVideo = false;
    let providerName = 'fal.ai';
    
    if (provider === 'fal' || provider === 'minimax') {
      videoUrl = await generateWithFalAI(prompt, duration, aspectRatio);
      providerName = 'fal.ai (MiniMax Video)';
      isVideo = true;
    } else if (provider === 'kling') {
      videoUrl = await generateWithKling(prompt, duration, aspectRatio);
      providerName = 'fal.ai (Kling)';
      isVideo = true;
    } else {
      // Fallback to image generation
      videoUrl = await generateWithGemini(prompt, aspectRatio);
      providerName = 'Gemini (Image)';
      isVideo = false;
    }

    return new Response(
      JSON.stringify({ 
        videoUrl,
        success: true,
        provider: providerName,
        isVideo,
        message: isVideo 
          ? `Video generated successfully with ${providerName}!` 
          : `Image generated with ${providerName}. For videos, use fal.ai provider.`
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
