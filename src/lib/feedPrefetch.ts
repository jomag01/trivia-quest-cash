// Feed warm-up prefetcher - silently loads feed in background on app open
// Ensures instant load when user navigates to Feed tab

import { supabase } from "@/integrations/supabase/client";
import { apiCache } from "@/lib/performance/ApiCache";

const PREFETCH_COUNT = 8;
const CACHE_TTL = 60000; // 1 minute
const CACHE_KEY_PREFIX = "feed:prefetch";

let prefetchPromise: Promise<void> | null = null;
let hasPrefetched = false;

export interface PrefetchedPost {
  id: string;
  user_id: string;
  content: string | null;
  media_url: string | null;
  media_type: "image" | "video" | "audio";
  thumbnail_url?: string | null;
  created_at: string;
}

// Warm up feed - call on app init
export async function warmUpFeed(): Promise<void> {
  if (hasPrefetched || prefetchPromise) return prefetchPromise || Promise.resolve();
  
  prefetchPromise = (async () => {
    try {
      // Fetch latest posts in background
      const { data: posts, error } = await supabase
        .from("posts")
        .select("id, user_id, content, media_url, media_type, thumbnail_url, created_at")
        .order("created_at", { ascending: false })
        .limit(PREFETCH_COUNT);
      
      if (error) throw error;
      
      // Filter large base64 and cache
      const cleanPosts = (posts || []).map(p => ({
        ...p,
        media_url: p.media_url?.startsWith('data:') && p.media_url.length > 500000 
          ? null 
          : p.media_url
      }));
      
      // Store in cache for instant access
      apiCache.set(`${CACHE_KEY_PREFIX}:for-you`, cleanPosts, CACHE_TTL);
      hasPrefetched = true;
      
      console.log("[FeedPrefetch] Warmed up feed with", cleanPosts.length, "posts");
    } catch (err) {
      console.error("[FeedPrefetch] Warm-up failed:", err);
    } finally {
      prefetchPromise = null;
    }
  })();
  
  return prefetchPromise;
}

// Get prefetched posts if available
export function getPrefetchedPosts(): PrefetchedPost[] | null {
  return apiCache.get(`${CACHE_KEY_PREFIX}:for-you`) as PrefetchedPost[] | null;
}

// Check if feed is warm
export function isFeedWarm(): boolean {
  return hasPrefetched && apiCache.has(`${CACHE_KEY_PREFIX}:for-you`);
}

// Reset prefetch state (for testing/refresh)
export function resetPrefetch(): void {
  hasPrefetched = false;
  prefetchPromise = null;
  apiCache.delete(`${CACHE_KEY_PREFIX}:for-you`);
}
