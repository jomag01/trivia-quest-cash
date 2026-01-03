import { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import FeedTopNav from "@/components/feed/FeedTopNav";
import FeedTabs from "@/components/feed/FeedTabs";
import XPostCard from "@/components/feed/XPostCard";
import FloatingActions from "@/components/feed/FloatingActions";
import CommentsSheet from "@/components/feed/CommentsSheet";

interface Post {
  id: string;
  user_id: string;
  content: string | null;
  media_url: string | null;
  media_type: "image" | "video" | "audio";
  thumbnail_url?: string | null;
  likes_count: number;
  comments_count: number;
  views_count: number;
  shares_count: number;
  created_at: string;
  profiles?: {
    full_name: string | null;
    email: string | null;
    avatar_url?: string | null;
  };
}

// Include media_url in the query now - we'll handle large files properly
const POST_SELECT =
  "id, user_id, content, media_url, media_type, thumbnail_url, likes_count, comments_count, views_count, shares_count, created_at";

export default function Feed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [followingPosts, setFollowingPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingFollowing, setLoadingFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState("for-you");
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);

  useEffect(() => {
    loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user && activeTab === "following" && followingPosts.length === 0 && !loadingFollowing) {
      loadFollowingPosts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activeTab]);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("posts")
        .select(POST_SELECT)
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) {
        console.error("Error loading posts:", error);
        setPosts([]);
        return;
      }

      // Filter out posts with extremely large base64 media (>500KB) to avoid performance issues
      const sanitized = (data ?? []).map((p: any) => {
        if (p.media_url && p.media_url.startsWith('data:') && p.media_url.length > 500000) {
          return { ...p, media_url: null };
        }
        return p;
      }) as any[];

      const enriched = await enrichPostsWithProfiles(sanitized);
      setPosts(enriched);
    } catch (error) {
      console.error("Error loading posts:", error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadFollowingPosts = async () => {
    if (!user) return;

    setLoadingFollowing(true);
    try {
      const { data: follows, error: followsError } = await supabase
        .from("user_follows")
        .select("following_id")
        .eq("follower_id", user.id);

      if (followsError) {
        console.error("Error loading follows:", followsError);
        setFollowingPosts([]);
        return;
      }

      const followingIds = follows?.map((f: any) => f.following_id) || [];
      if (followingIds.length === 0) {
        setFollowingPosts([]);
        return;
      }

      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select(POST_SELECT)
        .in("user_id", followingIds)
        .order("created_at", { ascending: false })
        .limit(30);

      if (postsError) {
        console.error("Error loading following posts:", postsError);
        setFollowingPosts([]);
        return;
      }

      // Filter out posts with extremely large base64 media
      const sanitized = (postsData ?? []).map((p: any) => {
        if (p.media_url && p.media_url.startsWith('data:') && p.media_url.length > 500000) {
          return { ...p, media_url: null };
        }
        return p;
      }) as any[];

      const enriched = await enrichPostsWithProfiles(sanitized);
      setFollowingPosts(enriched);
    } catch (error) {
      console.error("Error loading following posts:", error);
      setFollowingPosts([]);
    } finally {
      setLoadingFollowing(false);
    }
  };

  const enrichPostsWithProfiles = async (postsData: any[]): Promise<Post[]> => {
    if (!postsData?.length) return [];

    try {
      const userIds = [...new Set(postsData.map((p) => p.user_id))];
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .in("id", userIds);

      if (error) {
        console.error("Error loading profiles:", error);
        return postsData;
      }

      return postsData.map((post) => ({
        ...post,
        profiles: profiles?.find((p) => p.id === post.user_id),
      }));
    } catch (error) {
      console.error("Error enriching posts:", error);
      return postsData;
    }
  };

  const currentPosts = useMemo(
    () => (activeTab === "following" ? followingPosts : posts),
    [activeTab, followingPosts, posts]
  );

  const isLoadingList = activeTab === "following" ? loadingFollowing : loading;

  return (
    <div className="min-h-screen bg-background pb-20">
      <FeedTopNav />
      <FeedTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="max-w-xl mx-auto border-x border-border min-h-screen">
        {isLoadingList ? (
          <div className="divide-y divide-border">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-3 p-4">
                <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/3 animate-pulse" />
                  <div className="h-4 bg-muted rounded w-full animate-pulse" />
                  <div className="h-4 bg-muted rounded w-2/3 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : currentPosts.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg font-medium">
              {activeTab === "following" ? "Follow users to see their posts" : "No posts yet"}
            </p>
            <p className="text-sm mt-1">Be the first to post something!</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {currentPosts.map((post) => (
              <XPostCard
                key={post.id}
                post={post}
                onCommentsClick={() => setCommentsPostId(post.id)}
                onDelete={loadPosts}
              />
            ))}
          </div>
        )}
      </div>

      <FloatingActions />

      <CommentsSheet
        open={!!commentsPostId}
        onOpenChange={(open) => !open && setCommentsPostId(null)}
        postId={commentsPostId || ""}
      />
    </div>
  );
}
