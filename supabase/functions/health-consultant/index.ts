import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Fetch products with minimal data - run in parallel with AI request preparation
    const productsPromise = supabase
      .from("products")
      .select("id, name, description, base_price, promo_price, promo_active, image_url")
      .eq("is_active", true)
      .gt("stock_quantity", 0)
      .limit(30);

    const products = await productsPromise;
    const allProducts = products.data || [];

    // Create lightweight product catalog - only essential info
    const productCatalog = allProducts.map(p => ({
      id: p.id,
      name: p.name,
      description: (p.description || "").substring(0, 100),
      price: p.promo_active && p.promo_price ? p.promo_price : p.base_price
    }));

    // Shorter, more focused system prompt
    const systemPrompt = `You are an AI Health Consultant. Help users find health products.

RULES:
- Don't diagnose conditions
- Recommend consulting a doctor for serious symptoms
- Be brief and helpful

PRODUCTS: ${JSON.stringify(productCatalog)}

Respond with JSON only:
{"message": "your response", "recommended_product_ids": ["id1", "id2"]}

Max 3 product recommendations. Empty array if none relevant.`;

    // Use faster model
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.slice(-4), // Only last 4 messages for context
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Service temporarily unavailable." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error("Failed to get AI response");
    }

    const aiData = await response.json();
    const aiContent = aiData.choices?.[0]?.message?.content || "";

    // Parse AI response
    let parsedResponse;
    try {
      let cleanContent = aiContent.trim();
      if (cleanContent.startsWith("```json")) {
        cleanContent = cleanContent.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }
      parsedResponse = JSON.parse(cleanContent);
    } catch {
      parsedResponse = { message: aiContent, recommended_product_ids: [] };
    }

    // Get recommended products with stats only if we have recommendations
    let recommendedProducts: any[] = [];
    if (parsedResponse.recommended_product_ids?.length > 0) {
      const recIds = parsedResponse.recommended_product_ids;
      
      // Parallel fetch for stats
      const [orderStats, reviews] = await Promise.all([
        supabase.from("order_items").select("product_id, quantity").in("product_id", recIds),
        supabase.from("product_reviews").select("product_id, rating").in("product_id", recIds)
      ]);

      recommendedProducts = allProducts
        .filter(p => recIds.includes(p.id))
        .map(p => {
          const productOrders = orderStats.data?.filter(o => o.product_id === p.id) || [];
          const productReviews = reviews.data?.filter(r => r.product_id === p.id) || [];
          const totalSold = productOrders.reduce((sum, o) => sum + (o.quantity || 0), 0);
          const avgRating = productReviews.length > 0 
            ? Math.round((productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length) * 10) / 10
            : 0;

          return {
            id: p.id,
            name: p.name,
            description: p.description || "",
            price: p.promo_active && p.promo_price ? p.promo_price : p.base_price,
            image_url: p.image_url,
            total_sold: totalSold,
            avg_rating: avgRating,
            review_count: productReviews.length
          };
        });
    }

    return new Response(
      JSON.stringify({
        message: parsedResponse.message,
        products: recommendedProducts
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Health consultant error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        message: "I apologize, but I'm having trouble. Please try again.",
        products: []
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
