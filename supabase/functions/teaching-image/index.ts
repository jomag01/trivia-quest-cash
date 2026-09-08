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
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const body = await req.json();
    const {
      materialType = "Poster",
      gradeLevel = "Grade 1",
      subject = "English",
      topic = "",
      language = "English",
      style = "Cute caricature cartoon",
      palette = "Bright rainbow",
      orientation = "A4 Portrait",
      heading = "",
      subheading = "",
      lines = [],
      footerName = "",
      instructions = "",
      baseImage = null,
      editInstruction = "",
    } = body ?? {};

    const textLines: string[] = Array.isArray(lines) ? lines.filter((l: string) => l && l.trim()) : [];

    let prompt: string;

    if (baseImage && editInstruction) {
      prompt = `Edit this printable teaching material image. Apply exactly this change: ${editInstruction}.
Keep the rest of the artwork, layout, colors and characters unchanged.
All text must be spelled perfectly, in ${language}, large and easy to read for ${gradeLevel} learners.
Keep it a clean, print-ready ${orientation} sheet at 300 DPI look with generous white margins. No watermarks.`;
    } else {
      prompt = `Create a print-ready ${orientation} classroom ${materialType} for ${gradeLevel} ${subject}${topic ? ` about "${topic}"` : ""}.

ART STYLE: ${style}. Friendly caricature characters with big expressive faces, thick clean outlines, flat vibrant coloring, ${palette} color palette, playful stickers, stars and rounded banners — like a professionally designed children's workbook cover.

TEXT ON THE IMAGE (spell every word exactly, in ${language}, no extra or invented words):
- Main title: "${heading || topic || subject}"
${subheading ? `- Subtitle: "${subheading}"` : ""}
${textLines.length ? textLines.map((l, i) => `- Banner ${i + 1}: "${l}"`).join("\n") : ""}
${footerName ? `- Small footer badge: "${footerName}"` : ""}

TYPOGRAPHY: bold rounded playful display lettering for the title, clear readable sans-serif for the banners, high contrast against the background, nothing cut off at the edges, nothing overlapping.

LAYOUT: centered title at the top, banners stacked neatly below, caricature children/characters illustrating the topic at the bottom, decorative border, plenty of white space so it prints well on paper.
${instructions ? `\nADDITIONAL TEACHER INSTRUCTIONS: ${instructions}` : ""}

Do not add watermarks, page numbers, or any text that was not listed above.`;
    }

    const content: unknown[] = [{ type: "text", text: prompt }];
    if (baseImage) {
      content.push({ type: "image_url", image_url: { url: baseImage } });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [{ role: "user", content }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests right now. Please try again in a few seconds." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 429,
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits are exhausted. Please top up to continue." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 402,
        });
      }
      return new Response(JSON.stringify({ error: "Image generation failed. Please try again." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
      });
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "No image was returned. Try simplifying the text or topic." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
      });
    }

    return new Response(JSON.stringify({ imageUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("teaching-image error:", error);
    const message = error instanceof Error ? error.message : "Failed to create the teaching image";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
