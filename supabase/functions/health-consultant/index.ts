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

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Fetch health-related products from the shop
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, name, description, base_price, promo_price, promo_active, image_url, stock_quantity")
      .eq("is_active", true)
      .or("name.ilike.%health%,name.ilike.%vitamin%,name.ilike.%supplement%,name.ilike.%medicine%,name.ilike.%wellness%,name.ilike.%herbal%,name.ilike.%organic%,description.ilike.%health%,description.ilike.%vitamin%,description.ilike.%supplement%")
      .gt("stock_quantity", 0);

    if (productsError) {
      console.error("Error fetching products:", productsError);
    }

    // If no health products found, fetch all products
    let allProducts = products || [];
    if (allProducts.length === 0) {
      const { data: allProductsData } = await supabase
        .from("products")
        .select("id, name, description, base_price, promo_price, promo_active, image_url, stock_quantity")
        .eq("is_active", true)
        .gt("stock_quantity", 0)
        .limit(50);
      allProducts = allProductsData || [];
    }

    // Fetch product images
    const productIds = allProducts.map(p => p.id);
    const { data: productImages } = await supabase
      .from("product_images")
      .select("product_id, image_url")
      .in("product_id", productIds)
      .eq("image_type", "static");

    // Fetch order statistics for each product
    const { data: orderStats } = await supabase
      .from("order_items")
      .select("product_id, quantity")
      .in("product_id", productIds);

    // Fetch reviews for each product
    const { data: reviews } = await supabase
      .from("product_reviews")
      .select("product_id, rating")
      .in("product_id", productIds);

    // Calculate stats per product
    const productStats: Record<string, { totalSold: number; avgRating: number; reviewCount: number }> = {};
    
    productIds.forEach(id => {
      const productOrders = orderStats?.filter(o => o.product_id === id) || [];
      const productReviews = reviews?.filter(r => r.product_id === id) || [];
      
      const totalSold = productOrders.reduce((sum, o) => sum + (o.quantity || 0), 0);
      const avgRating = productReviews.length > 0 
        ? productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length 
        : 0;
      
      productStats[id] = {
        totalSold,
        avgRating: Math.round(avgRating * 10) / 10,
        reviewCount: productReviews.length
      };
    });

    // Create product catalog for AI context
    const productCatalog = allProducts.map(p => {
      const stats = productStats[p.id] || { totalSold: 0, avgRating: 0, reviewCount: 0 };
      const image = productImages?.find(img => img.product_id === p.id)?.image_url || p.image_url;
      const price = p.promo_active && p.promo_price ? p.promo_price : p.base_price;
      
      return {
        id: p.id,
        name: p.name,
        description: p.description || "",
        price,
        image_url: image,
        total_sold: stats.totalSold,
        avg_rating: stats.avgRating,
        review_count: stats.reviewCount
      };
    });

    const systemPrompt = `You are a knowledgeable AI Health Consultant for an online shop. Your role is to:
1. Listen to users' health concerns and symptoms
2. Ask follow-up questions to better understand their needs
3. Recommend suitable health products from our catalog
4. Highlight product benefits, sales statistics, and reviews to help users make informed decisions

IMPORTANT GUIDELINES:
- Always include a disclaimer that you're not a medical professional
- Never diagnose medical conditions
- Recommend consulting a healthcare professional for serious symptoms
- Be empathetic and supportive
- Focus on general wellness products, supplements, and health aids

AVAILABLE PRODUCTS IN OUR SHOP:
${JSON.stringify(productCatalog, null, 2)}

When recommending products, respond with a JSON object in this exact format:
{
  "message": "Your conversational response here with product recommendations explained",
  "recommended_product_ids": ["product_id_1", "product_id_2"]
}

Include up to 3 most relevant product IDs based on the user's health concerns.
If no products are relevant, set recommended_product_ids to an empty array.
Always respond with valid JSON only, no additional text.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
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
    
    console.log("AI Response:", aiContent);

    // Parse AI response
    let parsedResponse;
    try {
      // Clean up the response if it has markdown code blocks
      let cleanContent = aiContent.trim();
      if (cleanContent.startsWith("```json")) {
        cleanContent = cleanContent.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }
      
      parsedResponse = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      parsedResponse = {
        message: aiContent,
        recommended_product_ids: []
      };
    }

    // Get recommended products with full details
    const recommendedProducts = productCatalog.filter(p => 
      parsedResponse.recommended_product_ids?.includes(p.id)
    );

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
        error: error instanceof Error ? error.message : "Unknown error occurred",
        message: "I apologize, but I'm having trouble processing your request. Please try again.",
        products: []
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
