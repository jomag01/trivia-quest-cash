import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'public, max-age=3600',
};

// Hash function for cache keys
async function hashPrompt(prompt: string, type: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${type}:${prompt.toLowerCase().trim()}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Upload base64 image to S3 via CloudFront
async function uploadToS3(base64Data: string, filename: string): Promise<string | null> {
  const AWS_ACCESS_KEY_ID = Deno.env.get('AWS_ACCESS_KEY_ID');
  const AWS_SECRET_ACCESS_KEY = Deno.env.get('AWS_SECRET_ACCESS_KEY');
  const AWS_REGION = Deno.env.get('AWS_REGION') || 'us-east-1';
  const AWS_S3_BUCKET = Deno.env.get('AWS_S3_BUCKET');
  const AWS_CLOUDFRONT_DOMAIN = Deno.env.get('AWS_CLOUDFRONT_DOMAIN');

  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !AWS_S3_BUCKET) {
    console.log('AWS credentials not configured, returning base64');
    return null;
  }

  try {
    // Extract base64 content
    const base64Content = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const binaryString = atob(base64Content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const path = `ai-generated/${filename}`;
    const endpoint = `https://${AWS_S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${path}`;
    
    // Generate AWS Signature V4
    const date = new Date();
    const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    
    const contentType = 'image/png';
    const payloadHash = await sha256Hex(bytes);
    
    const canonicalHeaders = [
      `content-type:${contentType}`,
      `host:${AWS_S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com`,
      `x-amz-content-sha256:${payloadHash}`,
      `x-amz-date:${amzDate}`,
    ].join('\n') + '\n';
    
    const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';
    
    const canonicalRequest = [
      'PUT',
      `/${path}`,
      '',
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');
    
    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${AWS_REGION}/s3/aws4_request`;
    const stringToSign = [
      algorithm,
      amzDate,
      credentialScope,
      await sha256Hex(new TextEncoder().encode(canonicalRequest)),
    ].join('\n');
    
    const signingKey = await getSignatureKey(AWS_SECRET_ACCESS_KEY, dateStamp, AWS_REGION, 's3');
    const signature = await hmacHex(signingKey, stringToSign);
    
    const authorization = `${algorithm} Credential=${AWS_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    
    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': amzDate,
        'Authorization': authorization,
        'x-amz-acl': 'public-read',
      },
      body: bytes,
    });

    if (!response.ok) {
      console.error('S3 upload failed:', response.status, await response.text());
      return null;
    }

    // Return CloudFront URL if available, otherwise S3 URL
    if (AWS_CLOUDFRONT_DOMAIN) {
      return `https://${AWS_CLOUDFRONT_DOMAIN}/${path}`;
    }
    return endpoint;
  } catch (error) {
    console.error('S3 upload error:', error);
    return null;
  }
}

// AWS Signature V4 helpers
async function sha256Hex(data: Uint8Array | string): Promise<string> {
  const buffer = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  // @ts-ignore - Deno crypto type issues
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hmac(key: Uint8Array, data: string): Promise<Uint8Array> {
  // @ts-ignore - Deno crypto type issues
  const cryptoKey = await crypto.subtle.importKey(
    'raw', 
    key, 
    { name: 'HMAC', hash: 'SHA-256' }, 
    false, 
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data));
  return new Uint8Array(signature);
}

