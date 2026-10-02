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
  
  const headers = await signAWSRequest('POST', url, payload, 'ivs');
  
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


// ==================== IVS Real-Time self-signed participant tokens ====================
const b64url = (buf: ArrayBuffer | Uint8Array | string) => {
  const bytes = typeof buf === 'string' ? new TextEncoder().encode(buf) : new Uint8Array(buf as ArrayBuffer);
  let s = ''; bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
let cachedKey: { arn: string; key: CryptoKey } | null = null;

// deno-lint-ignore no-explicit-any
async function getStageSigningKey(supabase: any): Promise<{ arn: string; key: CryptoKey }> {
  if (cachedKey) return cachedKey;
  let { data: row } = await supabase.from('ivs_stage_keys').select('*').eq('id', 1).maybeSingle();
  if (!row) {
    // One-time setup: create an ES384 key pair and register the public half with IVS.
    const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-384' }, true, ['sign', 'verify']) as CryptoKeyPair;
    const spki = new Uint8Array(await crypto.subtle.exportKey('spki', pair.publicKey));
    let b = ''; spki.forEach((x) => (b += String.fromCharCode(x)));
    const pem = `-----BEGIN PUBLIC KEY-----\n${btoa(b).match(/.{1,64}/g)!.join('\n')}\n-----END PUBLIC KEY-----\n`;
    const imported = await ivsRealtimeRequest('ImportPublicKey', { publicKeyMaterial: pem, name: `triviabees-${Date.now()}` });
    const arn = (imported.publicKey as { arn: string }).arn;
    const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
    await supabase.from('ivs_stage_keys').insert({ id: 1, public_key_arn: arn, private_jwk: jwk });
    ({ data: row } = await supabase.from('ivs_stage_keys').select('*').eq('id', 1).single());
  }
  const key = await crypto.subtle.importKey('jwk', row.private_jwk, { name: 'ECDSA', namedCurve: 'P-384' }, false, ['sign']);
  cachedKey = { arn: row.public_key_arn, key };
  return cachedKey;
}

// deno-lint-ignore no-explicit-any
async function signStageToken(supabase: any, stage: { stage_arn: string; events_url: string; whip_url?: string | null }, userId: string, publish: boolean): Promise<string> {
  const { arn, key } = await getStageSigningKey(supabase);
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'ES384', typ: 'JWT', kid: arn };
  const payload: Record<string, unknown> = {
    exp: now + (publish ? 12 * 3600 : 4 * 3600), iat: now, jti: crypto.randomUUID(),
    resource: stage.stage_arn, topic: stage.stage_arn.split('/').pop(),
    events_url: stage.events_url, user_id: userId, attributes: {},
    capabilities: { allow_publish: publish, allow_subscribe: !publish }, version: '1.0',
  };
  if (stage.whip_url) payload.whip_url = stage.whip_url;
  const input = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-384' }, key, new TextEncoder().encode(input));
  return `${input}.${b64url(sig)}`;
}

