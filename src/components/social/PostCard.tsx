import { useState, useEffect } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Heart, MessageCircle, Trash2, Eye, Share2, Smile, Laugh, Frown, ThumbsUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [reactions, setReactions] = useState<{[key: string]: number}>({});
  const [userReaction, setUserReaction] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      checkLikeStatus();
      recordView();
      loadReactions();
    }
  }, [user]);

  const checkLikeStatus = async () => {
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
    } else {
      await supabase.from("post_likes").insert({ post_id: post.id, user_id: user.id });
      setLiked(true);
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
    const { data: commentsData } = await supabase
      .from("post_comments")
      .select("id, content, created_at, user_id")
      .eq("post_id", post.id)
      .order("created_at", { ascending: false });

    if (commentsData) {
      const userIds = [...new Set(commentsData.map(c => c.user_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      const commentsWithProfiles = commentsData.map(comment => ({
        ...comment,
        profiles: profilesData?.find(p => p.id === comment.user_id)
      }));

      setComments(commentsWithProfiles as any);
    }
  };

  const handleComment = async () => {
    if (!user) {
      toast.error("Please log in to comment");
      return;
    }
    if (!newComment.trim()) return;

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
  };

  const toggleComments = () => {
    setShowComments(!showComments);
    if (!showComments && comments.length === 0) {
      loadComments();
    }
  };

  const loadReactions = async () => {
    const { data } = await supabase
      .from("post_reactions")
      .select("reaction_type, user_id")
      .eq("post_id", post.id);

    if (data) {
      const reactionCounts: {[key: string]: number} = {};
      data.forEach(r => {
        reactionCounts[r.reaction_type] = (reactionCounts[r.reaction_type] || 0) + 1;
        if (r.user_id === user?.id) {
          setUserReaction(r.reaction_type);
        }
      });
      setReactions(reactionCounts);
    }
  };

  const handleReaction = async (reactionType: string) => {
    if (!user) {
      toast.error("Please login to react");
      return;
    }

    try {
      if (userReaction === reactionType) {
        await supabase
          .from("post_reactions")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", user.id)
          .eq("reaction_type", reactionType);
        setUserReaction(null);
      } else {
        if (userReaction) {
          await supabase
            .from("post_reactions")
            .delete()
            .eq("post_id", post.id)
            .eq("user_id", user.id);
        }
        await supabase
          .from("post_reactions")
          .insert({
            post_id: post.id,
            user_id: user.id,
            reaction_type: reactionType
          });
        setUserReaction(reactionType);
      }
      loadReactions();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleShare = async () => {
    if (!user) {
      toast.error("Please login to share");
      return;
    }

    try {
      await supabase
        .from("post_shares")
        .insert({
          post_id: post.id,
          user_id: user.id
        });
      
      const shareUrl = `${window.location.origin}/feed?post=${post.id}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Post link copied to clipboard!");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const getReactionIcon = (type: string) => {
    switch(type) {
      case 'like': return <ThumbsUp className="w-4 h-4" />;
      case 'love': return <Heart className="w-4 h-4" />;
      case 'laugh': return <Laugh className="w-4 h-4" />;
      case 'angry': return <Frown className="w-4 h-4" />;
      case 'sad': return <Frown className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback>
                {post.profiles?.full_name?.charAt(0) || post.profiles?.email?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{post.profiles?.full_name || post.profiles?.email || "Unknown User"}</p>
              <p className="text-xs text-muted-foreground">{new Date(post.created_at).toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Eye className="w-4 h-4" />
              {post.views_count}
            </div>
            {user?.id === post.user_id && (
              <Button variant="ghost" size="icon" onClick={handleDelete}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
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
      
      <CardFooter className="flex flex-col gap-4">
        <div className="flex gap-2 w-full">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm">
                <Smile className="w-4 h-4 mr-2" />
                {userReaction ? getReactionIcon(userReaction) : "React"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2">
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => handleReaction('like')}>
                  <ThumbsUp className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleReaction('love')}>
                  <Heart className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleReaction('laugh')}>
                  <Laugh className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleReaction('angry')}>
                  <Frown className="w-5 h-5" />
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          <Button variant="ghost" size="sm" onClick={toggleComments}>
            <MessageCircle className="w-4 h-4 mr-2" />
            {post.comments_count}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-2" />
            {post.shares_count || 0}
          </Button>
        </div>
        
        {Object.keys(reactions).length > 0 && (
          <div className="flex gap-3 text-sm text-muted-foreground w-full">
            {Object.entries(reactions).map(([type, count]) => (
              <div key={type} className="flex items-center gap-1">
                {getReactionIcon(type)}
                <span>{count}</span>
              </div>
            ))}
          </div>
        )}

        {showComments && (
          <div className="w-full space-y-3 border-t pt-3">
            <div className="flex gap-2">
              <Textarea
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[60px]"
              />
              <Button onClick={handleComment}>Post</Button>
            </div>
            
            <div className="space-y-2">
              {comments.map((comment) => (
                <div key={comment.id} className="bg-muted p-3 rounded-lg">
                  <p className="font-semibold text-sm">
                    {comment.profiles?.full_name || "Anonymous"}
                  </p>
                  <p className="text-sm">{comment.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(comment.created_at).toLocaleString()}
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