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

// Helper: Convert ArrayBuffer to hex string
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Helper: SHA-256 hash
async function hash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  return bufferToHex(hashBuffer);
}

// Helper: HMAC-SHA256
async function hmac(key: ArrayBuffer, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: { name: 'SHA-256' } },
    false,
    ['sign']
  );
  const encoder = new TextEncoder();
  return await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data));
}

// Helper: Get signing key for AWS SigV4
async function getSigningKey(secretKey: string, dateStamp: string, region: string, service: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode('AWS4' + secretKey);
  const kDate = await hmac(keyData.buffer.slice(keyData.byteOffset, keyData.byteOffset + keyData.byteLength), dateStamp);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  const kSigning = await hmac(kService, 'aws4_request');
  return kSigning;
}

// AWS IVS API request with Signature V4
async function ivsApiRequest(
  operation: string, 
  path: string, 
  body: Record<string, unknown>,
  service: string = 'ivs'
): Promise<Record<string, unknown>> {
  const host = service === 'ivsrealtime' 
    ? `ivsrealtime.${AWS_REGION}.amazonaws.com`
    : `ivs.${AWS_REGION}.amazonaws.com`;
  
  const method = 'POST';
  const bodyStr = JSON.stringify(body);
  
  // Generate timestamps
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  
  // Hash the payload
  const payloadHash = await hash(bodyStr);
  
  // Prepare headers for signing
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'host': host,
    'x-amz-date': amzDate,
  };
  
  // Create canonical headers string (sorted by header name, lowercase)
  const sortedHeaders = Object.keys(headers).sort();
  const canonicalHeaders = sortedHeaders
    .map(key => `${key}:${headers[key]}\n`)
    .join('');
  const signedHeaders = sortedHeaders.join(';');
  
  // Create canonical request
  const canonicalRequest = [
    method,
    path,
    '', // Query string (empty for these requests)
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n');
  
  console.log(`[IVS API] Canonical Request for ${operation}:`, canonicalRequest.slice(0, 300));
  
  // Create string to sign
  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${AWS_REGION}/${service}/aws4_request`;
  const canonicalRequestHash = await hash(canonicalRequest);
  
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    canonicalRequestHash
  ].join('\n');
  
  // Calculate signature
  const signingKey = await getSigningKey(AWS_SECRET_ACCESS_KEY!, dateStamp, AWS_REGION, service);
  const signatureBuffer = await hmac(signingKey, stringToSign);
  const signature = bufferToHex(signatureBuffer);
  
  // Create authorization header
  const authorizationHeader = `${algorithm} Credential=${AWS_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  
  // Make the request
  const url = `https://${host}${path}`;
  console.log(`[IVS API] ${operation}: ${url}`);
  
  const response = await fetch(url, {
    method,
    headers: {
      ...headers,
      'Authorization': authorizationHeader,
    },
    body: bodyStr
  });
  
  const responseText = await response.text();
  console.log(`[IVS API] ${operation} response: ${response.status}`, responseText.slice(0, 500));
  
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
          const channelData = await ivsApiRequest('CreateChannel', '/CreateChannel', {
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

          console.log('[IVS] Channel created:', (channelData as Record<string, unknown>).channel);

          // Store channel info in database
          const channel = channelData.channel as Record<string, unknown>;
          const streamKey = channelData.streamKey as Record<string, unknown>;
          
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
          // Return fallback for WebRTC-only mode via Supabase Realtime
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
          
          const streamData = await ivsApiRequest('GetStream', '/GetStream', {
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
          
          await ivsApiRequest('StopStream', '/StopStream', {
            channelArn
          });
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
          
          await ivsApiRequest('DeleteChannel', '/DeleteChannel', {
            arn: channelArn
          });
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
          
          const channelInfo = await ivsApiRequest('GetChannel', '/GetChannel', {
            arn: channelArn
          });

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
          const stageData = await ivsApiRequest('CreateStage', '/CreateStage', {
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
          }, 'ivsrealtime');

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
          // Fall back to Supabase Realtime signaling (WebRTC peer-to-peer)
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
          
          const tokenData = await ivsApiRequest('CreateParticipantToken', '/CreateParticipantToken', {
            stageArn: targetStageArn,
            userId,
            capabilities: ['SUBSCRIBE'],
            duration: 7200
          }, 'ivsrealtime');

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
          
          await ivsApiRequest('DeleteStage', '/DeleteStage', {
            arn: stageArn
          }, 'ivsrealtime');
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

    console.log(`[IVS] Action ${action} completed`);
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