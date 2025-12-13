import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to convert image URL to base64
async function fetchImageAsBase64(imageUrl: string): Promise<string> {
  try {
    // Skip if already base64
    if (imageUrl.startsWith('data:')) {
      return imageUrl;
    }

    console.log("Fetching image:", imageUrl);
    
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/*,*/*',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error("Error fetching image:", error);
    throw new Error(`Failed to fetch image from URL: ${imageUrl}`);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productImageUrl, userPhotoUrl, prompt, productDescription } = await req.json();

    if (!productImageUrl) {
      throw new Error("Product image URL is required");
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Generating virtual try-on image...");
    console.log("Product:", productDescription);
    console.log("Has user photo:", !!userPhotoUrl);

    // Convert product image to base64
    let productImageBase64: string;
    try {
      productImageBase64 = await fetchImageAsBase64(productImageUrl);
      console.log("Product image converted to base64");
    } catch (error) {
      console.error("Failed to convert product image:", error);
      throw new Error("Could not load product image. Please try a different product.");
    }

    // Build the message content
    const messageContent: any[] = [
      {
        type: "text",
        text: prompt
      },
      {
        type: "image_url",
        image_url: {
          url: productImageBase64
        }
      }
    ];

    // If user uploaded their photo, include it (already base64)
    if (userPhotoUrl) {
      messageContent.push({
        type: "image_url",
        image_url: {
          url: userPhotoUrl
        }
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: messageContent
          }
        ],
        modalities: ["image", "text"]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Insufficient credits. Please add more credits." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response received");

    // Extract the generated image
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageUrl) {
      console.error("No image in response:", JSON.stringify(data));
      throw new Error("No image was generated");
    }

    return new Response(
      JSON.stringify({ 
        imageUrl,
        message: data.choices?.[0]?.message?.content || "Image generated successfully"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error("Virtual try-on error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate try-on image";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
