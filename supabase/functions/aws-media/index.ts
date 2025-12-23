import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// File size limits (in bytes)
const FILE_SIZE_LIMITS = {
  image: 10 * 1024 * 1024,  // 10MB
  video: 100 * 1024 * 1024, // 100MB
  audio: 50 * 1024 * 1024,  // 50MB
  file: 50 * 1024 * 1024,   // 50MB
};

// Allowed file types
const ALLOWED_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic'],
  video: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3', 'audio/m4a'],
  file: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
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

function getMediaCategory(contentType: string): 'image' | 'video' | 'audio' | 'file' {
  if (contentType.startsWith('image/')) return 'image';
  if (contentType.startsWith('video/')) return 'video';
  if (contentType.startsWith('audio/')) return 'audio';
  return 'file';
}

function validateFile(contentType: string, fileSize: number): { valid: boolean; error?: string } {
  const category = getMediaCategory(contentType);
  const allowedTypes = ALLOWED_TYPES[category];
  const maxSize = FILE_SIZE_LIMITS[category];

  if (!allowedTypes.includes(contentType)) {
    return { valid: false, error: `File type ${contentType} is not allowed for ${category}` };
  }

  if (fileSize > maxSize) {
    const maxMB = maxSize / (1024 * 1024);
    return { valid: false, error: `File size exceeds maximum of ${maxMB}MB for ${category}` };
  }

  return { valid: true };
}

function generateFilePath(userId: string, originalFileName: string, contentType: string): string {
  const category = getMediaCategory(contentType);
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const ext = originalFileName.split('.').pop() || 'bin';
  const sanitizedName = originalFileName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .substring(0, 50);
  
  // AWS best-practice folder structure: posts/{userId}/{timestamp}/{filename}
  return `posts/${userId}/${timestamp}/${randomSuffix}-${sanitizedName}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID')?.trim();
    const secretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY')?.trim();
    const region = (Deno.env.get('AWS_REGION') || 'us-east-1').trim();
    const bucketName = Deno.env.get('AWS_S3_BUCKET')?.trim();
    const cloudfrontDomain = Deno.env.get('AWS_CLOUDFRONT_DOMAIN')?.trim();

    if (!accessKeyId || !secretAccessKey) {
      console.error('AWS credentials not configured');
      return new Response(
        JSON.stringify({ error: 'AWS credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!bucketName) {
      console.error('AWS S3 bucket not configured');
      return new Response(
        JSON.stringify({ error: 'AWS S3 bucket not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { operation, fileName, contentType, fileData, userId, originalFileName, fileSize } = body;

    console.log(`AWS Media operation: ${operation}, fileName: ${fileName || originalFileName}`);

    switch (operation) {
      case 'get_upload_url': {
        // Validate file if size and type provided
        if (fileSize && contentType) {
          const validation = validateFile(contentType, fileSize);
          if (!validation.valid) {
            return new Response(
              JSON.stringify({ error: validation.error }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }

        // Generate proper file path
        const filePath = userId && originalFileName 
          ? generateFilePath(userId, originalFileName, contentType || 'application/octet-stream')
          : fileName;

        // Generate pre-signed URL for direct upload
        const service = 's3';
        const host = `${bucketName}.s3.${region}.amazonaws.com`;
        const endpoint = `https://${host}/${filePath}`;
        
        const now = new Date();
        const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
        const dateStamp = amzDate.slice(0, 8);
        const expiresIn = 3600; // 1 hour

        const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
        
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
          '/' + filePath,
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
        
        // Generate CDN URL for retrieval with cache-busting and optimization headers
        const cdnUrl = cloudfrontDomain 
          ? `https://${cloudfrontDomain}/${filePath}`
          : `https://${host}/${filePath}`;

        console.log(`Generated presigned URL for: ${filePath}`);

        return new Response(
          JSON.stringify({ 
            uploadUrl: presignedUrl,
            cdnUrl,
            fileName: filePath,
            expiresIn
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

        // Generate proper file path if userId provided
        const filePath = userId && originalFileName 
          ? generateFilePath(userId, originalFileName, contentType || 'application/octet-stream')
          : fileName;

        // Decode base64 file data
        const binaryData = Uint8Array.from(atob(fileData), c => c.charCodeAt(0));
        
        // Validate file
        const validation = validateFile(contentType || 'application/octet-stream', binaryData.length);
        if (!validation.valid) {
          return new Response(
            JSON.stringify({ error: validation.error }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const service = 's3';
        const host = `${bucketName}.s3.${region}.amazonaws.com`;
        const endpoint = `https://${host}/${filePath}`;
        
        const now = new Date();
        const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
        const dateStamp = amzDate.slice(0, 8);

        const payloadHash = await sha256Binary(binaryData);
        
        // Add cache control headers for optimization
        const cacheControl = 'public, max-age=31536000'; // 1 year cache
        
        const canonicalHeaders = `cache-control:${cacheControl}\ncontent-type:${contentType || 'application/octet-stream'}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
        const signedHeaders = 'cache-control;content-type;host;x-amz-content-sha256;x-amz-date';
        
        const canonicalRequest = [
          'PUT',
          '/' + filePath,
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

        console.log(`Uploading ${binaryData.length} bytes to S3: ${filePath}`);

        const uploadResponse = await fetch(endpoint, {
          method: 'PUT',
          headers: {
            'Cache-Control': cacheControl,
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
          console.error('S3 upload error:', uploadResponse.status, errorText);
          return new Response(
            JSON.stringify({ error: 'Failed to upload to S3', details: errorText }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const cdnUrl = cloudfrontDomain 
          ? `https://${cloudfrontDomain}/${filePath}`
          : endpoint;

        console.log(`Upload successful, CDN URL: ${cdnUrl}`);

        return new Response(
          JSON.stringify({ 
            success: true,
            cdnUrl,
            fileName: filePath,
            size: binaryData.length
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_cdn_url': {
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

      case 'delete': {
        if (!fileName) {
          return new Response(
            JSON.stringify({ error: 'Missing file name' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const service = 's3';
        const host = `${bucketName}.s3.${region}.amazonaws.com`;
        const endpoint = `https://${host}/${fileName}`;
        
        const now = new Date();
        const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
        const dateStamp = amzDate.slice(0, 8);

        const payloadHash = await sha256('');
        
        const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
        const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
        
        const canonicalRequest = [
          'DELETE',
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

        const deleteResponse = await fetch(endpoint, {
          method: 'DELETE',
          headers: {
            'Host': host,
            'X-Amz-Content-Sha256': payloadHash,
            'X-Amz-Date': amzDate,
            'Authorization': authHeader,
          }
        });

        if (!deleteResponse.ok && deleteResponse.status !== 204) {
          const errorText = await deleteResponse.text();
          console.error('S3 delete error:', errorText);
          return new Response(
            JSON.stringify({ error: 'Failed to delete from S3', details: errorText }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`Deleted file: ${fileName}`);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown operation. Supported: get_upload_url, upload, get_cdn_url, delete' }),
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