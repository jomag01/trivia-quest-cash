import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CreatePost } from "@/components/social/CreatePost";
import { PostCard } from "@/components/social/PostCard";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    loadPosts();
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

    // Fetch profiles for all unique user_ids
    const userIds = [...new Set(postsData?.map(post => post.user_id) || [])];
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);

    // Merge profile data with posts
    const postsWithProfiles = postsData?.map(post => ({
      ...post,
      profiles: profilesData?.find(p => p.id === post.user_id)
    })) || [];

    setPosts(postsWithProfiles as any);
    setLoading(false);
  };

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="space-y-6">
        <CreatePost onPostCreated={loadPosts} />

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No posts yet. Be the first to share something!
          </div>
        ) : (
          posts.map((post) => (
            <PostCard key={post.id} post={post} onDelete={loadPosts} />
          ))
        )}
      </div>
    </div>
  );
};

export default Feed;
