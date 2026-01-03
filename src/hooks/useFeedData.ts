// Ultra-optimized feed data hook for 100M+ concurrent users
// Features: cursor-based pagination, caching, prefetching, deferred engagement

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { apiCache, withCache } from "@/lib/performance/ApiCache";

const INITIAL_LOAD_COUNT = 8; // Small initial batch for fast FCP
const PAGE_SIZE = 15; // Subsequent batches
const CACHE_TTL = 30000; // 30 seconds cache
const PREFETCH_THRESHOLD = 3; // Prefetch when 3 items from end

export interface FeedPost {
  id: string;
  user_id: string;
  content: string | null;
  media_url: string | null;
  media_type: "image" | "video" | "audio";
  thumbnail_url?: string | null;
  created_at: string;
  // Engagement counts - loaded separately
  likes_count?: number;
  comments_count?: number;
  views_count?: number;
  shares_count?: number;
  // Profile - loaded separately
  profiles?: {
    full_name: string | null;
    email: string | null;
    avatar_url?: string | null;
    is_verified?: boolean;
  };
}

interface FeedState {
  posts: FeedPost[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
}

// Minimal select for fast initial load - text first, defer rest
const FAST_SELECT = "id, user_id, content, media_url, media_type, thumbnail_url, created_at";
const ENGAGEMENT_SELECT = "id, likes_count, comments_count, views_count, shares_count";

export function useFeedData(feedType: "for-you" | "following", userId?: string) {
  const [state, setState] = useState<FeedState>({
    posts: [],
    loading: true,
    loadingMore: false,
    hasMore: true,
    error: null
  });

  const cursorRef = useRef<string | null>(null);
  const profileCacheRef = useRef<Map<string, FeedPost["profiles"]>>(new Map());
  const engagementLoadedRef = useRef<Set<string>>(new Set());
  const isMountedRef = useRef(true);

  // Load initial posts - optimized for speed
  const loadInitialPosts = useCallback(async () => {
    const cacheKey = `feed:${feedType}:${userId || "anon"}:initial`;
    
    try {
      const posts = await withCache(
        cacheKey,
        async () => {
          let query = supabase
            .from("posts")
            .select(FAST_SELECT)
            .order("created_at", { ascending: false })
            .limit(INITIAL_LOAD_COUNT);

          if (feedType === "following" && userId) {
            // Get following IDs first
            const { data: follows } = await supabase
              .from("user_follows")
              .select("following_id")
              .eq("follower_id", userId);

            const followingIds = follows?.map(f => f.following_id) || [];
            if (followingIds.length === 0) return [];

            query = query.in("user_id", followingIds);
          }

          const { data, error } = await query;
          if (error) throw error;

          // Filter large base64 media
          return (data || []).map(p => ({
            ...p,
            media_url: p.media_url?.startsWith('data:') && p.media_url.length > 500000 
              ? null 
              : p.media_url,
            // Default engagement counts - will be updated
            likes_count: 0,
            comments_count: 0,
            views_count: 0,
            shares_count: 0
          })) as FeedPost[];
        },
        CACHE_TTL
      );

      if (!isMountedRef.current) return;

      setState(prev => ({
        ...prev,
        posts,
        loading: false,
        hasMore: posts.length >= INITIAL_LOAD_COUNT
      }));

      // Set cursor for pagination
      if (posts.length > 0) {
        cursorRef.current = posts[posts.length - 1].created_at;
      }

      // Defer profile and engagement loading
      if (posts.length > 0) {
        requestIdleCallback(() => {
          loadProfilesForPosts(posts);
          loadEngagementForPosts(posts);
        });
      }
    } catch (error) {
      console.error("Feed load error:", error);
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: "Failed to load feed"
        }));
      }
    }
  }, [feedType, userId]);

  // Load more posts (infinite scroll)
  const loadMore = useCallback(async () => {
    if (state.loadingMore || !state.hasMore || !cursorRef.current) return;

    setState(prev => ({ ...prev, loadingMore: true }));

    try {
      let query = supabase
        .from("posts")
        .select(FAST_SELECT)
        .order("created_at", { ascending: false })
        .lt("created_at", cursorRef.current)
        .limit(PAGE_SIZE);

      if (feedType === "following" && userId) {
        const { data: follows } = await supabase
          .from("user_follows")
          .select("following_id")
          .eq("follower_id", userId);

        const followingIds = follows?.map(f => f.following_id) || [];
        if (followingIds.length === 0) {
          setState(prev => ({ ...prev, loadingMore: false, hasMore: false }));
          return;
        }
        query = query.in("user_id", followingIds);
      }

      const { data, error } = await query;
      if (error) throw error;

      const newPosts = (data || []).map(p => ({
        ...p,
        media_url: p.media_url?.startsWith('data:') && p.media_url.length > 500000 
          ? null 
          : p.media_url,
        likes_count: 0,
        comments_count: 0,
        views_count: 0,
        shares_count: 0
      })) as FeedPost[];

      if (!isMountedRef.current) return;

      setState(prev => ({
        ...prev,
        posts: [...prev.posts, ...newPosts],
        loadingMore: false,
        hasMore: newPosts.length >= PAGE_SIZE
      }));

      if (newPosts.length > 0) {
        cursorRef.current = newPosts[newPosts.length - 1].created_at;
        
        // Defer profile and engagement loading
        requestIdleCallback(() => {
          loadProfilesForPosts(newPosts);
          loadEngagementForPosts(newPosts);
        });
      }
    } catch (error) {
      console.error("Load more error:", error);
      if (isMountedRef.current) {
        setState(prev => ({ ...prev, loadingMore: false }));
      }
    }
  }, [feedType, userId, state.loadingMore, state.hasMore]);

  // Batch load profiles for posts
  const loadProfilesForPosts = useCallback(async (posts: FeedPost[]) => {
    const userIds = [...new Set(posts.map(p => p.user_id))];
    const uncachedIds = userIds.filter(id => !profileCacheRef.current.has(id));

    if (uncachedIds.length === 0) {
      // All cached - apply to posts
      setState(prev => ({
        ...prev,
        posts: prev.posts.map(p => ({
          ...p,
          profiles: p.profiles || profileCacheRef.current.get(p.user_id)
        }))
      }));
      return;
    }

    try {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url, is_verified")
        .in("id", uncachedIds);

      // Cache profiles
      profiles?.forEach(p => {
        profileCacheRef.current.set(p.id, {
          full_name: p.full_name,
          email: p.email,
          avatar_url: p.avatar_url,
          is_verified: (p as any).is_verified
        });
      });

      if (!isMountedRef.current) return;

      // Update posts with profiles
      setState(prev => ({
        ...prev,
        posts: prev.posts.map(p => ({
          ...p,
          profiles: profileCacheRef.current.get(p.user_id) || p.profiles
        }))
      }));
    } catch (error) {
      console.error("Profile load error:", error);
    }
  }, []);

  // Batch load engagement counts
  const loadEngagementForPosts = useCallback(async (posts: FeedPost[]) => {
    const postIds = posts
      .map(p => p.id)
      .filter(id => !engagementLoadedRef.current.has(id));

    if (postIds.length === 0) return;

    try {
      const { data: engagement } = await supabase
        .from("posts")
        .select(ENGAGEMENT_SELECT)
        .in("id", postIds);

      if (!engagement || !isMountedRef.current) return;

      const engagementMap = new Map(engagement.map(e => [e.id, e]));
      postIds.forEach(id => engagementLoadedRef.current.add(id));

      setState(prev => ({
        ...prev,
        posts: prev.posts.map(p => {
          const eng = engagementMap.get(p.id);
          return eng ? { ...p, ...eng } : p;
        })
      }));
    } catch (error) {
      console.error("Engagement load error:", error);
    }
  }, []);

  // Refresh feed
  const refresh = useCallback(async () => {
    cursorRef.current = null;
    engagementLoadedRef.current.clear();
    apiCache.clearPattern(`feed:${feedType}`);
    setState({ posts: [], loading: true, loadingMore: false, hasMore: true, error: null });
    await loadInitialPosts();
  }, [feedType, loadInitialPosts]);

  // Initial load
  useEffect(() => {
    isMountedRef.current = true;
    loadInitialPosts();

    return () => {
      isMountedRef.current = false;
    };
  }, [loadInitialPosts]);

  // Prefetch next batch when near end
  const checkPrefetch = useCallback((visibleIndex: number) => {
    if (
      visibleIndex >= state.posts.length - PREFETCH_THRESHOLD &&
      !state.loadingMore &&
      state.hasMore
    ) {
      loadMore();
    }
  }, [state.posts.length, state.loadingMore, state.hasMore, loadMore]);

  return {
    ...state,
    loadMore,
    refresh,
    checkPrefetch
  };
}
