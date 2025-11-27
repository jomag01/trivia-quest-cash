import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PostCard } from "@/components/social/PostCard";
import { Loader2, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  };
}

const Feed = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [followingPosts, setFollowingPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("foryou");

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    loadPosts();
    loadFollowingPosts();
  }, [user, navigate]);

  const loadPosts = async () => {
    setLoading(true);
    const { data: postsData, error } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading posts:", error);
      setLoading(false);
      return;
    }

    await enrichPostsWithProfiles(postsData, setPosts);
    setLoading(false);
  };

  const loadFollowingPosts = async () => {
    if (!user) return;

    // Get users that current user follows
    const { data: followingData } = await supabase
      .from("user_follows")
      .select("following_id")
      .eq("follower_id", user.id);

    const followingIds = followingData?.map(f => f.following_id) || [];

    if (followingIds.length === 0) {
      setFollowingPosts([]);
      return;
    }

    const { data: postsData, error } = await supabase
      .from("posts")
      .select("*")
      .in("user_id", followingIds)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading following posts:", error);
      return;
    }

    await enrichPostsWithProfiles(postsData, setFollowingPosts);
  };

  const enrichPostsWithProfiles = async (postsData: any[], setter: (posts: Post[]) => void) => {
    const userIds = [...new Set(postsData?.map(post => post.user_id) || [])];
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, full_name, email, followers_count, following_count")
      .in("id", userIds);

    const postsWithProfiles = postsData?.map(post => ({
      ...post,
      profiles: profilesData?.find(p => p.id === post.user_id)
    })) || [];

    setter(postsWithProfiles as any);
  };

  if (!user) return null;

  const renderPosts = (postsList: Post[]) => {
    if (loading) {
      return (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      );
    }

    if (postsList.length === 0) {
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

  return (
    <div className="min-h-screen pb-20">
      {/* Top Tabs */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start rounded-none bg-transparent h-14 px-4">
            <TabsTrigger value="following" className="gap-2">
              <Users className="w-4 h-4" />
              Following
            </TabsTrigger>
            <TabsTrigger value="foryou">For You</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="space-y-6">
          {activeTab === "following" && renderPosts(followingPosts)}
          {activeTab === "foryou" && renderPosts(posts)}
        </div>
      </div>
    </div>
  );
};

export default Feed;
