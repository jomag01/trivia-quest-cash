import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// AWS IVS Configuration
const AWS_REGION = Deno.env.get('AWS_REGION') || 'us-east-1';
const AWS_ACCESS_KEY_ID = Deno.env.get('AWS_ACCESS_KEY_ID');
const AWS_SECRET_ACCESS_KEY = Deno.env.get('AWS_SECRET_ACCESS_KEY');

// AWS Signature V4 helpers
async function sha256(message: string): Promise<ArrayBuffer> {
  const msgBuffer = new TextEncoder().encode(message);
  return await crypto.subtle.digest('SHA-256', msgBuffer);
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hmacSha256(key: ArrayBuffer, message: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
}

async function getSignatureKey(key: string, dateStamp: string, regionName: string, serviceName: string): Promise<ArrayBuffer> {
  const keyBuffer = new TextEncoder().encode('AWS4' + key);
  const kDate = await hmacSha256(keyBuffer.buffer as ArrayBuffer, dateStamp);
  const kRegion = await hmacSha256(kDate, regionName);
  const kService = await hmacSha256(kRegion, serviceName);
  const kSigning = await hmacSha256(kService, 'aws4_request');
  return kSigning;
}

async function signRequest(
  method: string,
  host: string,
  uri: string,
  queryString: string,
  headers: Record<string, string>,
  body: string,
  service: string
): Promise<Record<string, string>> {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  const canonicalHeaders = Object.entries(headers)
    .map(([k, v]) => `${k.toLowerCase()}:${v.trim()}`)
    .sort()
    .join('\n') + '\n';
  
  const signedHeaders = Object.keys(headers)
    .map(k => k.toLowerCase())
    .sort()
    .join(';');

  const payloadHash = toHex(await sha256(body));
  
  const canonicalRequest = [
    method,
    uri,
    queryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n');

  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${AWS_REGION}/${service}/aws4_request`;
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    toHex(await sha256(canonicalRequest))
  ].join('\n');

  const signingKey = await getSignatureKey(AWS_SECRET_ACCESS_KEY!, dateStamp, AWS_REGION, service);
  const signature = toHex(await hmacSha256(signingKey, stringToSign));

  const authorizationHeader = `${algorithm} Credential=${AWS_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    ...headers,
    'x-amz-date': amzDate,
    'Authorization': authorizationHeader
  };
}

async function ivsRequest(action: string, body: Record<string, any>) {
  const host = `ivs.${AWS_REGION}.amazonaws.com`;
  const uri = '/';
  const method = 'POST';
  const bodyStr = JSON.stringify(body);
  
  const headers: Record<string, string> = {
    'host': host,
    'content-type': 'application/json',
    'x-amz-target': `AmazonInteractiveVideoService.${action}`
  };

  const signedHeaders = await signRequest(method, host, uri, '', headers, bodyStr, 'ivs');

  const response = await fetch(`https://${host}${uri}`, {
    method,
    headers: signedHeaders,
    body: bodyStr
  });

  const responseText = await response.text();
  console.log(`[IVS] ${action} response:`, response.status, responseText.slice(0, 500));

  if (!response.ok) {
    throw new Error(`IVS API error: ${response.status} - ${responseText}`);
  }

  return JSON.parse(responseText);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
      throw new Error('AWS credentials not configured');
    }

    const { action, streamId, userId, channelArn, streamKey } = await req.json();
    console.log(`[IVS] Action: ${action}, streamId: ${streamId}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let result: any = {};

    switch (action) {
      case 'create-channel': {
        // Create IVS channel for the stream
        const channelName = `stream-${streamId}`;
        
        const channelData = await ivsRequest('CreateChannel', {
          name: channelName,
          type: 'STANDARD', // BASIC for lower latency, STANDARD for adaptive bitrate
          latencyMode: 'LOW', // LOW for <5s latency, NORMAL for higher quality
          authorized: false,
          insecureIngest: false,
          preset: '', // Use default
          tags: {
            streamId,
            userId
          }
        });

        console.log('[IVS] Channel created:', channelData);

        // Store channel info in database
        await supabase
          .from('live_streams')
          .update({
            stream_key: channelData.streamKey?.value || null,
            status: 'pending'
          })
          .eq('id', streamId);

        result = {
          channelArn: channelData.channel?.arn,
          ingestEndpoint: channelData.channel?.ingestEndpoint,
          playbackUrl: channelData.channel?.playbackUrl,
          streamKey: channelData.streamKey?.value,
          streamKeyArn: channelData.streamKey?.arn
        };
        break;
      }

      case 'get-stream': {
        // Get stream status
        const streamData = await ivsRequest('GetStream', {
          channelArn
        });

        result = {
          state: streamData.stream?.state,
          health: streamData.stream?.health,
          viewerCount: streamData.stream?.viewerCount,
          startTime: streamData.stream?.startTime
        };
        break;
      }

      case 'stop-stream': {
        // Stop the stream
        await ivsRequest('StopStream', {
          channelArn
        });

        result = { success: true };
        break;
      }

      case 'delete-channel': {
        // Delete IVS channel
        await ivsRequest('DeleteChannel', {
          arn: channelArn
        });

        result = { success: true };
        break;
      }

      case 'get-playback-key': {
        // For low-latency playback, get the WebSocket URL
        // Note: AWS IVS Real-Time requires additional setup
        
        // Get channel info for playback URL
        const channelInfo = await ivsRequest('GetChannel', {
          arn: channelArn
        });

        result = {
          playbackUrl: channelInfo.channel?.playbackUrl,
          latencyMode: channelInfo.channel?.latencyMode
        };
        break;
      }

      case 'create-stage': {
        // Create IVS Real-Time stage for ultra-low latency WebRTC
        const stageData = await ivsRequest('CreateStage', {
          name: `stage-${streamId}`,
          participantTokenConfigurations: [
            {
              userId,
              capabilities: ['PUBLISH', 'SUBSCRIBE'],
              duration: 60 * 60 * 4 // 4 hours
            }
          ],
          tags: {
            streamId,
            userId
          }
        });

        console.log('[IVS] Stage created:', stageData);

        result = {
          stageArn: stageData.stage?.arn,
          participantTokens: stageData.participantTokens
        };
        break;
      }

      case 'create-participant-token': {
        // Create token for a viewer to join the stage
        const tokenData = await ivsRequest('CreateParticipantToken', {
          stageArn: channelArn, // Using channelArn for stage ARN
          userId,
          capabilities: ['SUBSCRIBE'],
          duration: 60 * 60 * 2 // 2 hours
        });

        result = {
          token: tokenData.participantToken?.token,
          participantId: tokenData.participantToken?.participantId,
          expirationTime: tokenData.participantToken?.expirationTime
        };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[IVS] Error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