/** Deletes stages whose live has ended (bounded batch) so the account stage quota never fills up. */
// deno-lint-ignore no-explicit-any
async function sweepStages(supabase: any) {
  const { data } = await supabase.from('live_stream_stages').select('stream_id, stage_arn, live_streams!inner(status)').neq('live_streams.status', 'live').limit(10);
  for (const r of data || []) {
    try { await ivsRealtimeRequest('DeleteStage', { arn: r.stage_arn }); } catch { /* already gone */ }
    await supabase.from('live_stream_stages').delete().eq('stream_id', r.stream_id);
  }
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
      case 'restream-ingest':
      case 'restream-status':
      case 'restream-end': {
        // Restream → Triviabees: seller's Restream sends RTMP to an IVS channel we own.
        const token = (req.headers.get('Authorization') || '').replace('Bearer ', '');
        const { data: authData } = await supabase.auth.getUser(token);
        const authUser = authData?.user;
        if (!authUser || !streamId) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        const { data: ls } = await supabase.from('live_streams').select('id, user_id, status, plan_code').eq('id', streamId).maybeSingle();
        if (!ls || ls.user_id !== authUser.id) {
          return new Response(JSON.stringify({ error: 'Not your stream' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        if (action === 'restream-ingest') {
          const { data: plan } = await supabase.from('live_plans').select('features').eq('code', ls.plan_code).maybeSingle();
          if (!(plan?.features as Record<string, boolean> | null)?.cross_platform) {
            return new Response(JSON.stringify({ error: 'Cross-platform live is not included in your plan' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
        }
        const { data: existing } = await supabase.from('live_stream_ingest').select('*').eq('stream_id', streamId).maybeSingle();

        if (action === 'restream-ingest') {
          if (existing) {
            result = { ingestServer: existing.ingest_server, streamKey: existing.stream_key };
            break;
          }
          const channelData = await ivsRequest('CreateChannel', {
            name: `restream-${streamId}`.slice(0, 128), type: 'STANDARD', latencyMode: 'LOW', authorized: false,
            tags: { streamId, userId: authUser.id },
          });
          const channel = channelData.channel as Record<string, string>;
          const key = channelData.streamKey as Record<string, string>;
          const ingestServer = `rtmps://${channel.ingestEndpoint}:443/app/`;
          await supabase.from('live_stream_ingest').insert({
            stream_id: streamId, user_id: authUser.id, channel_arn: channel.arn, ingest_server: ingestServer, stream_key: key.value,
          });
          await supabase.from('live_streams').update({ source: 'restream', playback_url: channel.playbackUrl }).eq('id', streamId);
          result = { ingestServer, streamKey: key.value };
          break;
        }
        if (!existing) { result = { state: 'none' }; break; }
        if (action === 'restream-status') {
          try {
            const s = (await ivsRequest('GetStream', { channelArn: existing.channel_arn })).stream as Record<string, unknown>;
            if (s?.viewerCount !== undefined) await supabase.from('live_streams').update({ viewer_count: s.viewerCount as number }).eq('id', streamId);
            result = { state: s?.state || 'OFFLINE', health: s?.health };
          } catch { result = { state: 'OFFLINE' }; }
          break;
        }
        // restream-end
        try { await ivsRequest('StopStream', { channelArn: existing.channel_arn }); } catch { /* not streaming */ }
        try { await ivsRequest('DeleteChannel', { arn: existing.channel_arn }); } catch (e) { console.warn('[IVS] delete failed', (e as Error).message); }
        await supabase.from('live_streams').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', streamId);
        await supabase.from('live_stream_ingest').delete().eq('stream_id', streamId);
        result = { success: true };
        break;
      }

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

      case 'stage-publish':
      case 'stage-view':
      case 'stage-end': {
        // Scalable camera lives: each live is an IVS Real-Time stage (up to ~25k viewers),
        // tokens are self-signed (no per-viewer AWS API call), so token issuing never hits AWS rate limits.
        const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '');
        const { data: authData } = await supabase.auth.getUser(jwt);
        const authUser = authData?.user;
        if (!authUser || !streamId || !/^[0-9a-f-]{36}$/i.test(streamId)) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        const { data: ls } = await supabase.from('live_streams').select('id, user_id, status, source').eq('id', streamId).maybeSingle();
        if (!ls) return new Response(JSON.stringify({ error: 'Live not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        const isOwner = ls.user_id === authUser.id;
        const { data: st } = await supabase.from('live_stream_stages').select('*').eq('stream_id', streamId).maybeSingle();

        if (action === 'stage-end') {
          if (!isOwner) return new Response(JSON.stringify({ error: 'Not your stream' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          if (st) {
            try { await ivsRealtimeRequest('DeleteStage', { arn: st.stage_arn }); } catch (e) { console.warn('[IVS] delete stage', (e as Error).message); }
            await supabase.from('live_stream_stages').delete().eq('stream_id', streamId);
          }
          await sweepStages(supabase);
          result = { success: true };
          break;
        }
        if (ls.status !== 'live' || ls.source === 'restream') { result = { token: null }; break; }

        if (action === 'stage-view') {
          if (!st) { result = { token: null }; break; }
          result = { token: await signStageToken(supabase, st, authUser.id, false) };
          break;
        }
        // stage-publish
        if (!isOwner) return new Response(JSON.stringify({ error: 'Not your stream' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        let stage = st;
        if (!stage) {
          const created = await ivsRealtimeRequest('CreateStage', { name: `live-${streamId}`.slice(0, 128), tags: { streamId, userId: authUser.id } });
          const s = created.stage as { arn: string; endpoints?: { events?: string; whip?: string } };
          const row = { stream_id: streamId, user_id: authUser.id, stage_arn: s.arn, events_url: s.endpoints?.events || 'wss://global.events.live-video.net', whip_url: s.endpoints?.whip || null };
          const { error: insErr } = await supabase.from('live_stream_stages').insert(row);
          if (insErr) {
            // Another tab created it first — keep theirs, drop ours
            try { await ivsRealtimeRequest('DeleteStage', { arn: s.arn }); } catch { /* ignore */ }
            const { data: again } = await supabase.from('live_stream_stages').select('*').eq('stream_id', streamId).single();
            stage = again;
          } else stage = row;
          sweepStages(supabase).catch(() => {});
        }
        result = { token: await signStageToken(supabase, stage, authUser.id, true) };
        break;
      }

      case 'create-stage':
      case 'create-participant-token':
      case 'delete-stage-legacy': {
        return new Response(JSON.stringify({ error: 'Use stage-publish / stage-view' }), { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      case 'create-stage-legacy': {
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

      case 'create-participant-token-legacy': {
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

      case 'delete-stage-old': {
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
