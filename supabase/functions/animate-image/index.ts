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

// Image-to-Video using Kling
async function animateWithKling(imageUrl: string, prompt: string, duration: number) {
  const FAL_API_KEY = Deno.env.get('FAL_API_KEY');
  if (!FAL_API_KEY) {
    throw new Error('FAL_API_KEY is not configured');
  }

  console.log('Animating image with Kling:', prompt);

  const response = await fetch('https://queue.fal.run/fal-ai/kling-video/v1.5/pro/image-to-video', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: prompt || 'Subtle natural movement, cinematic animation',
      image_url: imageUrl,
      duration: duration >= 10 ? "10" : "5",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Kling image-to-video error:', response.status, errorText);
    
    if (response.status === 402 || errorText.toLowerCase().includes('credit')) {
      await saveProviderAlert('Kling (fal.ai)', 'credit_exhausted', 'Kling credits exhausted.');
      throw new Error('Kling credits exhausted. Please top up your fal.ai account.');
    }
    
    throw new Error(`Kling animation error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  const requestId = result.request_id;
  
  if (!requestId) {
    throw new Error('No request ID returned');
  }

  // Poll for result
  const statusUrl = `https://queue.fal.run/fal-ai/kling-video/v1.5/pro/image-to-video/requests/${requestId}/status`;
  
  for (let attempt = 0; attempt < 120; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const statusResponse = await fetch(statusUrl, {
      headers: { 'Authorization': `Key ${FAL_API_KEY}` },
    });

    const statusData = await statusResponse.json();
    console.log('Kling animation status:', statusData.status, `(attempt ${attempt + 1}/120)`);
    
    if (statusData.status === 'COMPLETED') {
      const resultUrl = `https://queue.fal.run/fal-ai/kling-video/v1.5/pro/image-to-video/requests/${requestId}`;
      const resultResponse = await fetch(resultUrl, {
        headers: { 'Authorization': `Key ${FAL_API_KEY}` },
      });
      const finalResult = await resultResponse.json();
      return finalResult.video?.url;
    }

    if (statusData.status === 'FAILED') {
      throw new Error('Kling animation failed');
    }
  }

  throw new Error('Animation timed out');
}

// Image-to-Video using MiniMax/Hailuo
async function animateWithMinimax(imageUrl: string, prompt: string) {
  const FAL_API_KEY = Deno.env.get('FAL_API_KEY');
  if (!FAL_API_KEY) {
    throw new Error('FAL_API_KEY is not configured');
  }

  console.log('Animating image with MiniMax/Hailuo:', prompt);

  const response = await fetch('https://queue.fal.run/fal-ai/minimax-video/image-to-video', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: prompt || 'Subtle natural movement, cinematic animation',
      image_url: imageUrl,
      prompt_optimizer: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('MiniMax image-to-video error:', response.status, errorText);
    
    if (response.status === 402 || errorText.toLowerCase().includes('credit')) {
      await saveProviderAlert('fal.ai', 'credit_exhausted', 'fal.ai credits exhausted.');
      throw new Error('fal.ai credits exhausted. Please top up your account.');
    }
    
    throw new Error(`MiniMax animation error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  const requestId = result.request_id;
  
  if (!requestId) {
    throw new Error('No request ID returned');
  }

  // Poll for result
  const statusUrl = `https://queue.fal.run/fal-ai/minimax-video/image-to-video/requests/${requestId}/status`;
  
  for (let attempt = 0; attempt < 120; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const statusResponse = await fetch(statusUrl, {
      headers: { 'Authorization': `Key ${FAL_API_KEY}` },
    });

    const statusData = await statusResponse.json();
    console.log('MiniMax animation status:', statusData.status, `(attempt ${attempt + 1}/120)`);
    
    if (statusData.status === 'COMPLETED') {
      const resultUrl = `https://queue.fal.run/fal-ai/minimax-video/image-to-video/requests/${requestId}`;
      const resultResponse = await fetch(resultUrl, {
        headers: { 'Authorization': `Key ${FAL_API_KEY}` },
      });
      const finalResult = await resultResponse.json();
      return finalResult.video?.url;
    }

    if (statusData.status === 'FAILED') {
      throw new Error('MiniMax animation failed');
    }
  }

  throw new Error('Animation timed out');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Handle test connection request
    if (body.type === 'test-connection') {
      const FAL_API_KEY = Deno.env.get('FAL_API_KEY');
      if (!FAL_API_KEY) {
        return new Response(
          JSON.stringify({ status: 'error', message: 'FAL_API_KEY not configured' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ status: 'ok', message: 'fal.ai connected - Image animation ready (MiniMax & Kling)' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { imageUrl, duration = 5, prompt = '', provider = 'minimax' } = body;

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: 'Image URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Image animation request:', { provider, duration, hasPrompt: !!prompt });

    let videoUrl: string;
    let providerName: string;

    if (provider === 'kling') {
      videoUrl = await animateWithKling(imageUrl, prompt, duration);
      providerName = 'Kling (Image Animator)';
    } else {
      videoUrl = await animateWithMinimax(imageUrl, prompt);
      providerName = 'MiniMax (Image Animator)';
    }

    if (!videoUrl) {
      throw new Error('No video returned from animation');
    }

    return new Response(
      JSON.stringify({ 
        videoUrl,
        success: true,
        provider: providerName,
        message: `Image animated successfully with ${providerName}!`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
