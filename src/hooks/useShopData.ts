import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { withCache, prefetch } from '@/lib/performance/ApiCache';
import { useAuth } from '@/contexts/AuthContext';

// Polyfill for requestIdleCallback (Safari)
const requestIdleCallback = 
  typeof window !== 'undefined' && 'requestIdleCallback' in window
    ? window.requestIdleCallback
    : (cb: () => void, _options?: { timeout?: number }) => setTimeout(cb, 1);

interface Product {
  id: string;
  name: string;
  description?: string;
  base_price: number;
  promo_price?: number | null;
  promo_active?: boolean;
  image_url?: string | null;
  hover_image_url?: string | null;
  stock_quantity?: number;
  diamond_reward?: number;
  category_id?: string;
  combined_sales?: number;
  combined_rating?: number;
  review_count?: number;
  real_sales?: number;
  [key: string]: any;
}

interface Category {
  id: string;
  name: string;
  icon?: string;
  is_active?: boolean;
}

const CACHE_TTL = 60 * 1000; // 60 seconds
const INITIAL_PRODUCT_LIMIT = 8;

// Lightweight product fetch - no heavy joins
async function fetchLightProducts(limit: number): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, base_price, promo_price, promo_active, image_url, stock_quantity, diamond_reward, category_id')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

// Fetch categories
async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('product_categories')
    .select('id, name, icon, is_active')
    .eq('is_active', true);

  if (error) throw error;
  return data || [];
}

// Heavy data - deferred load (sales, ratings, images)
async function fetchProductEnhancements(productIds: string[]): Promise<Map<string, Partial<Product>>> {
  if (productIds.length === 0) return new Map();

  const enhancements = new Map<string, Partial<Product>>();

  // Parallel fetch all heavy data
  const [imagesResult, salesResult, ratingsResult] = await Promise.all([
    // Product images
    supabase
      .from('product_images')
      .select('product_id, image_url, image_type')
      .in('product_id', productIds)
      .in('image_type', ['static', 'hover']),
    
    // Sales data
    supabase
      .from('order_items')
      .select('product_id, quantity, orders!inner(status)')
      .in('product_id', productIds)
      .eq('orders.status', 'delivered'),
    
    // Ratings
    supabase
      .from('product_reviews')
      .select('product_id, product_rating')
      .in('product_id', productIds)
  ]);

  // Process images
  const imagesByProduct = new Map<string, { static?: string; hover?: string }>();
  imagesResult.data?.forEach(img => {
    if (!imagesByProduct.has(img.product_id)) {
      imagesByProduct.set(img.product_id, {});
    }
    const entry = imagesByProduct.get(img.product_id)!;
    if (img.image_type === 'static') entry.static = img.image_url;
    if (img.image_type === 'hover') entry.hover = img.image_url;
  });

  // Process sales
  const salesByProduct = new Map<string, number>();
  salesResult.data?.forEach(item => {
    salesByProduct.set(
      item.product_id, 
      (salesByProduct.get(item.product_id) || 0) + item.quantity
    );
  });

  // Process ratings
  const ratingsByProduct = new Map<string, { sum: number; count: number }>();
  ratingsResult.data?.forEach(review => {
    if (!ratingsByProduct.has(review.product_id)) {
      ratingsByProduct.set(review.product_id, { sum: 0, count: 0 });
    }
    const entry = ratingsByProduct.get(review.product_id)!;
    entry.sum += review.product_rating;
    entry.count += 1;
  });

  // Build enhancements map
  productIds.forEach(id => {
    const images = imagesByProduct.get(id);
    const sales = salesByProduct.get(id) || 0;
    const rating = ratingsByProduct.get(id);

    enhancements.set(id, {
      image_url: images?.static,
      hover_image_url: images?.hover,
      combined_sales: sales,
      combined_rating: rating ? rating.sum / rating.count : 0,
      review_count: rating?.count || 0,
      real_sales: sales
    });
  });

  return enhancements;
}

export function useShopData() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [enhancementsLoaded, setEnhancementsLoaded] = useState(false);
  const [inCart, setInCart] = useState<Set<string>>(new Set());
  const [inWishlist, setInWishlist] = useState<Set<string>>(new Set());
  const hasFetchedRef = useRef(false);

  // Initial fast load - layout visible immediately
  const fetchInitialData = useCallback(async () => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    try {
      // Parallel fetch initial products and categories with cache
      const [productsData, categoriesData] = await Promise.all([
        withCache('shop:products:initial', () => fetchLightProducts(INITIAL_PRODUCT_LIMIT), CACHE_TTL),
        withCache('shop:categories', fetchCategories, CACHE_TTL)
      ]);

      setProducts(productsData);
      setCategories(categoriesData);
      setLoading(false);

      // Defer: Load full products and enhancements
      requestIdleCallback(() => {
        loadFullProductsAndEnhancements(productsData.map(p => p.id));
      }, { timeout: 1000 });

    } catch (error) {
      console.error('Error fetching initial shop data:', error);
      setLoading(false);
    }
  }, []);

  // Deferred heavy data load
  const loadFullProductsAndEnhancements = useCallback(async (initialIds: string[]) => {
    try {
      // Fetch all products (not just initial 8)
      const allProducts = await withCache(
        'shop:products:all',
        () => fetchLightProducts(100),
        CACHE_TTL
      );

      const allIds = allProducts.map(p => p.id);
      
      // Fetch enhancements for all products
      const enhancements = await withCache(
        'shop:enhancements',
        () => fetchProductEnhancements(allIds),
        CACHE_TTL
      );

      // Merge enhancements into products
      const enhancedProducts = allProducts.map(product => {
        const enhancement = enhancements.get(product.id);
        return enhancement ? { ...product, ...enhancement } : product;
      });

      setProducts(enhancedProducts);
      setEnhancementsLoaded(true);
    } catch (error) {
      console.error('Error loading product enhancements:', error);
    }
  }, []);

  // Fetch cart status
  const fetchCartStatus = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('cart')
        .select('product_id')
        .eq('user_id', user.id);
      setInCart(new Set(data?.map(item => item.product_id) || []));
    } catch (error) {
      console.error('Error fetching cart:', error);
    }
  }, [user]);

  // Fetch wishlist status
  const fetchWishlistStatus = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('wishlist')
        .select('product_id')
        .eq('user_id', user.id);
      setInWishlist(new Set(data?.map(item => item.product_id) || []));
    } catch (error) {
      console.error('Error fetching wishlist:', error);
    }
  }, [user]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    if (user) {
      // Defer user-specific data
      requestIdleCallback(() => {
        fetchCartStatus();
        fetchWishlistStatus();
      }, { timeout: 500 });
    }
  }, [user, fetchCartStatus, fetchWishlistStatus]);

  return {
    products,
    categories,
    loading,
    enhancementsLoaded,
    inCart,
    inWishlist,
    refreshCart: fetchCartStatus,
    refreshWishlist: fetchWishlistStatus,
  };
}

// Prefetch shop data when hovering on shop tab
export function prefetchShopData() {
  prefetch('shop:products:initial', () => fetchLightProducts(INITIAL_PRODUCT_LIMIT), CACHE_TTL);
  prefetch('shop:categories', fetchCategories, CACHE_TTL);
}
