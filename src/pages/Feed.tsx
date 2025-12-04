import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PostCard } from "@/components/social/PostCard";
import { Gamepad2, Users, ChevronDown, Video } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import GoLiveDialog from "@/components/live/GoLiveDialog";
import LiveStreamList from "@/components/live/LiveStreamList";
import LiveStreamViewer from "@/components/live/LiveStreamViewer";
import BroadcasterView from "@/components/live/BroadcasterView";

interface Post {
  id: string;
  user_id: string;
  content: string | null;
  media_url: string | null;
  media_type: "image" | "video" | "audio";
  likes_count: number;
  comments_count: number;
  views_count: number;
  shares_count: number;
  created_at: string;
  profiles?: {
    full_name: string | null;
    email: string | null;
    followers_count: number | null;
    following_count: number | null;
  };
}

interface GameCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
}

export default function Feed() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [followingPosts, setFollowingPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("for-you");
  const [categories, setCategories] = useState<GameCategory[]>([]);
  const [showGoLiveDialog, setShowGoLiveDialog] = useState(false);
  const [currentStreamId, setCurrentStreamId] = useState<string | null>(null);
  const [watchingStream, setWatchingStream] = useState<any>(null);

  useEffect(() => {
    loadCategories();
    loadPosts();
    if (user) {
      loadFollowingPosts();
    }
  }, [user]);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("game_categories")
        .select("id, name, slug, icon")
        .eq("is_active", true)
        .order("name");
      
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  };

  const loadPosts = async () => {
    try {
      setLoading(true);
      const { data: postsData, error } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Enrich posts with profile data
      const enrichedPosts = await enrichPostsWithProfiles(postsData || []);
      setPosts(enrichedPosts);
    } catch (error: any) {
      console.error("Error loading posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadFollowingPosts = async () => {
    if (!user) return;
    
    try {
      // Get users that current user follows
      const { data: followsData, error: followsError } = await supabase
        .from("user_follows")
        .select("following_id")
        .eq("follower_id", user.id);

      if (followsError) throw followsError;

      const followingIds = followsData?.map(f => f.following_id) || [];
      
      if (followingIds.length === 0) {
        setFollowingPosts([]);
        return;
      }

      // Get posts from followed users
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select("*")
        .in("user_id", followingIds)
        .order("created_at", { ascending: false });

      if (postsError) throw postsError;

      // Enrich with profile data
      const enrichedPosts = await enrichPostsWithProfiles(postsData || []);
      setFollowingPosts(enrichedPosts);
    } catch (error: any) {
      console.error("Error loading following posts:", error);
    }
  };

  const enrichPostsWithProfiles = async (postsData: any[]): Promise<Post[]> => {
    if (!postsData || postsData.length === 0) return [];

    const userIds = [...new Set(postsData.map((p) => p.user_id))];
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, full_name, email, followers_count, following_count")
      .in("id", userIds);

    return postsData.map((post) => ({
      ...post,
      profiles: profilesData?.find((p) => p.id === post.user_id),
    }));
  };

  const renderPosts = (postsList: Post[]) => {
    if (loading) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          Loading posts...
        </div>
      );
    }

    if (!postsList || postsList.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          {activeTab === "following" 
            ? "Follow users to see their posts here!"
            : "No posts yet. Be the first to share something!"}
        </div>
      );
    }

    return postsList.map((post) => (
      <PostCard key={post.id} post={post} onDelete={() => { loadPosts(); loadFollowingPosts(); }} />
    ));
  };

  // Show broadcaster view when streaming
  if (currentStreamId) {
    return <BroadcasterView streamId={currentStreamId} onEndStream={() => setCurrentStreamId(null)} />;
  }

  // Show viewer when watching a stream
  if (watchingStream) {
    return <LiveStreamViewer stream={watchingStream} onClose={() => setWatchingStream(null)} />;
  }

  return (
    <div className="min-h-screen pb-20 bg-white">
      {/* Top Tabs */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start rounded-none bg-transparent h-14 px-4">
            <TabsTrigger value="following" className="gap-2">
              <Users className="w-4 h-4" />
              Following
            </TabsTrigger>
            <TabsTrigger value="for-you">For You</TabsTrigger>
            <TabsTrigger value="live" className="gap-2">
              <Video className="w-4 h-4 text-red-500" />
              Live
            </TabsTrigger>
            
            {/* Game Categories Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 h-10">
                  <Gamepad2 className="w-4 h-4" />
                  Games
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 bg-background z-50">
                {categories.map((category) => (
                  <DropdownMenuItem
                    key={category.id}
                    onClick={() => navigate(`/game/${category.slug}`)}
                    className="gap-2 cursor-pointer"
                  >
                    <span className="text-lg">{category.icon}</span>
                    {category.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Go Live Button */}
            {user && (
              <Button 
                variant="destructive" 
                size="sm" 
                className="ml-auto gap-2"
                onClick={() => setShowGoLiveDialog(true)}
              >
                <Video className="w-4 h-4" />
                Go Live
              </Button>
            )}
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="space-y-6">
          {activeTab === "following" && renderPosts(followingPosts)}
          {activeTab === "for-you" && renderPosts(posts)}
          {activeTab === "live" && (
            <LiveStreamList onSelectStream={(stream) => setWatchingStream(stream)} />
          )}
        </div>
      </div>

      {/* Go Live Dialog */}
      <GoLiveDialog 
        open={showGoLiveDialog} 
        onOpenChange={setShowGoLiveDialog}
        onGoLive={(streamId) => setCurrentStreamId(streamId)}
      />
    </div>
  );
}