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

async function pollForResult(taskId: string, apiKey: string, maxAttempts = 60): Promise<any> {
  for (let i = 0; i < maxAttempts; i++) {
    console.log(`Polling attempt ${i + 1} for task ${taskId}`);
    
    const response = await fetch(`https://api.kie.ai/api/v1/generate/record-info?taskId=${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Poll error:', response.status, errorText);
      
      // Check for credit issues
      if (response.status === 402 || response.status === 403 || 
          errorText.toLowerCase().includes('credit') || 
          errorText.toLowerCase().includes('quota')) {
        await saveProviderAlert('Kie.ai', 'credit_exhausted', 'Kie.ai credits exhausted. Music generation failed.');
        throw new Error('Music generation credits exhausted');
      }
      
      throw new Error(`Failed to check task status: ${response.status}`);
    }

    const result = await response.json();
    console.log(`Poll result:`, JSON.stringify(result));

    if (result.data?.status === 'SUCCESS' && result.data?.response?.sunoData?.length > 0) {
      return result.data.response.sunoData[0];
    } else if (result.data?.status === 'FAILED') {
      throw new Error('Music generation failed');
    }

    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  throw new Error('Music generation timed out');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Handle test connection request
    if (body.type === 'test-connection') {
      const KIE_API_KEY = Deno.env.get('KIE_API_KEY');
      if (!KIE_API_KEY) {
        return new Response(
          JSON.stringify({ status: 'error', message: 'KIE_API_KEY not configured' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ status: 'ok', message: 'Kie.ai connected' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const KIE_API_KEY = Deno.env.get('KIE_API_KEY');
    if (!KIE_API_KEY) {
      throw new Error('KIE_API_KEY is not configured');
    }

    const { prompt, duration = 30, instrumental = false } = body;
    
    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating music with Kie.ai - prompt:', prompt, 'instrumental:', instrumental);

    const generateResponse = await fetch('https://api.kie.ai/api/v1/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KIE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt,
        customMode: false,
        instrumental: instrumental,
        model: 'V4',
        callBackUrl: 'https://placeholder-callback.example.com/webhook',
      }),
    });

    if (!generateResponse.ok) {
      const errorText = await generateResponse.text();
      console.error('Kie.ai generate error:', generateResponse.status, errorText);
      
      // Check for credit/quota issues
      if (generateResponse.status === 402 || generateResponse.status === 403 ||
          errorText.toLowerCase().includes('credit') || 
          errorText.toLowerCase().includes('quota') ||
          errorText.toLowerCase().includes('billing')) {
        await saveProviderAlert('Kie.ai', 'credit_exhausted', 'Kie.ai credits exhausted or billing issue. Music generation failed.');
        return new Response(
          JSON.stringify({ error: 'Music generation credits exhausted. Please check Kie.ai account.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (generateResponse.status === 401) {
        await saveProviderAlert('Kie.ai', 'subscription_expired', 'Kie.ai API key invalid or expired.');
        return new Response(
          JSON.stringify({ error: 'Kie.ai API key invalid' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Kie.ai error: ${generateResponse.status} - ${errorText}`);
    }

    const generateResult = await generateResponse.json();
    console.log('Generate response:', JSON.stringify(generateResult));

    if (generateResult.code !== 200 || !generateResult.data?.taskId) {
      throw new Error(generateResult.msg || 'Failed to start music generation');
    }

    const taskId = generateResult.data.taskId;
    console.log('Task ID:', taskId);

    const musicData = await pollForResult(taskId, KIE_API_KEY);

    return new Response(
      JSON.stringify({ 
        audioUrl: musicData.audioUrl || musicData.streamAudioUrl,
        title: musicData.title || 'AI Generated Music',
        imageUrl: musicData.imageUrl,
        duration: musicData.duration,
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
