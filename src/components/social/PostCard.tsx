import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Heart, MessageCircle, Trash2, Eye, Share2, Smile, Laugh, Frown, ThumbsUp, UserPlus, UserCheck, Play, Pause, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { formatDistanceToNow } from "date-fns";
import { PostCardComments } from "./PostCardComments";
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
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fullscreenVideoRef = useRef<HTMLVideoElement>(null);
  const [liked, setLiked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [reactions, setReactions] = useState<{[key: string]: number}>({});
  const [userReaction, setUserReaction] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showFullscreenVideo, setShowFullscreenVideo] = useState(false);
  const [showFullscreenImage, setShowFullscreenImage] = useState(false);
  const [showInteractions, setShowInteractions] = useState(false);

  useEffect(() => {
    if (user) {
      checkLikeStatus();
      recordView();
      loadReactions();
      checkFollowStatus();
    }
  }, [user]);

  const checkFollowStatus = async () => {
    if (!user || user.id === post.user_id) return;

    const { data } = await supabase
      .from("user_follows")
      .select("id")
      .eq("follower_id", user.id)
      .eq("following_id", post.user_id)
      .single();

    setIsFollowing(!!data);
  };

  const handleFollow = async () => {
    if (!user || user.id === post.user_id) return;

    setFollowLoading(true);
    try {
      if (isFollowing) {
        const { error } = await supabase
          .from("user_follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", post.user_id);

        if (error) throw error;
        setIsFollowing(false);
        toast.success("Unfollowed user");
      } else {
        const { error } = await supabase
          .from("user_follows")
          .insert({
            follower_id: user.id,
            following_id: post.user_id,
          });

        if (error) throw error;
        setIsFollowing(true);
        toast.success("Following user");
      }
    } catch (error: any) {
      console.error("Error toggling follow:", error);
      toast.error(error.message || "Failed to update follow status");
    } finally {
      setFollowLoading(false);
    }
  };

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

  const toggleComments = () => {
    setShowComments(!showComments);
  };

  const toggleVideo = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const openFullscreenVideo = () => {
    setShowFullscreenVideo(true);
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleProfileClick = () => {
    navigate(`/profile/${post.user_id}`);
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
          <div className="flex items-center gap-3 cursor-pointer" onClick={handleProfileClick}>
            <Avatar>
              <AvatarFallback>
                {post.profiles?.full_name?.charAt(0) || post.profiles?.email?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold hover:text-primary transition-colors">{post.profiles?.full_name || post.profiles?.email || "Unknown User"}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })} • {post.views_count} views
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user && user.id !== post.user_id && (
              <Button
                variant={isFollowing ? "outline" : "default"}
                size="sm"
                onClick={handleFollow}
                disabled={followLoading}
              >
                {isFollowing ? (
                  <>
                    <UserCheck className="w-4 h-4 mr-1" />
                    Following
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-1" />
                    Follow
                  </>
                )}
              </Button>
            )}
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
          <div className="relative cursor-pointer" onClick={() => setShowFullscreenImage(true)}>
            <img src={post.media_url} alt="Post" className="w-full rounded-lg" />
          </div>
        )}
        {post.media_url && post.media_type === "video" && (
          <div className="relative">
            <div className="cursor-pointer" onClick={() => setShowInteractions(true)}>
              <video
                ref={videoRef}
                src={post.media_url}
                className="w-full rounded-lg"
                loop
                playsInline
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {!isPlaying && (
                  <div className="bg-black/50 rounded-full p-4">
                    <Play className="w-12 h-12 text-white" />
                  </div>
                )}
              </div>
            </div>
          </div>
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

        <PostCardComments postId={post.id} showComments={showComments} />
      </CardFooter>

      {/* Fullscreen Image Dialog */}
      <Dialog open={showFullscreenImage} onOpenChange={setShowFullscreenImage}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black border-none">
          <div className="relative w-full h-[95vh] flex items-center justify-center">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
              onClick={() => setShowFullscreenImage(false)}
            >
              <X className="w-6 h-6" />
            </Button>
            {post.media_url && (
              <img
                src={post.media_url}
                alt="Post"
                className="max-w-full max-h-full object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* TikTok-style Interactions Dialog */}
      <Dialog open={showInteractions} onOpenChange={setShowInteractions}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black border-none">
          <div className="relative w-full h-[95vh] flex">
            {/* Main Content Area */}
            <div className="flex-1 flex items-center justify-center">
              {post.media_url && post.media_type === "video" && (
                <video
                  src={post.media_url}
                  className="max-w-full max-h-full"
                  controls
                  autoPlay
                  loop
                  playsInline
                />
              )}
              {post.media_url && post.media_type === "image" && (
                <img
                  src={post.media_url}
                  alt="Post"
                  className="max-w-full max-h-full object-contain"
                />
              )}
            </div>

            {/* Right Sidebar with Interactions */}
            <div className="w-20 md:w-24 flex flex-col items-center justify-center gap-8 py-8 bg-black/50 backdrop-blur-sm">
              <Button
                variant="ghost"
                size="icon"
                className="w-16 h-16 rounded-full bg-white/10 hover:bg-white/20 flex flex-col gap-1"
                onClick={handleLike}
              >
                <Heart className={`w-8 h-8 ${liked ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                <span className="text-xs text-white">{post.likes_count}</span>
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="w-16 h-16 rounded-full bg-white/10 hover:bg-white/20 flex flex-col gap-1"
                onClick={toggleComments}
              >
                <MessageCircle className="w-8 h-8 text-white" />
                <span className="text-xs text-white">{post.comments_count}</span>
              </Button>

              {user && user.id !== post.user_id && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-16 h-16 rounded-full bg-white/10 hover:bg-white/20 flex flex-col gap-1"
                  onClick={handleFollow}
                  disabled={followLoading}
                >
                  {isFollowing ? (
                    <UserCheck className="w-8 h-8 text-white" />
                  ) : (
                    <UserPlus className="w-8 h-8 text-white" />
                  )}
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                className="w-16 h-16 rounded-full bg-white/10 hover:bg-white/20 flex flex-col gap-1"
                onClick={handleShare}
              >
                <Share2 className="w-8 h-8 text-white" />
                <span className="text-xs text-white">{post.shares_count || 0}</span>
              </Button>
            </div>

            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
              onClick={() => setShowInteractions(false)}
            >
              <X className="w-6 h-6" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fullscreen Video Dialog */}
      <Dialog open={showFullscreenVideo} onOpenChange={setShowFullscreenVideo}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black border-none">
          <div className="relative w-full h-[95vh] flex items-center justify-center">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
              onClick={() => setShowFullscreenVideo(false)}
            >
              <X className="w-6 h-6" />
            </Button>
            {post.media_url && (
              <video
                ref={fullscreenVideoRef}
                src={post.media_url}
                className="max-w-full max-h-full"
                controls
                autoPlay
                loop
                playsInline
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};