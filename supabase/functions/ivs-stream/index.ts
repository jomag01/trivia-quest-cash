import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Cache-Control': 'no-store',
};

// AWS Configuration
const AWS_REGION = Deno.env.get('AWS_REGION') || 'us-east-1';
const AWS_ACCESS_KEY_ID = Deno.env.get('AWS_ACCESS_KEY_ID');
const AWS_SECRET_ACCESS_KEY = Deno.env.get('AWS_SECRET_ACCESS_KEY');

console.log(`[IVS] Function initialized. Region: ${AWS_REGION}, Has credentials: ${!!AWS_ACCESS_KEY_ID && !!AWS_SECRET_ACCESS_KEY}`);

// ==================== AWS Signature V4 Implementation ====================

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function sha256(message: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  return await crypto.subtle.digest('SHA-256', encoder.encode(message));
}

async function sha256Hex(message: string): Promise<string> {
  return toHex(await sha256(message));
}

async function hmacSha256(keyData: ArrayBuffer, message: string): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const encoder = new TextEncoder();
  return await crypto.subtle.sign('HMAC', key, encoder.encode(message));
}

async function getSigningKey(
  secretKey: string,
  dateStamp: string,
  region: string,
  service: string
): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const kSecret = encoder.encode('AWS4' + secretKey);
  const kDate = await hmacSha256(kSecret.buffer.slice(kSecret.byteOffset, kSecret.byteOffset + kSecret.byteLength), dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, 'aws4_request');
  return kSigning;
}

async function signAWSRequest(
  method: string,
  url: string,
  body: string,
  service: string
): Promise<Headers> {
  const parsedUrl = new URL(url);
  const host = parsedUrl.host;
  const path = parsedUrl.pathname;
  
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  
  // Hash the payload
  const payloadHash = await sha256Hex(body);
  
  // Create the canonical request
  const signedHeadersList = ['content-type', 'host', 'x-amz-content-sha256', 'x-amz-date'];
  const signedHeaders = signedHeadersList.join(';');
  
  const canonicalHeaders = 
    `content-type:application/json\n` +
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  
  const canonicalRequest = 
    `${method}\n` +
    `${path}\n` +
    `\n` + // empty query string
    `${canonicalHeaders}\n` +
    `${signedHeaders}\n` +
    `${payloadHash}`;
  
  console.log(`[AWS Sign] Canonical Request:\n${canonicalRequest}`);
  
  // Create the string to sign
  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${AWS_REGION}/${service}/aws4_request`;
  const canonicalRequestHash = await sha256Hex(canonicalRequest);
  
  const stringToSign = 
    `${algorithm}\n` +
    `${amzDate}\n` +
    `${credentialScope}\n` +
    `${canonicalRequestHash}`;
  
  console.log(`[AWS Sign] String to Sign:\n${stringToSign}`);
  
  // Calculate the signature
  const signingKey = await getSigningKey(AWS_SECRET_ACCESS_KEY!, dateStamp, AWS_REGION, service);
  const signatureBuffer = await hmacSha256(signingKey, stringToSign);
  const signature = toHex(signatureBuffer);
  
  console.log(`[AWS Sign] Signature: ${signature}`);
  
  // Build the authorization header - CRITICAL: NO SPACES after commas or around equal signs!
  const credential = `${AWS_ACCESS_KEY_ID}/${credentialScope}`;
  const authHeader = `${algorithm} Credential=${credential},SignedHeaders=${signedHeaders},Signature=${signature}`;
  
  console.log(`[AWS Sign] Auth Header: ${authHeader.substring(0, 100)}...`);
  
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  headers.set('Host', host);
  headers.set('X-Amz-Date', amzDate);
  headers.set('X-Amz-Content-Sha256', payloadHash);
  headers.set('Authorization', authHeader);
  
  return headers;
}

// IVS Standard API (Channels, Streams)
async function ivsRequest(operation: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const url = `https://ivs.${AWS_REGION}.amazonaws.com/${operation}`;
  const payload = JSON.stringify(body);
  
  console.log(`[IVS] ${operation} request to ${url}`);
  
  const headers = await signAWSRequest('POST', url, payload, 'ivs');
  
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: payload,
  });
  
  const responseText = await response.text();
  console.log(`[IVS] ${operation} response: ${response.status} - ${responseText.substring(0, 500)}`);
  
  if (!response.ok) {
    throw new Error(`${operation} failed: ${response.status} - ${responseText}`);
  }
  
  return responseText ? JSON.parse(responseText) : {};
}

