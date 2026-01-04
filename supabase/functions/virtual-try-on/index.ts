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

    console.log("Fetching image:", imageUrl.substring(0, 100));
    
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
    throw new Error(`Failed to fetch image from URL`);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productImageUrl, userPhotoUrl, prompt, productDescription, viewAngle } = await req.json();

    if (!productImageUrl) {
      throw new Error("Product image URL is required");
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("=== Virtual Try-On Request ===");
    console.log("Product:", productDescription);
    console.log("View angle:", viewAngle || "not specified");
    console.log("Has user photo:", !!userPhotoUrl);

    // Convert product image to base64
    let productImageBase64: string;
    try {
      productImageBase64 = await fetchImageAsBase64(productImageUrl);
      console.log("Product image converted successfully");
    } catch (error) {
      console.error("Failed to convert product image:", error);
      throw new Error("Could not load product image. Please try a different product.");
    }

    // Convert user photo to base64 if provided
    let userPhotoBase64: string | null = null;
    if (userPhotoUrl) {
      try {
        userPhotoBase64 = userPhotoUrl.startsWith('data:') 
          ? userPhotoUrl 
          : await fetchImageAsBase64(userPhotoUrl);
        console.log("User photo converted successfully");
      } catch (error) {
        console.error("Failed to convert user photo:", error);
        throw new Error("Could not process your photo. Please try a different image.");
      }
    }

    // Build angle-specific instructions
    const angleInstructions: Record<string, string> = {
      front: "The person should be facing directly towards the camera, showing the front of the outfit clearly.",
      back: "The person should be facing away from the camera, showing the back of the outfit. We should see the back of their head and the rear view of the clothing.",
      left: "The person should be shown from their left side in profile view. We see the left side of their face and the left side of the outfit.",
      right: "The person should be shown from their right side in profile view. We see the right side of their face and the right side of the outfit."
    };

    const currentAngleInstruction = viewAngle ? angleInstructions[viewAngle] || "" : angleInstructions.front;

    // Build the generation prompt
    let finalPrompt: string;
    
    if (userPhotoBase64) {
      // User uploaded their own photo - generate them wearing the product
      finalPrompt = `VIRTUAL TRY-ON TASK: Create a NEW photorealistic image.

I am providing TWO images:
IMAGE 1: A product photo of clothing (${productDescription})
IMAGE 2: A photo of a person who wants to try on this clothing

YOUR TASK: Generate a COMPLETELY NEW image that shows the PERSON from Image 2 wearing the CLOTHING from Image 1.

CRITICAL REQUIREMENTS:
1. PRESERVE the person's exact face, skin tone, hair style, and body proportions from their photo
2. REPLACE their current clothing with the product clothing item
3. Make the clothing FIT NATURALLY on their body shape
4. VIEW ANGLE: ${currentAngleInstruction}
5. Maintain professional lighting and natural shadows
6. The result must look like a real photograph, not a digital composite
7. DO NOT just show the product image - GENERATE A NEW IMAGE of the actual person wearing it

Output: A single high-quality photorealistic image of this specific person wearing the clothing item from the ${viewAngle || 'front'} angle.`;
    } else {
      // No user photo - show on a model
      finalPrompt = `FASHION CATALOG TASK: Create a NEW professional fashion photograph.

I am providing an image of a clothing item: ${productDescription}

YOUR TASK: Generate a COMPLETELY NEW image of a fashion model wearing this exact clothing item.

CRITICAL REQUIREMENTS:
1. Create a professional-looking model (adult, attractive, appropriate for the clothing style)
2. The model should be WEARING the clothing item naturally
3. VIEW ANGLE: ${currentAngleInstruction}
4. Studio setting with clean background and professional lighting
5. Full body or 3/4 body shot showing the outfit clearly
6. The result should look like a high-end fashion catalog photo
7. DO NOT return the original product image - CREATE A NEW image of a model wearing it

Output: A single high-quality fashion photograph showing a model wearing this outfit from the ${viewAngle || 'front'} view.`;
    }

    // Build the message content
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

    // Add user photo if provided
    if (userPhotoBase64) {
      messageContent.push({
        type: "image_url",
        image_url: {
          url: userPhotoBase64
        }
      });
    }

    console.log("Sending request to AI with", messageContent.length, "content items");
    console.log("Using model: google/gemini-3-pro-image-preview");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
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
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Insufficient AI credits. Please add more credits." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI API error: ${response.status} - ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
    console.log("AI response received successfully");

    // Extract the generated image from multiple possible locations
    let imageUrl: string | null = null;
    
    // Try primary location
    imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    // Try alternative locations
    if (!imageUrl) {
      const message = data.choices?.[0]?.message;
      if (message?.images && Array.isArray(message.images) && message.images.length > 0) {
        const firstImage = message.images[0];
        imageUrl = firstImage?.image_url?.url || firstImage?.url || (typeof firstImage === 'string' ? firstImage : null);
      }
    }

    // Check content array for image
    if (!imageUrl && data.choices?.[0]?.message?.content) {
      const content = data.choices[0].message.content;
      if (Array.isArray(content)) {
        for (const item of content) {
          if (item.type === 'image_url' && item.image_url?.url) {
            imageUrl = item.image_url.url;
            break;
          }
          if (item.type === 'image' && item.url) {
            imageUrl = item.url;
            break;
          }
        }
      }
    }
    
    if (!imageUrl) {
      console.error("No image found in response. Keys:", JSON.stringify(Object.keys(data)));
      console.error("Choices:", JSON.stringify(data.choices?.[0] ? Object.keys(data.choices[0]) : "none"));
      throw new Error("AI did not generate an image. Please try again.");
    }

    console.log("Image generated successfully for", viewAngle || "front", "view");

    return new Response(
      JSON.stringify({ 
        imageUrl,
        viewAngle: viewAngle || 'front',
        message: "Virtual try-on image generated successfully"
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
