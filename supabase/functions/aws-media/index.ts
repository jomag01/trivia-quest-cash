import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// AWS Signature V4 signing
async function sign(key: ArrayBuffer, msg: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(msg));
}

async function getSignatureKey(key: string, dateStamp: string, regionName: string, serviceName: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const kSecret = encoder.encode("AWS4" + key);
  const kDate = await sign(kSecret.buffer as ArrayBuffer, dateStamp);
  const kRegion = await sign(kDate, regionName);
  const kService = await sign(kRegion, serviceName);
  const kSigning = await sign(kService, "aws4_request");
  return kSigning;
}

async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data.buffer as ArrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Binary(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", data.buffer as ArrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function arrayToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID');
    const secretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY');
    const region = Deno.env.get('AWS_REGION') || 'us-east-1';
    const bucketName = Deno.env.get('AWS_S3_BUCKET') || 'lovable-media';
    const cloudfrontDomain = Deno.env.get('AWS_CLOUDFRONT_DOMAIN');

    if (!accessKeyId || !secretAccessKey) {
      return new Response(
        JSON.stringify({ error: 'AWS credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { operation, fileName, contentType, fileData } = await req.json();

    switch (operation) {
      case 'get_upload_url': {
        // Generate pre-signed URL for direct upload
        const service = 's3';
        const host = `${bucketName}.s3.${region}.amazonaws.com`;
        const endpoint = `https://${host}/${fileName}`;
        
        const now = new Date();
        const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
        const dateStamp = amzDate.slice(0, 8);
        const expiresIn = 3600; // 1 hour

        const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
        
        // Create canonical query string for pre-signed URL
        const algorithm = 'AWS4-HMAC-SHA256';
        const queryParams = new URLSearchParams({
          'X-Amz-Algorithm': algorithm,
          'X-Amz-Credential': `${accessKeyId}/${credentialScope}`,
          'X-Amz-Date': amzDate,
          'X-Amz-Expires': expiresIn.toString(),
          'X-Amz-SignedHeaders': 'host',
        });
        queryParams.sort();

        const canonicalRequest = [
          'PUT',
          '/' + fileName,
          queryParams.toString(),
          `host:${host}\n`,
          'host',
          'UNSIGNED-PAYLOAD'
        ].join('\n');

        const stringToSign = [
          algorithm,
          amzDate,
          credentialScope,
          await sha256(canonicalRequest)
        ].join('\n');

        const signingKey = await getSignatureKey(secretAccessKey, dateStamp, region, service);
        const signatureBuffer = await sign(signingKey, stringToSign);
        const signature = arrayToHex(signatureBuffer);

        queryParams.append('X-Amz-Signature', signature);

        const presignedUrl = `${endpoint}?${queryParams.toString()}`;
        
        // Generate CDN URL for retrieval
        const cdnUrl = cloudfrontDomain 
          ? `https://${cloudfrontDomain}/${fileName}`
          : `https://${host}/${fileName}`;

        return new Response(
          JSON.stringify({ 
            uploadUrl: presignedUrl,
            cdnUrl,
            fileName
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'upload': {
        // Direct upload through edge function (for smaller files)
        if (!fileData || !fileName) {
          return new Response(
            JSON.stringify({ error: 'Missing file data or name' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Decode base64 file data
        const binaryData = Uint8Array.from(atob(fileData), c => c.charCodeAt(0));
        
        const service = 's3';
        const host = `${bucketName}.s3.${region}.amazonaws.com`;
        const endpoint = `https://${host}/${fileName}`;
        
        const now = new Date();
        const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
        const dateStamp = amzDate.slice(0, 8);

        const payloadHash = await sha256Binary(binaryData);
        
        const canonicalHeaders = `content-type:${contentType || 'application/octet-stream'}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
        const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';
        
        const canonicalRequest = [
          'PUT',
          '/' + fileName,
          '',
          canonicalHeaders,
          signedHeaders,
          payloadHash
        ].join('\n');

        const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
        const stringToSign = [
          'AWS4-HMAC-SHA256',
          amzDate,
          credentialScope,
          await sha256(canonicalRequest)
        ].join('\n');

        const signingKey = await getSignatureKey(secretAccessKey, dateStamp, region, service);
        const signatureBuffer = await sign(signingKey, stringToSign);
        const signature = arrayToHex(signatureBuffer);

        const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

        const uploadResponse = await fetch(endpoint, {
          method: 'PUT',
          headers: {
            'Content-Type': contentType || 'application/octet-stream',
            'Host': host,
            'X-Amz-Content-Sha256': payloadHash,
            'X-Amz-Date': amzDate,
            'Authorization': authHeader,
          },
          body: binaryData
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.error('S3 upload error:', errorText);
          return new Response(
            JSON.stringify({ error: 'Failed to upload to S3', details: errorText }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const cdnUrl = cloudfrontDomain 
          ? `https://${cloudfrontDomain}/${fileName}`
          : endpoint;

        return new Response(
          JSON.stringify({ 
            success: true,
            cdnUrl,
            fileName
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_cdn_url': {
        // Get CDN URL for existing file
        if (!fileName) {
          return new Response(
            JSON.stringify({ error: 'Missing file name' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const host = `${bucketName}.s3.${region}.amazonaws.com`;
        const cdnUrl = cloudfrontDomain 
          ? `https://${cloudfrontDomain}/${fileName}`
          : `https://${host}/${fileName}`;

        return new Response(
          JSON.stringify({ cdnUrl }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown operation' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('AWS media error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
