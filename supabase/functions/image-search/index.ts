import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageDataUrl } = await req.json();
    if (!imageDataUrl || typeof imageDataUrl !== "string") {
      return new Response(JSON.stringify({ error: "Missing imageDataUrl" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch products from database for AI to compare against
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { data: products } = await supabase
      .from("products")
      .select("id, name, description, category_id")
      .eq("is_active", true)
      .limit(200);

    // Create a product catalog summary for the AI
    const productCatalog = products?.map(p => 
      `${p.name}${p.description ? ` - ${p.description.substring(0, 100)}` : ''}`
    ).join("\n") || "";

    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `You are a product matching AI. Analyze this image and find matching products from our catalog.

STEP 1 - ANALYZE THE IMAGE:
- Identify the product type, brand, model, color, material, style
- Read ANY text visible (brand names, labels, logos, model numbers)
- Note distinctive features, patterns, designs

STEP 2 - MATCH WITH OUR CATALOG:
Here are products in our shop:
${productCatalog}

STEP 3 - RETURN SEARCH TERMS:
Based on your analysis and our catalog, return search keywords that will find:
1. EXACT matches if the product exists in our catalog
2. SIMILAR products if no exact match

IMPORTANT MATCHING RULES:
- If you see a brand name (Nike, Samsung, Apple, etc), include it
- If product text/label is visible, use those exact terms
- Match by: brand, product type, color, category, key features
- Be specific: "iPhone 15 Pro Max" not just "phone"

Return ONLY 3-8 search keywords/phrases separated by spaces.
Examples:
- "Nike Air Max sneakers white"
- "Samsung Galaxy S24 phone black"
- "wooden dining table 6 seater"`,
              },
              { type: "image_url", image_url: { url: imageDataUrl } },
            ],
          },
        ],
        max_tokens: 200,
      }),
    });

    if (!upstream.ok) {
      const t = await upstream.text();
      const status = upstream.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests. Please try again." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please try again later." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      console.error("image-search upstream error:", status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await upstream.json();
    const keywords = data?.choices?.[0]?.message?.content?.trim?.() ?? "";

    console.log("Image search keywords:", keywords);

    // Search for matching products using the AI-generated keywords
    const searchTerms = keywords.split(/\s+/).filter((k: string) => k.length > 2);
    let matchedProducts: any[] = [];

    if (searchTerms.length > 0) {
      // Build search query using OR conditions
      const searchQuery = searchTerms.slice(0, 5).map((term: string) => 
        `name.ilike.%${term}%,description.ilike.%${term}%`
      ).join(",");

      const { data: searchResults } = await supabase
        .from("products")
        .select("id, name, description, base_price, image_url")
        .eq("is_active", true)
        .or(searchQuery)
        .limit(10);

      matchedProducts = searchResults || [];
    }

    return new Response(JSON.stringify({ 
      keywords,
      matchedProducts,
      searchTerms
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("image-search error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
