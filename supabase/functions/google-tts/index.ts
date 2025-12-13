import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
      try { alerts = JSON.parse(existing.value); } catch (e) { alerts = []; }
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
      .upsert({ key: 'ai_provider_alerts', value: JSON.stringify(alerts) }, { onConflict: 'key' });
  } catch (error) {
    console.error('Failed to save alert:', error);
  }
}

// Google Cloud TTS voice options - organized by language
const VOICES = {
  'en-US': [
    { name: 'en-US-Neural2-A', gender: 'MALE' },
    { name: 'en-US-Neural2-C', gender: 'FEMALE' },
    { name: 'en-US-Neural2-D', gender: 'MALE' },
    { name: 'en-US-Neural2-E', gender: 'FEMALE' },
    { name: 'en-US-Neural2-F', gender: 'FEMALE' },
    { name: 'en-US-Neural2-G', gender: 'FEMALE' },
    { name: 'en-US-Neural2-H', gender: 'FEMALE' },
    { name: 'en-US-Neural2-I', gender: 'MALE' },
    { name: 'en-US-Neural2-J', gender: 'MALE' },
  ],
  'es-ES': [
    { name: 'es-ES-Neural2-A', gender: 'FEMALE' },
    { name: 'es-ES-Neural2-B', gender: 'MALE' },
    { name: 'es-ES-Neural2-C', gender: 'FEMALE' },
    { name: 'es-ES-Neural2-D', gender: 'FEMALE' },
    { name: 'es-ES-Neural2-E', gender: 'FEMALE' },
    { name: 'es-ES-Neural2-F', gender: 'MALE' },
  ],
  'fr-FR': [
    { name: 'fr-FR-Neural2-A', gender: 'FEMALE' },
    { name: 'fr-FR-Neural2-B', gender: 'MALE' },
    { name: 'fr-FR-Neural2-C', gender: 'FEMALE' },
    { name: 'fr-FR-Neural2-D', gender: 'MALE' },
    { name: 'fr-FR-Neural2-E', gender: 'FEMALE' },
  ],
  'de-DE': [
    { name: 'de-DE-Neural2-A', gender: 'FEMALE' },
    { name: 'de-DE-Neural2-B', gender: 'MALE' },
    { name: 'de-DE-Neural2-C', gender: 'FEMALE' },
    { name: 'de-DE-Neural2-D', gender: 'MALE' },
    { name: 'de-DE-Neural2-F', gender: 'FEMALE' },
  ],
  'it-IT': [
    { name: 'it-IT-Neural2-A', gender: 'FEMALE' },
    { name: 'it-IT-Neural2-B', gender: 'FEMALE' },
    { name: 'it-IT-Neural2-C', gender: 'MALE' },
  ],
  'pt-BR': [
    { name: 'pt-BR-Neural2-A', gender: 'FEMALE' },
    { name: 'pt-BR-Neural2-B', gender: 'MALE' },
    { name: 'pt-BR-Neural2-C', gender: 'FEMALE' },
  ],
  'ja-JP': [
    { name: 'ja-JP-Neural2-B', gender: 'FEMALE' },
    { name: 'ja-JP-Neural2-C', gender: 'MALE' },
    { name: 'ja-JP-Neural2-D', gender: 'MALE' },
  ],
  'ko-KR': [
    { name: 'ko-KR-Neural2-A', gender: 'FEMALE' },
    { name: 'ko-KR-Neural2-B', gender: 'FEMALE' },
    { name: 'ko-KR-Neural2-C', gender: 'MALE' },
  ],
  'zh-CN': [
    { name: 'cmn-CN-Standard-A', gender: 'FEMALE' },
    { name: 'cmn-CN-Standard-B', gender: 'MALE' },
    { name: 'cmn-CN-Standard-C', gender: 'MALE' },
    { name: 'cmn-CN-Standard-D', gender: 'FEMALE' },
  ],
  'hi-IN': [
    { name: 'hi-IN-Neural2-A', gender: 'FEMALE' },
    { name: 'hi-IN-Neural2-B', gender: 'MALE' },
    { name: 'hi-IN-Neural2-C', gender: 'MALE' },
    { name: 'hi-IN-Neural2-D', gender: 'FEMALE' },
  ],
  'ar-XA': [
    { name: 'ar-XA-Standard-A', gender: 'FEMALE' },
    { name: 'ar-XA-Standard-B', gender: 'MALE' },
    { name: 'ar-XA-Standard-C', gender: 'MALE' },
    { name: 'ar-XA-Standard-D', gender: 'FEMALE' },
  ],
  'fil-PH': [
    { name: 'fil-PH-Standard-A', gender: 'FEMALE' },
    { name: 'fil-PH-Standard-B', gender: 'FEMALE' },
    { name: 'fil-PH-Standard-C', gender: 'MALE' },
    { name: 'fil-PH-Standard-D', gender: 'MALE' },
  ],
  'sv-SE': [
    { name: 'sv-SE-Standard-A', gender: 'FEMALE' },
    { name: 'sv-SE-Standard-B', gender: 'FEMALE' },
    { name: 'sv-SE-Standard-C', gender: 'FEMALE' },
    { name: 'sv-SE-Standard-D', gender: 'MALE' },
    { name: 'sv-SE-Standard-E', gender: 'MALE' },
  ],
};

