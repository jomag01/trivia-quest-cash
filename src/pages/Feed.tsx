import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from "react-router-dom";
import FeedTopNav from "@/components/feed/FeedTopNav";
import FeedTabs from "@/components/feed/FeedTabs";
import XPostCard from "@/components/feed/XPostCard";
import FloatingActions from "@/components/feed/FloatingActions";
import CommentsSheet from "@/components/feed/CommentsSheet";
import LiveFeedGrid from "@/components/feed/LiveFeedGrid";
import ShopFeedGrid from "@/components/feed/ShopFeedGrid";
import GamingHome from "@/components/feed/GamingHome";
import VideoFeed from "@/components/feed/VideoFeed";
import GoLiveDialog from "@/components/live/GoLiveDialog";
import IVSViewerView from "@/components/live/IVSViewerView";
import IVSBroadcasterView from "@/components/live/IVSBroadcasterView";
import FloatingLiveStream from "@/components/live/FloatingLiveStream";

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

export default function Feed() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [posts, setPosts] = useState<Post[]>([]);
  const [followingPosts, setFollowingPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("for-you");
  const [showGoLiveDialog, setShowGoLiveDialog] = useState(false);
  const [currentStreamId, setCurrentStreamId] = useState<string | null>(null);
  const [watchingStream, setWatchingStream] = useState<any>(null);
  const [minimizedStream, setMinimizedStream] = useState<any>(null);
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const [showVideoFeed, setShowVideoFeed] = useState(false);

  useEffect(() => {
    loadPosts();
    if (user) {
      loadFollowingPosts();
    }
    
    const liveStreamId = searchParams.get('live');
    if (liveStreamId) {
      loadStreamFromUrl(liveStreamId);
    }

    // Subscribe to new posts for real-time updates
    const channel = supabase
      .channel('posts-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'posts'
      }, async (payload) => {
        // Enrich the new post with profile data and add to the top
        const newPost = payload.new as any;
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, full_name, email, avatar_url")
          .eq("id", newPost.user_id)
          .single();
        
        const enrichedPost = { ...newPost, profiles: profile };
        setPosts(prev => [enrichedPost, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, searchParams]);

  const loadStreamFromUrl = async (streamId: string) => {
    const { data } = await supabase
      .from("live_streams")
      .select("*")
      .eq("id", streamId)
      .eq("status", "live")
      .maybeSingle();
    
    if (data) {
      setWatchingStream(data);
    }
  };

  const loadPosts = async () => {
    setLoading(true);
    try {
      // Fetch posts with explicit columns to avoid timeout from huge media_url base64 data
      const { data: postsData, error } = await supabase
        .from("posts")
        .select("id, user_id, content, media_type, thumbnail_url, likes_count, comments_count, views_count, shares_count, created_at")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error loading posts:", error);
        setPosts([]);
      } else if (postsData && postsData.length > 0) {
        // Now fetch media_url separately only for posts that need it, filtering out base64
        const postsWithMedia = await Promise.all(
          postsData.map(async (post) => {
            // Check if media exists and fetch it
            const { data: mediaData } = await supabase
              .from("posts")
              .select("media_url")
              .eq("id", post.id)
              .single();
            
            let media_url = mediaData?.media_url || null;
            
            // Skip overly large base64 data (> 500KB) to prevent performance issues
            if (media_url?.startsWith('data:') && media_url.length > 500000) {
              media_url = null;
            }
            
            return { ...post, media_url };
          })
        );
        
        const enriched = await enrichPostsWithProfiles(postsWithMedia);
        setPosts(enriched);
      } else {
        setPosts([]);
      }
    } catch (error) {
      console.error("Error loading posts:", error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadFollowingPosts = async () => {
    if (!user) return;
    
    const { data: follows } = await supabase
      .from("user_follows")
      .select("following_id")
      .eq("follower_id", user.id);

    const followingIds = follows?.map(f => f.following_id) || [];
    if (followingIds.length === 0) {
      setFollowingPosts([]);
      return;
    }

    const { data: postsData } = await supabase
      .from("posts")
      .select("*")
      .in("user_id", followingIds)
      .order("created_at", { ascending: false });

    if (postsData) {
      const enriched = await enrichPostsWithProfiles(postsData);
      setFollowingPosts(enriched);
    }
  };

  const enrichPostsWithProfiles = async (postsData: any[]): Promise<Post[]> => {
    if (!postsData?.length) return [];
    
    try {
      const userIds = [...new Set(postsData.map(p => p.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .in("id", userIds);

      return postsData.map(post => {
        // Skip posts with huge base64 media URLs (causes performance issues)
        const mediaUrl = post.media_url;
        const isBase64 = mediaUrl?.startsWith('data:');
        const isTooLarge = isBase64 && mediaUrl.length > 500000; // 500KB limit

        return {
          ...post,
          media_url: isTooLarge ? null : mediaUrl, // Clear overly large media
          profiles: profiles?.find(p => p.id === post.user_id)
        };
      });
    } catch (error) {
      console.error("Error enriching posts:", error);
      return postsData;
    }
  };

  const videoPosts = posts.filter(p => p.media_type === "video" && p.media_url);

  // Show broadcaster view
  if (currentStreamId) {
    return <IVSBroadcasterView streamId={currentStreamId} onEndStream={() => setCurrentStreamId(null)} />;
  }

  // Show viewer
  if (watchingStream) {
    return (
      <IVSViewerView 
        stream={watchingStream} 
        onClose={() => setWatchingStream(null)} 
        onMinimize={() => {
          setMinimizedStream(watchingStream);
          setWatchingStream(null);
        }}
      />
    );
  }

  // Video feed
  if (showVideoFeed && videoPosts.length > 0) {
    return <VideoFeed videos={videoPosts} onClose={() => setShowVideoFeed(false)} />;
  }

  const currentPosts = activeTab === "following" ? followingPosts : posts;

  return (
    <div className="min-h-screen bg-background pb-20">
      <FeedTopNav />
      <FeedTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === "for-you" || activeTab === "following" ? (
        <div className="max-w-xl mx-auto border-x border-border min-h-screen">
          {loading ? (
            <div className="divide-y divide-border">
              {[1, 2, 3, 4, 5].map(i => (
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
              <div className="text-4xl mb-4">📝</div>
              <p className="text-lg font-medium">
                {activeTab === "following" ? "Follow users to see their posts" : "No posts yet"}
              </p>
              <p className="text-sm mt-1">Be the first to post something!</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {currentPosts.map(post => (
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
      ) : activeTab === "live" ? (
        <LiveFeedGrid onSelectStream={setWatchingStream} />
      ) : activeTab === "shop" ? (
        <ShopFeedGrid />
      ) : activeTab === "games" ? (
        <GamingHome />
      ) : activeTab === "discover" ? (
        <div className="p-4 text-center text-muted-foreground">Explore content coming soon</div>
      ) : null}

      <FloatingActions onGoLive={() => setShowGoLiveDialog(true)} />

      <CommentsSheet
        open={!!commentsPostId}
        onOpenChange={(open) => !open && setCommentsPostId(null)}
        postId={commentsPostId || ""}
      />

      <GoLiveDialog
        open={showGoLiveDialog}
        onOpenChange={setShowGoLiveDialog}
        onGoLive={(streamId) => setCurrentStreamId(streamId)}
      />

      {minimizedStream && (
        <FloatingLiveStream
          stream={minimizedStream}
          onExpand={() => {
            setWatchingStream(minimizedStream);
            setMinimizedStream(null);
          }}
          onClose={() => setMinimizedStream(null)}
        />
      )}
    </div>
  );
}