// IVS Real-Time API (Stages, Participants)
async function ivsRealtimeRequest(operation: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const url = `https://ivsrealtime.${AWS_REGION}.amazonaws.com/${operation}`;
  const payload = JSON.stringify(body);
  
  console.log(`[IVS RT] ${operation} request to ${url}`);
  
  const headers = await signAWSRequest('POST', url, payload, 'ivsrealtime');
  
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: payload,
  });
  
  const responseText = await response.text();
  console.log(`[IVS RT] ${operation} response: ${response.status} - ${responseText.substring(0, 500)}`);
  
  if (!response.ok) {
    throw new Error(`${operation} failed: ${response.status} - ${responseText}`);
  }
  
  return responseText ? JSON.parse(responseText) : {};
}

serve(async (req) => {
  console.log(`[IVS] Request: ${req.method} ${req.url}`);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check AWS credentials
    if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
      console.error('[IVS] AWS credentials not configured');
      return new Response(
        JSON.stringify({ 
          error: 'AWS credentials not configured',
          details: 'Please configure AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY secrets'
        }),
        { 
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    let requestBody: Record<string, unknown>;
    try {
      requestBody = await req.json();
    } catch {
      console.error('[IVS] Invalid JSON body');
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const action = requestBody.action as string;
    const streamId = requestBody.streamId as string;
    const userId = requestBody.userId as string;
    const channelArn = requestBody.channelArn as string;
    const stageArn = requestBody.stageArn as string;
    
    console.log(`[IVS] Action: ${action}, streamId: ${streamId}, userId: ${userId}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let result: Record<string, unknown> = {};

    switch (action) {
      case 'create-channel': {
        const channelName = `stream-${streamId}-${Date.now()}`;
        
        try {
          const channelData = await ivsRequest('CreateChannel', {
            name: channelName,
            type: 'STANDARD',
            latencyMode: 'LOW',
            authorized: false,
            insecureIngest: false,
            tags: {
              streamId: streamId,
              userId: userId
            }
          });

          console.log('[IVS] Channel created successfully');

          const channel = channelData.channel as Record<string, unknown>;
          const streamKey = channelData.streamKey as Record<string, unknown>;
          
          // Update database with stream info
          await supabase
            .from('live_streams')
            .update({
              stream_key: streamKey?.value || null,
              status: 'pending'
            })
            .eq('id', streamId);

          result = {
            channelArn: channel?.arn,
            ingestEndpoint: channel?.ingestEndpoint,
            playbackUrl: channel?.playbackUrl,
            streamKey: streamKey?.value,
            streamKeyArn: streamKey?.arn,
            success: true
          };
        } catch (err) {
          const error = err as Error;
          console.error('[IVS] Channel creation failed:', error.message);
          result = {
            channelArn: null,
            ingestEndpoint: null,
            playbackUrl: null,
            streamKey: null,
            useWebRTCFallback: true,
            error: error.message
          };
        }
        break;
      }

      case 'get-stream': {
        try {
          if (!channelArn) {
            throw new Error('channelArn is required');
          }
          
          const streamData = await ivsRequest('GetStream', {
            channelArn
          });

          const stream = streamData.stream as Record<string, unknown>;
          result = {
            state: stream?.state,
            health: stream?.health,
            viewerCount: stream?.viewerCount,
            startTime: stream?.startTime
          };
        } catch (err) {
          const error = err as Error;
          console.warn('[IVS] Get stream failed:', error.message);
          result = {
            state: 'unknown',
            health: 'unknown',
            viewerCount: 0,
            error: error.message
          };
        }
        break;
      }

      case 'stop-stream': {
        try {
          if (!channelArn) {
            throw new Error('channelArn is required');
          }
          
          await ivsRequest('StopStream', { channelArn });
          result = { success: true };
        } catch (err) {
          const error = err as Error;
          console.warn('[IVS] Stop stream failed:', error.message);
          result = { success: false, error: error.message };
        }
        break;
      }

      case 'delete-channel': {
        try {
          if (!channelArn) {
            throw new Error('channelArn is required');
          }
          
          await ivsRequest('DeleteChannel', { arn: channelArn });
          result = { success: true };
        } catch (err) {
          const error = err as Error;
          console.warn('[IVS] Delete channel failed:', error.message);
          result = { success: false, error: error.message };
        }
        break;
      }

      case 'get-channel': {
        try {
          if (!channelArn) {
            throw new Error('channelArn is required');
          }
          
          const channelInfo = await ivsRequest('GetChannel', { arn: channelArn });

          const channel = channelInfo.channel as Record<string, unknown>;
          result = {
            playbackUrl: channel?.playbackUrl,
            latencyMode: channel?.latencyMode,
            ingestEndpoint: channel?.ingestEndpoint
          };
        } catch (err) {
          const error = err as Error;
          console.warn('[IVS] Get channel failed:', error.message);
          result = { error: error.message };
        }
        break;
      }

      case 'create-stage': {
        try {
          const stageData = await ivsRealtimeRequest('CreateStage', {
            name: `stage-${streamId}-${Date.now()}`,
            participantTokenConfigurations: [
              {
                userId,
                capabilities: ['PUBLISH', 'SUBSCRIBE'],
                duration: 14400
              }
            ],
            tags: {
              streamId,
              userId
            }
          });

          const stage = stageData.stage as Record<string, unknown>;
          console.log('[IVS] Stage created:', stage?.arn);

          result = {
            stageArn: stage?.arn,
            participantTokens: stageData.participantTokens,
            success: true
          };
        } catch (err) {
          const error = err as Error;
          console.error('[IVS] Stage creation failed:', error.message);
          result = {
            stageArn: null,
            participantTokens: [],
            useSignalingFallback: true,
            error: error.message
          };
        }
        break;
      }

      case 'create-participant-token': {
        try {
          const targetStageArn = stageArn || channelArn;
          if (!targetStageArn) {
            throw new Error('stageArn is required');
          }
          
          const tokenData = await ivsRealtimeRequest('CreateParticipantToken', {
            stageArn: targetStageArn,
            userId,
            capabilities: ['SUBSCRIBE'],
            duration: 7200
          });

          const token = tokenData.participantToken as Record<string, unknown>;
          result = {
            token: token?.token,
            participantId: token?.participantId,
            expirationTime: token?.expirationTime
          };
        } catch (err) {
          const error = err as Error;
          console.error('[IVS] Create participant token failed:', error.message);
          result = {
            token: null,
            useSignalingFallback: true,
            error: error.message
          };
        }
        break;
      }

      case 'delete-stage': {
        try {
          if (!stageArn) {
            throw new Error('stageArn is required');
          }
          
          await ivsRealtimeRequest('DeleteStage', { arn: stageArn });
          result = { success: true };
        } catch (err) {
          const error = err as Error;
          console.warn('[IVS] Delete stage failed:', error.message);
          result = { success: false, error: error.message };
        }
        break;
      }

      case 'health-check': {
        result = { 
          status: 'healthy',
          region: AWS_REGION,
          hasCredentials: !!AWS_ACCESS_KEY_ID && !!AWS_SECRET_ACCESS_KEY,
          timestamp: new Date().toISOString()
        };
        break;
      }

      default:
        console.error(`[IVS] Unknown action: ${action}`);
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
    }

    console.log(`[IVS] Action ${action} completed successfully`);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    const error = err as Error;
    console.error('[IVS] Unhandled error:', error.message, error.stack);
    return new Response(
      JSON.stringify({ 
        error: error?.message || 'Unknown error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
