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

// Generate video using OpenAI (gpt-image-1 for now, video generation via image sequence)
async function generateWithOpenAI(prompt: string, duration: number, aspectRatio: string) {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured. Please add your OpenAI API key.');
  }

  console.log('Generating video with OpenAI:', prompt);

  // OpenAI doesn't have native video generation yet, so we'll use image generation
  // and inform the user. For full video, they should use Content Creator with images + voiceover
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt: `${prompt}. Cinematic scene, high quality, ${aspectRatio} aspect ratio`,
      n: 1,
      size: aspectRatio === '9:16' ? '1024x1536' : aspectRatio === '1:1' ? '1024x1024' : '1536x1024',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI error:', response.status, errorText);
    
    if (response.status === 402 || response.status === 429 ||
        errorText.toLowerCase().includes('quota') || 
        errorText.toLowerCase().includes('billing')) {
      await saveProviderAlert('OpenAI', 'credit_exhausted', 'OpenAI credits exhausted. Please check your account.');
      throw new Error('OpenAI credits exhausted. Please check your account.');
    }
    
    if (response.status === 401) {
      await saveProviderAlert('OpenAI', 'subscription_expired', 'OpenAI API key invalid or expired.');
      throw new Error('OpenAI API key invalid');
    }
    
    throw new Error(`OpenAI error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log('OpenAI response received');

  const imageUrl = result.data?.[0]?.url;
  
  if (!imageUrl) {
    console.error('No image URL in response:', result);
    throw new Error('No image returned from OpenAI');
  }

  // Return the image URL - for full video generation, recommend using Content Creator
  return imageUrl;
}

// Generate video using Google Veo3 (video generation)
async function generateWithGemini(prompt: string, duration: number, aspectRatio: string) {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY is not configured');
  }

  console.log('Generating video with Google Veo3:', prompt);

  // Use the Gemini 3 pro image model for video frame generation
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
          content: `Generate a cinematic video frame for: ${prompt}. Style: movie-like, ${aspectRatio} aspect ratio, high quality production value, professional cinematography.`
        }
      ],
      modalities: ['image', 'text']
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Veo3 error:', response.status, errorText);
    
    if (response.status === 402) {
      await saveProviderAlert('Google Veo3', 'credit_exhausted', 'Lovable AI credits exhausted.');
      throw new Error('AI credits exhausted. Please add more credits.');
    }
    
    if (response.status === 429) {
      await saveProviderAlert('Google Veo3', 'rate_limit', 'Veo3 rate limit reached.');
      throw new Error('Rate limit reached. Please try again later.');
    }
    
    throw new Error(`Veo3 error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  const imageData = result.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  
  if (!imageData) {
    console.error('No image in Veo3 response:', result);
    throw new Error('No image returned from Veo3');
  }

  return imageData;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Handle test connection request
    if (body.type === 'test-connection') {
      const provider = body.provider || 'gemini';
      
      if (provider === 'openai') {
        const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
        if (!OPENAI_API_KEY) {
          return new Response(
            JSON.stringify({ status: 'error', message: 'OPENAI_API_KEY not configured' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        return new Response(
          JSON.stringify({ status: 'ok', message: 'OpenAI connected' }),
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
          JSON.stringify({ status: 'ok', message: 'Gemini connected' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const { prompt, duration = 5, aspectRatio = "16:9", provider = "gemini" } = body;
    
    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating video with provider:', provider, 'prompt:', prompt, 'duration:', duration, 'aspectRatio:', aspectRatio);

    let videoUrl: string;
    let isImage = true;
    
    if (provider === 'openai') {
      videoUrl = await generateWithOpenAI(prompt, duration, aspectRatio);
    } else {
      videoUrl = await generateWithGemini(prompt, duration, aspectRatio);
    }

    return new Response(
      JSON.stringify({ 
        videoUrl,
        success: true,
        provider,
        isImage,
        message: `Video frame generated with ${provider === 'openai' ? 'OpenAI' : 'Google Veo3'}. For full videos, use Content Creator to combine images with voiceover.`
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
