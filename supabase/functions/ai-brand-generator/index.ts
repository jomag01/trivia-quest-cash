import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { type, description, industry, keywords, brandName, tagline, style, colors } = await req.json();

    if (type === "names") {
      // Generate brand names
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are an expert brand naming specialist. Generate creative, memorable, and professional brand names. 
              Return ONLY valid JSON without any markdown formatting.`,
            },
            {
              role: "user",
              content: `Generate 5 unique brand name ideas for this business:
              
Description: ${description}
Industry: ${industry || "General"}
Keywords: ${keywords || "None specified"}

For each brand, provide:
1. A catchy, memorable name (1-3 words, easy to pronounce)
2. A short tagline (5-10 words)
3. A brief description of why this name works (1-2 sentences)
4. A suggested color palette (3-4 hex colors)
5. The style/vibe (e.g., modern, playful, professional)

Return as JSON array:
[
  {
    "name": "BrandName",
    "tagline": "Short catchy tagline",
    "description": "Why this name works...",
    "colorPalette": ["#hexcolor1", "#hexcolor2", "#hexcolor3"],
    "style": "modern"
  }
]`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "generate_brands",
                description: "Generate brand name suggestions",
                parameters: {
                  type: "object",
                  properties: {
                    brands: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          tagline: { type: "string" },
                          description: { type: "string" },
                          colorPalette: { type: "array", items: { type: "string" } },
                          style: { type: "string" },
                        },
                        required: ["name", "tagline", "description", "colorPalette", "style"],
                      },
                    },
                  },
                  required: ["brands"],
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "generate_brands" } },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("AI API Error:", response.status, errorText);
        throw new Error("Failed to generate brand names");
      }

      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      
      if (toolCall?.function?.arguments) {
        const parsed = JSON.parse(toolCall.function.arguments);
        return new Response(JSON.stringify({ brands: parsed.brands }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      throw new Error("Invalid response format");
    } else if (type === "logo") {
      // Generate logo designs using Gemini image generation
      const stylePrompts: Record<string, string> = {
        modern: "minimalist, clean lines, geometric shapes, contemporary",
        playful: "colorful, fun, rounded shapes, energetic, friendly",
        luxury: "elegant, gold accents, sophisticated, premium, refined",
        tech: "futuristic, digital, gradient, innovative, sleek",
        organic: "natural, earthy, flowing shapes, eco-friendly, green",
        vintage: "retro, classic, nostalgic, timeless, hand-drawn feel",
      };

      const styleDesc = stylePrompts[style] || stylePrompts.modern;
      const colorDesc = colors || "professional colors";

      const logoPrompts = [
        `Create a professional logo design for "${brandName}" brand. Style: ${styleDesc}. Colors: ${colorDesc}. The logo should be simple, memorable, and work well at any size. Include the brand name in an elegant typography. White or transparent background.`,
        `Design a modern icon/symbol logo for "${brandName}". Style: ${styleDesc}. Colors: ${colorDesc}. Create a distinctive icon that represents the brand essence without text. Clean, scalable, professional. White background.`,
      ];

      const logos = [];

      for (const prompt of logoPrompts) {
        try {
          const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-image-preview",
              messages: [{ role: "user", content: prompt }],
              modalities: ["image", "text"],
            }),
          });

          if (imageResponse.ok) {
            const imageData = await imageResponse.json();
            const imageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
            if (imageUrl) {
              logos.push({ imageUrl, prompt });
            }
          }
        } catch (err) {
          console.error("Logo generation error:", err);
        }
      }

      if (logos.length === 0) {
        throw new Error("Failed to generate any logos");
      }

      return new Response(JSON.stringify({ logos }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid request type");
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