async function hmacHex(key: Uint8Array, data: string): Promise<string> {
  const signature = await hmac(key, data);
  return Array.from(signature).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getSignatureKey(key: string, dateStamp: string, region: string, service: string): Promise<Uint8Array> {
  const kDate = await hmac(new TextEncoder().encode(`AWS4${key}`), dateStamp);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  return await hmac(kService, 'aws4_request');
}

// Retry with exponential backoff
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok || response.status < 500) {
        return response;
      }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error as Error;
    }
    
    // Exponential backoff: 1s, 2s, 4s
    if (i < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
  
  throw lastError || new Error('Request failed after retries');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { type, prompt, imageUrl, videoUrl, referenceImage, userId, skipCache } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log(`Processing ${type} request`, { hasPrompt: !!prompt, hasReference: !!referenceImage });

    // Generate cache key
    const cacheKey = await hashPrompt(prompt || imageUrl || videoUrl || '', type);

    // Check cache first (unless skipCache is true)
    if (!skipCache && !referenceImage) {
      const { data: cached } = await supabase
        .from('ai_response_cache')
        .select('*')
        .eq('prompt_hash', cacheKey)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (cached) {
        console.log('Cache hit for:', cacheKey.substring(0, 16));
        
        // Increment hit count asynchronously
        supabase
          .from('ai_response_cache')
          .update({ hit_count: (cached.hit_count || 0) + 1 })
          .eq('id', cached.id)
          .then(() => {});

        if (cached.response_type === 'image') {
          return new Response(JSON.stringify({ imageUrl: cached.response_url, cached: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } else {
          return new Response(JSON.stringify({ description: cached.response_text, cached: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }

    if (type === 'text-to-image') {
      let messageContent: any;
      
      if (referenceImage) {
        messageContent = [
          {
            type: "text",
            text: `Generate a high-quality image based on this prompt: "${prompt}". Use the provided reference image as a style and composition guide.`
          },
          {
            type: "image_url",
            image_url: { url: referenceImage }
          }
        ];
      } else {
        messageContent = `Generate a high-quality image: ${prompt}`;
      }

      const response = await fetchWithRetry("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image-preview",
          messages: [{ role: "user", content: messageContent }],
          modalities: ["image", "text"]
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Image generation error:", response.status, errorText);
        
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits depleted. Please add more credits." }), {
            status: 402,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        throw new Error(`Image generation failed: ${errorText}`);
      }

      const data = await response.json();
      let imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      
      if (!imageData) {
        throw new Error("No image generated");
      }

      // Upload to S3/CloudFront for CDN delivery
      const filename = `${cacheKey.substring(0, 16)}-${Date.now()}.png`;
      const cdnUrl = await uploadToS3(imageData, filename);
      
      const finalUrl = cdnUrl || imageData;

      // Cache the result (only if no reference image for better cache hits)
      if (!referenceImage) {
        await supabase.from('ai_response_cache').upsert({
          prompt_hash: cacheKey,
          prompt: prompt.substring(0, 500),
          response_type: 'image',
          response_url: finalUrl,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }, { onConflict: 'prompt_hash' });
      }

      return new Response(JSON.stringify({ imageUrl: finalUrl, cached: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (type === 'image-to-text') {
      const response = await fetchWithRetry("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{
            role: "user",
            content: [
              { type: "text", text: "Analyze this image in detail. Describe what you see, including objects, colors, composition, mood, and any notable elements. Be thorough but concise." },
              { type: "image_url", image_url: { url: imageUrl } }
            ]
          }]
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Image analysis error:", response.status, errorText);
        
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        throw new Error(`Image analysis failed: ${errorText}`);
      }

      const data = await response.json();
      const description = data.choices?.[0]?.message?.content;
      
      if (!description) {
        throw new Error("No description generated");
      }

      // Cache text responses
      await supabase.from('ai_response_cache').upsert({
        prompt_hash: cacheKey,
        prompt: 'image-analysis',
        response_type: 'text',
        response_text: description,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24hr cache for analysis
      }, { onConflict: 'prompt_hash' });

      return new Response(JSON.stringify({ description, cached: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (type === 'video-to-text') {
      const response = await fetchWithRetry("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{
            role: "user",
            content: [
              { type: "text", text: "Analyze this video content. Describe what you see, including the scene, actions, objects, and any notable elements. Provide a comprehensive description." },
              { type: "image_url", image_url: { url: videoUrl } }
            ]
          }]
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Video analysis error:", response.status, errorText);
        
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        throw new Error(`Video analysis failed: ${errorText}`);
      }

      const data = await response.json();
      const description = data.choices?.[0]?.message?.content;
      
      if (!description) {
        throw new Error("No description generated");
      }

      return new Response(JSON.stringify({ description, cached: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (type === 'product-recommendations') {
      const { context } = await req.json().catch(() => ({ context: '{}' }));
      const contextData = JSON.parse(context || '{}');
      
      const systemPrompt = `You are a smart product recommendation AI. Based on the user's browsing behavior and current product context, suggest the most relevant products from the available list.

Rules:
- Return a JSON object with "recommendations" (array of product IDs, max 4) and "reason" (brief explanation for user, max 15 words)
- Prioritize products similar to what user is viewing or has viewed
- Consider category relevance and price range similarity
- Be creative but logical in recommendations`;

      const userPrompt = `Current product: ${JSON.stringify(contextData.currentProduct || 'None')}
Recently viewed: ${JSON.stringify(contextData.recentlyViewed || [])}
Available products: ${JSON.stringify(contextData.availableProducts || [])}

Return JSON with "recommendations" (product IDs) and "reason" (short user-friendly explanation).`;

      const response = await fetchWithRetry("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          response_format: { type: "json_object" }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Product recommendations error:", response.status, errorText);
        
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded", recommendations: [], reason: "Popular picks" }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        throw new Error(`Recommendations failed: ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      
      try {
        const parsed = JSON.parse(content);
        return new Response(JSON.stringify({
          recommendations: parsed.recommendations || [],
          reason: parsed.reason || "Recommended for you"
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch {
        return new Response(JSON.stringify({ recommendations: [], reason: "Trending products" }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

    } else {
      throw new Error(`Unknown type: ${type}`);
    }

  } catch (error: unknown) {
    console.error("AI generate error:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});