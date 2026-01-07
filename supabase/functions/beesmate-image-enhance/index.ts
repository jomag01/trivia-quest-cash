import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, enhancementType, userId } = await req.json();

    if (!imageUrl || !enhancementType || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Build enhancement prompt based on type
    let prompt = "";
    switch (enhancementType) {
      case "beautify":
        prompt = "Enhance this portrait photo: improve lighting, smooth skin naturally, enhance colors, make it look professional while keeping it natural. Keep the person looking like themselves.";
        break;
      case "background":
        prompt = "Replace the background of this photo with a beautiful, professional-looking backdrop. Keep the person in the foreground perfectly preserved. Use a subtle, elegant background that complements the subject.";
        break;
      case "filter":
        prompt = "Apply a beautiful artistic filter to this photo. Enhance the mood with cinematic color grading, add subtle warmth, and make it look like a professional photoshoot. Keep the subject natural and recognizable.";
        break;
      default:
        prompt = "Enhance this photo professionally while keeping it natural.";
    }

    // Call the AI image editing endpoint
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
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: imageUrl } }
            ]
          }
        ],
        modalities: ["image", "text"]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", errorText);
      throw new Error(`AI API returned ${response.status}`);
    }

    const data = await response.json();
    const enhancedImageBase64 = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!enhancedImageBase64) {
      throw new Error("No image returned from AI");
    }

    // Upload enhanced image to storage
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Convert base64 to blob
    const base64Data = enhancedImageBase64.replace(/^data:image\/\w+;base64,/, "");
    const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    const fileName = `${userId}/enhanced_${Date.now()}.png`;
    
    const { error: uploadError } = await supabase.storage
      .from("beesmate-profiles")
      .upload(fileName, imageBytes, {
        contentType: "image/png",
        upsert: true
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error("Failed to upload enhanced image");
    }

    const { data: { publicUrl } } = supabase.storage
      .from("beesmate-profiles")
      .getPublicUrl(fileName);

    // Deduct AI credits if applicable
    // This would be based on admin settings for the user's premium tier
    // For now, we'll skip credit deduction for premium users

    console.log(`Image enhanced successfully for user ${userId}, type: ${enhancementType}`);

    return new Response(
      JSON.stringify({ 
        enhancedUrl: publicUrl,
        enhancementType,
        success: true 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to enhance image";
    console.error("Error in beesmate-image-enhance:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});