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
        JSON.stringify({ status: 'ok', message: 'fal.ai connected' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const FAL_API_KEY = Deno.env.get('FAL_API_KEY');
    if (!FAL_API_KEY) {
      throw new Error('FAL_API_KEY is not configured');
    }

    const { prompt, duration = 5, aspectRatio = "16:9" } = body;
    
    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating video with prompt:', prompt, 'duration:', duration, 'aspectRatio:', aspectRatio);

    const submitResponse = await fetch('https://queue.fal.run/fal-ai/vidu/q1/text-to-video', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt,
        aspect_ratio: aspectRatio,
        duration: duration <= 4 ? "4s" : "8s",
      }),
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      console.error('Fal.ai submit error:', submitResponse.status, errorText);
      
      // Check for credit/quota issues
      if (errorText.toLowerCase().includes('credit') || 
          errorText.toLowerCase().includes('quota') || 
          errorText.toLowerCase().includes('billing') ||
          submitResponse.status === 402 ||
          submitResponse.status === 403) {
        await saveProviderAlert('fal.ai', 'credit_exhausted', 'fal.ai credits exhausted or billing issue. Video generation failed.');
        return new Response(
          JSON.stringify({ error: 'Video generation credits exhausted. Please check fal.ai account.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (submitResponse.status === 401) {
        await saveProviderAlert('fal.ai', 'subscription_expired', 'fal.ai API key invalid or expired.');
        return new Response(
          JSON.stringify({ error: 'fal.ai API key invalid' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Fal.ai error: ${submitResponse.status} - ${errorText}`);
    }

    const result = await submitResponse.json();
    console.log('Fal.ai response:', JSON.stringify(result));

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
