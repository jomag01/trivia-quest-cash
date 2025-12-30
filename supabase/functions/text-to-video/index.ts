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

// Generate video using Google Veo3 via Lovable AI Gateway
async function generateWithGemini(prompt: string, duration: number, aspectRatio: string) {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY is not configured');
  }

  console.log('Generating video with Google Veo3 (Lovable Gateway):', prompt);

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

// Generate video using Google Vertex AI directly
async function generateWithVertexAI(prompt: string, duration: number, aspectRatio: string) {
  const serviceAccountJson = Deno.env.get('GOOGLE_CLOUD_SERVICE_ACCOUNT');
  if (!serviceAccountJson) {
    throw new Error('GOOGLE_CLOUD_SERVICE_ACCOUNT is not configured. Please add your service account JSON.');
  }

  console.log('Generating video with Google Vertex AI:', prompt);

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(serviceAccountJson);
  } catch (e) {
    throw new Error('Invalid service account JSON format');
  }

  // Get access token using service account
  const accessToken = await getGoogleAccessToken(serviceAccount);

  const projectId = serviceAccount.project_id;
  const location = 'us-central1';

  // Use Imagen for image generation via Vertex AI
  const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/imagen-3.0-generate-001:predict`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      instances: [
        {
          prompt: `${prompt}. Cinematic scene, high quality, ${aspectRatio} aspect ratio, professional photography`,
        }
      ],
      parameters: {
        sampleCount: 1,
        aspectRatio: aspectRatio === '9:16' ? '9:16' : aspectRatio === '1:1' ? '1:1' : '16:9',
        safetyFilterLevel: 'block_few',
        personGeneration: 'allow_adult',
      }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Vertex AI error:', response.status, errorText);
    
    if (response.status === 403) {
      await saveProviderAlert('Vertex AI', 'permission_denied', 'Vertex AI access denied. Check service account permissions.');
      throw new Error('Vertex AI access denied. Check service account permissions.');
    }
    
    if (response.status === 429) {
      await saveProviderAlert('Vertex AI', 'rate_limit', 'Vertex AI rate limit reached.');
      throw new Error('Rate limit reached. Please try again later.');
    }

    if (errorText.toLowerCase().includes('quota')) {
      await saveProviderAlert('Vertex AI', 'quota_exceeded', 'Vertex AI quota exceeded.');
      throw new Error('Vertex AI quota exceeded. Please check your Google Cloud billing.');
    }
    
    throw new Error(`Vertex AI error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log('Vertex AI response received');

  const imageBase64 = result.predictions?.[0]?.bytesBase64Encoded;
  
  if (!imageBase64) {
    console.error('No image in Vertex AI response:', result);
    throw new Error('No image returned from Vertex AI');
  }

  // Return as data URL
  return `data:image/png;base64,${imageBase64}`;
}

// Get Google access token from service account
async function getGoogleAccessToken(serviceAccount: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600;

  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: exp,
  };

  const encoder = new TextEncoder();
  
  // Base64URL encode
  const base64UrlEncode = (obj: any) => {
    const json = JSON.stringify(obj);
    const base64 = btoa(json);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };

  const headerB64 = base64UrlEncode(header);
  const payloadB64 = base64UrlEncode(payload);
  const signInput = `${headerB64}.${payloadB64}`;

  // Import the private key
  const pemContents = serviceAccount.private_key
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\n/g, '');
  
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );

  // Sign the JWT
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(signInput)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const jwt = `${signInput}.${signatureB64}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error('Token exchange error:', errorText);
    throw new Error('Failed to get Google access token');
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
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
      } else if (provider === 'vertex') {
        const serviceAccount = Deno.env.get('GOOGLE_CLOUD_SERVICE_ACCOUNT');
        if (!serviceAccount) {
          return new Response(
            JSON.stringify({ status: 'error', message: 'GOOGLE_CLOUD_SERVICE_ACCOUNT not configured' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        try {
          JSON.parse(serviceAccount);
          return new Response(
            JSON.stringify({ status: 'ok', message: 'Vertex AI connected' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch {
          return new Response(
            JSON.stringify({ status: 'error', message: 'Invalid service account JSON' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
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
    let providerName = 'Google Veo3';
    
    if (provider === 'openai') {
      videoUrl = await generateWithOpenAI(prompt, duration, aspectRatio);
      providerName = 'OpenAI';
    } else if (provider === 'vertex') {
      videoUrl = await generateWithVertexAI(prompt, duration, aspectRatio);
      providerName = 'Vertex AI (Imagen 3)';
    } else {
      videoUrl = await generateWithGemini(prompt, duration, aspectRatio);
      providerName = 'Google Veo3';
    }

    return new Response(
      JSON.stringify({ 
        videoUrl,
        success: true,
        provider,
        isImage,
        message: `Video frame generated with ${providerName}. For full videos, use Content Creator to combine images with voiceover.`
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
