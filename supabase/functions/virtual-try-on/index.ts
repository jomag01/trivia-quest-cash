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
    console.log("User photo provided:", userPhotoUrl ? "Yes (base64)" : "No");

    // Convert product image to base64
    let productImageBase64: string;
    try {
      productImageBase64 = await fetchImageAsBase64(productImageUrl);
      console.log("Product image converted to base64");
    } catch (error) {
      console.error("Failed to convert product image:", error);
      throw new Error("Could not load product image. Please try a different product.");
    }

    // Build the appropriate prompt based on whether user photo is provided
    let finalPrompt: string;
    if (userPhotoUrl) {
      // User uploaded their own photo - generate them wearing the product
      finalPrompt = `You are a professional fashion AI. I'm providing two images:
1. First image: A clothing item (${productDescription})
2. Second image: A photo of a person

Your task: Generate a NEW photorealistic image showing the person from the second image wearing the clothing item from the first image. 

IMPORTANT INSTRUCTIONS:
- Keep the person's face, body shape, skin tone, and pose EXACTLY as shown in their photo
- ONLY change their outfit to show them wearing the clothing item
- Make the clothing fit naturally on their body
- Maintain realistic lighting and shadows
- The result should look like a real photograph, not an edited image
- Do NOT just return the product image - you MUST generate a new composite image

Generate a high-quality, photorealistic image now.`;
    } else {
      // No user photo - show on a model
      finalPrompt = `You are a professional fashion AI. Generate a NEW high-quality fashion photograph showing a professional model wearing this clothing item: ${productDescription}

IMPORTANT INSTRUCTIONS:
- Create a completely NEW image of a model wearing this exact garment
- The model should be in a clean, professional studio setting
- Show the full outfit clearly with good lighting
- Make it look like a professional fashion catalog photograph
- Do NOT just return the input product image - generate a NEW image of someone wearing it

Generate the fashion photograph now.`;
    }

    // Build the message content with proper image order
    const messageContent: any[] = [
      {
        type: "text",
        text: finalPrompt
      },
      {
        type: "image_url",
        image_url: {
          url: productImageBase64
        }
      }
    ];

    // If user uploaded their photo, include it as the second image
    if (userPhotoUrl) {
      console.log("Adding user photo to request");
      messageContent.push({
        type: "image_url",
        image_url: {
          url: userPhotoUrl
        }
      });
    }

    console.log("Sending request to AI API with", messageContent.length, "content items");

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
    console.log("Response structure:", JSON.stringify(Object.keys(data)));

    // Extract the generated image - check multiple possible locations
    let imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    // Alternative extraction if the above doesn't work
    if (!imageUrl) {
      const message = data.choices?.[0]?.message;
      console.log("Message keys:", message ? Object.keys(message) : "no message");
      
      // Check if images are in a different format
      if (message?.images && Array.isArray(message.images) && message.images.length > 0) {
        const firstImage = message.images[0];
        imageUrl = firstImage?.image_url?.url || firstImage?.url || firstImage;
      }
    }
    
    if (!imageUrl) {
      console.error("No image in response. Full response:", JSON.stringify(data));
      throw new Error("AI did not generate an image. Please try again.");
    }

    console.log("Successfully extracted image URL");

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