const LANGUAGE_MAP: Record<string, string> = {
  'en': 'en-US',
  'es': 'es-ES',
  'fr': 'fr-FR',
  'de': 'de-DE',
  'it': 'it-IT',
  'pt': 'pt-BR',
  'ja': 'ja-JP',
  'ko': 'ko-KR',
  'zh': 'zh-CN',
  'hi': 'hi-IN',
  'ar': 'ar-XA',
  'fil': 'fil-PH',
  'sv': 'sv-SE',
  'tl': 'fil-PH',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOOGLE_CLOUD_API_KEY = Deno.env.get('GOOGLE_CLOUD_API_KEY');
    
    if (!GOOGLE_CLOUD_API_KEY) {
      throw new Error('Google Cloud API key not configured');
    }

    const body = await req.json();
    
    // Handle test connection request
    if (body.type === 'test-connection') {
      return new Response(JSON.stringify({ status: 'ok', message: 'Google Cloud connected' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, text, language, gender, voiceName } = body;

    if (action === 'list-voices') {
      // Return available voices organized by language
      const voiceList = Object.entries(VOICES).flatMap(([langCode, voices]) => 
        voices.map(v => ({
          name: v.name,
          gender: v.gender,
          languageCode: langCode,
          displayName: `${v.name} (${v.gender})`
        }))
      );
      
      return new Response(JSON.stringify({ 
        voices: voiceList,
        languages: Object.keys(VOICES)
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'generate') {
      if (!text) {
        throw new Error('Text is required for voice generation');
      }

      // Determine language code
      let languageCode = language || 'en';
      if (languageCode.length === 2) {
        languageCode = LANGUAGE_MAP[languageCode] || 'en-US';
      }

      // Get available voices for this language
      const availableVoices = VOICES[languageCode as keyof typeof VOICES] || VOICES['en-US'];
      
      // Select voice based on preference
      let selectedVoice = availableVoices[0].name;
      
      if (voiceName && availableVoices.some(v => v.name === voiceName)) {
        selectedVoice = voiceName;
      } else if (gender) {
        const genderVoice = availableVoices.find(v => 
          v.gender === gender.toUpperCase()
        );
        if (genderVoice) {
          selectedVoice = genderVoice.name;
        }
      }

      console.log('Generating TTS:', { 
        textLength: text.length, 
        language: languageCode, 
        voice: selectedVoice 
      });

      // Call Google Cloud Text-to-Speech API
      const response = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_CLOUD_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: { text },
            voice: {
              languageCode: languageCode,
              name: selectedVoice,
            },
            audioConfig: {
              audioEncoding: 'MP3',
              speakingRate: 1.0,
              pitch: 0.0,
              volumeGainDb: 0.0,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Google TTS API error:', response.status, errorText);
        
        if (response.status === 401 || response.status === 403) {
          throw new Error('Invalid Google Cloud API key or API not enabled');
        }
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        throw new Error(`Voice generation failed: ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.audioContent) {
        throw new Error('No audio content returned from Google TTS');
      }

      // Estimate duration (rough: ~150 words per minute, ~5 chars per word)
      const estimatedDuration = Math.ceil((text.length / 5) / 150 * 60);

      return new Response(JSON.stringify({ 
        audioBase64: data.audioContent,
        contentType: 'audio/mpeg',
        estimatedDuration,
        textLength: text.length,
        voiceUsed: selectedVoice,
        languageCode
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error: unknown) {
    console.error('Google TTS error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
