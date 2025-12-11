import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      throw new Error(`Failed to check task status: ${response.status}`);
    }

    const result = await response.json();
    console.log(`Poll result:`, JSON.stringify(result));

    if (result.data?.status === 'SUCCESS' && result.data?.response?.sunoData?.length > 0) {
      return result.data.response.sunoData[0];
    } else if (result.data?.status === 'FAILED') {
      throw new Error('Music generation failed');
    }

    // Wait 3 seconds before next poll
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  throw new Error('Music generation timed out');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const KIE_API_KEY = Deno.env.get('KIE_API_KEY');
    if (!KIE_API_KEY) {
      throw new Error('KIE_API_KEY is not configured');
    }

    const { prompt, duration = 30, instrumental = false } = await req.json();
    
    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating music with Kie.ai - prompt:', prompt, 'instrumental:', instrumental);

    // Step 1: Submit generation request
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
        callBackUrl: 'https://placeholder-callback.example.com/webhook', // Required by API, we use polling instead
      }),
    });

    if (!generateResponse.ok) {
      const errorText = await generateResponse.text();
      console.error('Kie.ai generate error:', generateResponse.status, errorText);
      throw new Error(`Kie.ai error: ${generateResponse.status} - ${errorText}`);
    }

    const generateResult = await generateResponse.json();
    console.log('Generate response:', JSON.stringify(generateResult));

    if (generateResult.code !== 200 || !generateResult.data?.taskId) {
      throw new Error(generateResult.msg || 'Failed to start music generation');
    }

    const taskId = generateResult.data.taskId;
    console.log('Task ID:', taskId);

    // Step 2: Poll for result
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
