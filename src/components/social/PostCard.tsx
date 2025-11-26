import { useState, useEffect } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Heart, MessageCircle, Trash2, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";

interface Post {
  id: string;
  user_id: string;
  content: string | null;
  media_url: string | null;
  media_type: "image" | "video" | "audio";
  likes_count: number;
  comments_count: number;
  views_count: number;
  created_at: string;
  profiles?: {
    full_name: string | null;
  };
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  profiles?: {
    full_name: string | null;
  };
}

export const PostCard = ({ post, onDelete }: { post: Post; onDelete: () => void }) => {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [localLikesCount, setLocalLikesCount] = useState(post.likes_count);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    checkIfLiked();
    recordView();
  }, [post.id]);

  const checkIfLiked = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("post_likes")
      .select("id")
      .eq("post_id", post.id)
      .eq("user_id", user.id)
      .single();
    setLiked(!!data);
  };

  const recordView = async () => {
    await supabase.from("post_views").insert({
      post_id: post.id,
      user_id: user?.id || null,
    });
  };

  const handleLike = async () => {
    if (!user) {
      toast.error("Please log in to like posts");
      return;
    }

    if (liked) {
      await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
      setLiked(false);
      setLocalLikesCount((prev) => prev - 1);
    } else {
      await supabase.from("post_likes").insert({ post_id: post.id, user_id: user.id });
      setLiked(true);
      setLocalLikesCount((prev) => prev + 1);
    }
  };

  const handleDelete = async () => {
    if (!user || user.id !== post.user_id) return;
    
    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    if (error) {
      toast.error("Failed to delete post");
    } else {
      toast.success("Post deleted");
      onDelete();
    }
  };

  const loadComments = async () => {
    const { data } = await supabase
      .from("post_comments")
      .select(`
        id,
        content,
        created_at,
        profiles:user_id (full_name)
      `)
      .eq("post_id", post.id)
      .order("created_at", { ascending: false });

    if (data) setComments(data as any);
  };

  const handleComment = async () => {
    if (!user) {
      toast.error("Please log in to comment");
      return;
    }
    if (!newComment.trim()) return;

    setSubmittingComment(true);
    const { error } = await supabase.from("post_comments").insert({
      post_id: post.id,
      user_id: user.id,
      content: newComment,
    });

    if (error) {
      toast.error("Failed to post comment");
    } else {
      setNewComment("");
      loadComments();
    }
    setSubmittingComment(false);
  };

  const toggleComments = () => {
    if (!showComments) {
      loadComments();
    }
    setShowComments(!showComments);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <p className="font-semibold">{post.profiles?.full_name || "Anonymous"}</p>
            <p className="text-sm text-muted-foreground">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </p>
          </div>
          {user && user.id === post.user_id && (
            <Button variant="ghost" size="icon" onClick={handleDelete}>
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {post.content && <p>{post.content}</p>}
        
        {post.media_url && post.media_type === "image" && (
          <img src={post.media_url} alt="Post" className="w-full rounded-lg" />
        )}
        {post.media_url && post.media_type === "video" && (
          <video src={post.media_url} controls className="w-full rounded-lg" />
        )}
        {post.media_url && post.media_type === "audio" && (
          <audio src={post.media_url} controls className="w-full" />
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-3">
        <div className="flex justify-between w-full text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            {post.views_count}
          </span>
          <span>{localLikesCount} likes</span>
          <span>{post.comments_count} comments</span>
        </div>
        
        <div className="flex gap-2 w-full">
          <Button
            variant={liked ? "default" : "outline"}
            size="sm"
            onClick={handleLike}
            className="flex-1"
          >
            <Heart className={`w-4 h-4 mr-2 ${liked ? "fill-current" : ""}`} />
            Like
          </Button>
          <Button variant="outline" size="sm" onClick={toggleComments} className="flex-1">
            <MessageCircle className="w-4 h-4 mr-2" />
            Comment
          </Button>
        </div>

        {showComments && (
          <div className="w-full space-y-3 border-t pt-3">
            <div className="flex gap-2">
              <Textarea
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[60px]"
              />
              <Button onClick={handleComment} disabled={submittingComment}>
                Post
              </Button>
            </div>
            
            <div className="space-y-2">
              {comments.map((comment) => (
                <div key={comment.id} className="bg-muted p-3 rounded-lg">
                  <p className="font-semibold text-sm">
                    {comment.profiles?.full_name || "Anonymous"}
                  </p>
                  <p className="text-sm">{comment.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardFooter>
    </Card>
  );
};
