import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getVisitorId } from "@/lib/cookieTracking";

interface RecommendedProduct {
  id: string;
  name: string;
  base_price: number;
  image_url: string | null;
  category_id: string | null;
  score: number;
}

export const useProductRecommendations = (limit: number = 8) => {
  const [recommendations, setRecommendations] = useState<RecommendedProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecommendations();
  }, [limit]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      // Get user's interaction history
      const { data: interactions } = await supabase
        .from("user_interactions")
        .select("target_id, target_type")
        .eq("user_id", user?.id)
        .eq("target_type", "product")
        .order("created_at", { ascending: false })
        .limit(20);

      const viewedProductIds = interactions?.map(i => i.target_id) || [];

      // Get categories from viewed products
      let preferredCategoryIds: string[] = [];
      if (viewedProductIds.length > 0) {
        const { data: viewedProducts } = await supabase
          .from("products")
          .select("category_id")
          .in("id", viewedProductIds.slice(0, 10));
        preferredCategoryIds = [...new Set(viewedProducts?.map(p => p.category_id).filter(Boolean) as string[])];
      }

      // Build recommendation query
      let query = supabase
        .from("products")
        .select("id, name, base_price, image_url, category_id")
        .eq("is_active", true)
        .limit(limit);

      if (preferredCategoryIds.length > 0) {
        query = query.in("category_id", preferredCategoryIds);
      }

      const { data: products } = await query;

      const scoredProducts = (products || []).map(product => ({
        ...product,
        score: preferredCategoryIds.includes(product.category_id || '') ? 10 + Math.random() * 5 : Math.random() * 5
      }));

      scoredProducts.sort((a, b) => b.score - a.score);
      setRecommendations(scoredProducts.slice(0, limit));
    } catch (error) {
      console.error("Error fetching recommendations:", error);
    } finally {
      setLoading(false);
    }
  };

  return { recommendations, loading, refetch: fetchRecommendations };
};
