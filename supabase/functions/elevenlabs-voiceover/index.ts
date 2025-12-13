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

// ElevenLabs voice options
const VOICES = {
  'Rachel': '21m00Tcm4TlvDq8ikWAM',
  'Drew': '29vD33N1CtxCmqQRPOHJ',
  'Clyde': '2EiwWnXFnvU5JabPnv8n',
  'Paul': '5Q0t7uMcjvnagumLfvZi',
  'Domi': 'AZnzlk1XvdvUeBnXmlld',
  'Dave': 'CYw3kZ02Hs0563khs1Fj',
  'Fin': 'D38z5RcWu1voky8WS1ja',
  'Sarah': 'EXAVITQu4vr4xnSDxMaL',
  'Antoni': 'ErXwobaYiN019PkySvjV',
  'Thomas': 'GBv7mTt0atIp3Br8iCZE',
  'Charlie': 'IKne3meq5aSn9XLyUdCD',
  'George': 'JBFqnCBsd6RMkjVDRZzb',
  'Emily': 'LcfcDJNUP1GQjkzn1xUU',
  'Elli': 'MF3mGyEYCl7XYWbV9V6O',
  'Callum': 'N2lVS1w4EtoT3dr4eOWO',
  'Patrick': 'ODq5zmih8GrVes37Dizd',
  'Harry': 'SOYHLrjzK2X1ezoPC6cr',
  'Liam': 'TX3LPaxmHKxFdv7VOQHJ',
  'Dorothy': 'ThT5KcBeYPX3keUQqHPh',
  'Josh': 'TxGEqnHWrfWFTfGW9XjX',
  'Arnold': 'VR6AewLTigWG4xSOukaG',
  'Charlotte': 'XB0fDUnXU5powFXDhCwa',
  'Alice': 'Xb7hH8MSUJpSbSDYk0k2',
  'Matilda': 'XrExE9yKIg1WjnnlVkGX',
  'James': 'ZQe5CZNOzWyzPSCn5a3c',
  'Joseph': 'Zlb1dXrM653N07WRdFW3',
  'Lily': 'pFZP5JQG7iQjIQuC4Bku',
  'Serena': 'pMsXgVXv3BLzUgSXRplE',
  'Adam': 'pNInz6obpgDQGcFmaJgB',
  'Nicole': 'piTKgcLEGmPE4e6mEKli',
  'Bill': 'pqHfZKP75CvOlQylNhV4',
  'Jessie': 't0jbNlBVZ17f02VDIeMI',
  'Michael': 'flq6f7yk4E4fJM5XTYuZ',
  'Grace': 'oWAxZDx7w5VEj9dCyTzz',
  'Daniel': 'onwK4e9ZLuTAKqWW03F9',
};

const LANGUAGES = [
  'en', 'es', 'fr', 'de', 'it', 'pt', 'pl', 'hi', 'ar', 'zh',
  'ja', 'ko', 'nl', 'ru', 'sv', 'tr', 'id', 'fil', 'ms', 'ro',
  'uk', 'el', 'cs', 'da', 'fi', 'bg', 'hr', 'sk', 'ta'
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ElevenLabs API key not configured');
    }

    const body = await req.json();
    
    // Handle test connection request
    if (body.type === 'test-connection') {
      return new Response(JSON.stringify({ status: 'ok', message: 'ElevenLabs connected' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, text, voiceId, voiceName, language, modelId } = body;

    if (action === 'list-voices') {
      return new Response(JSON.stringify({ 
        voices: Object.entries(VOICES).map(([name, id]) => ({ name, id })),
        languages: LANGUAGES 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'generate') {
      if (!text) {
        throw new Error('Text is required for voice generation');
      }

      const selectedVoiceId = voiceId || VOICES[voiceName as keyof typeof VOICES] || VOICES['Sarah'];
      const selectedModel = modelId || 'eleven_multilingual_v2';

      console.log('Generating voice-over:', { textLength: text.length, voiceId: selectedVoiceId, language });

      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: selectedModel,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.5,
            use_speaker_boost: true,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('ElevenLabs API error:', response.status, errorText);
        
        if (response.status === 401) {
          await saveProviderAlert('ElevenLabs', 'subscription_expired', 'ElevenLabs API key invalid or expired.');
          throw new Error('Invalid ElevenLabs API key');
        }
        if (response.status === 429 || errorText.toLowerCase().includes('character') || errorText.toLowerCase().includes('quota')) {
          await saveProviderAlert('ElevenLabs', 'credit_exhausted', 'ElevenLabs character quota exhausted. Voice generation failed.');
          throw new Error('ElevenLabs character quota exceeded. Please add more credits.');
        }
        throw new Error(`Voice generation failed: ${errorText}`);
      }

      // Get the audio as a buffer
      const audioBuffer = await response.arrayBuffer();
      const base64Audio = base64Encode(audioBuffer);

      // Estimate duration (rough: ~150 words per minute, ~5 chars per word)
      const estimatedDuration = Math.ceil((text.length / 5) / 150 * 60);
      return new Response(JSON.stringify({ 
        audioBase64: base64Audio,
        contentType: 'audio/mpeg',
        estimatedDuration,
        textLength: text.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error: unknown) {
    console.error('ElevenLabs error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
