import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from "react-router-dom";
import FeedTopNav from "@/components/feed/FeedTopNav";
import FeedTabs from "@/components/feed/FeedTabs";
import FeedCard from "@/components/feed/FeedCard";
import StorySlider from "@/components/feed/StorySlider";
import FloatingActions from "@/components/feed/FloatingActions";
import CommentsSheet from "@/components/feed/CommentsSheet";
import LiveFeedGrid from "@/components/feed/LiveFeedGrid";
import ShopFeedGrid from "@/components/feed/ShopFeedGrid";
import GamesCategoryGrid from "@/components/feed/GamesCategoryGrid";
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
    const { data: postsData } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (postsData) {
      const enriched = await enrichPostsWithProfiles(postsData);
      setPosts(enriched);
    }
    setLoading(false);
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
    const userIds = [...new Set(postsData.map(p => p.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url")
      .in("id", userIds);

    return postsData.map(post => ({
      ...post,
      profiles: profiles?.find(p => p.id === post.user_id)
    }));
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
        <>
          <StorySlider />
          <div className="max-w-lg mx-auto">
            {loading ? (
              <div className="space-y-4 p-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-96 bg-muted rounded-xl animate-pulse" />
                ))}
              </div>
            ) : currentPosts.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <p>{activeTab === "following" ? "Follow users to see their posts" : "No posts yet"}</p>
              </div>
            ) : (
              currentPosts.map(post => (
                <FeedCard
                  key={post.id}
                  post={post}
                  onCommentsClick={() => setCommentsPostId(post.id)}
                  onDelete={loadPosts}
                />
              ))
            )}
          </div>
        </>
      ) : activeTab === "live" ? (
        <LiveFeedGrid onSelectStream={setWatchingStream} />
      ) : activeTab === "shop" ? (
        <ShopFeedGrid />
      ) : activeTab === "games" ? (
        <GamesCategoryGrid />
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
