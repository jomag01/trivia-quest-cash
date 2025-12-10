import { useState, useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, 
  Play, Pause, Volume2, VolumeX, UserPlus, UserCheck,
  Send, ChevronDown, ChevronUp
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FeedCardProps {
  post: {
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
  };
  onCommentsClick?: () => void;
  onDelete?: () => void;
  variant?: "default" | "compact";
}

export default function FeedCard({ post, onCommentsClick, onDelete, variant = "default" }: FeedCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showFullCaption, setShowFullCaption] = useState(false);
  const [isLikeAnimating, setIsLikeAnimating] = useState(false);

  useEffect(() => {
    if (user) {
      checkInteractionStatus();
    }
  }, [user, post.id]);

  const checkInteractionStatus = async () => {
    if (!user) return;
    
    // Check like status
    const { data: likeData } = await supabase
      .from("post_likes")
      .select("id")
      .eq("post_id", post.id)
      .eq("user_id", user.id)
      .maybeSingle();
    setLiked(!!likeData);

    // Check follow status
    if (user.id !== post.user_id) {
      const { data: followData } = await supabase
        .from("user_follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("following_id", post.user_id)
        .maybeSingle();
      setIsFollowing(!!followData);
    }
  };

  const handleLike = async () => {
    if (!user) {
      toast.error("Please sign in to like posts");
      return;
    }

    setIsLikeAnimating(true);
    setTimeout(() => setIsLikeAnimating(false), 300);

    if (liked) {
      setLiked(false);
      setLikesCount(prev => prev - 1);
      await supabase.from("post_likes").delete()
        .eq("post_id", post.id)
        .eq("user_id", user.id);
    } else {
      setLiked(true);
      setLikesCount(prev => prev + 1);
      await supabase.from("post_likes").insert({
        post_id: post.id,
        user_id: user.id
      });
    }
  };

  const handleDoubleClick = () => {
    if (!liked && user) {
      handleLike();
    }
  };

  const handleFollow = async () => {
    if (!user) {
      toast.error("Please sign in to follow");
      return;
    }

    if (isFollowing) {
      setIsFollowing(false);
      await supabase.from("user_follows").delete()
        .eq("follower_id", user.id)
        .eq("following_id", post.user_id);
    } else {
      setIsFollowing(true);
      await supabase.from("user_follows").insert({
        follower_id: user.id,
        following_id: post.user_id
      });
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/?post=${post.id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied!");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const caption = post.content || "";
  const isLongCaption = caption.length > 100;

  return (
    <article className="bg-card border-b border-border animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(`/profile/${post.user_id}`)}
            className="relative"
          >
            <Avatar className="h-10 w-10 ring-2 ring-accent/20 ring-offset-2 ring-offset-background">
              <AvatarImage src={post.profiles?.avatar_url || ""} />
              <AvatarFallback className="bg-gradient-to-br from-accent to-purple-500 text-white text-sm">
                {post.profiles?.full_name?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
          </button>
          <div className="flex flex-col">
            <button 
              onClick={() => navigate(`/profile/${post.user_id}`)}
              className="font-semibold text-sm hover:text-accent transition-colors text-left"
            >
              {post.profiles?.full_name || "Anonymous"}
            </button>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {user && user.id !== post.user_id && (
            <Button
              variant={isFollowing ? "secondary" : "default"}
              size="sm"
              onClick={handleFollow}
              className="h-8 rounded-full text-xs font-semibold"
            >
              {isFollowing ? (
                <>
                  <UserCheck className="w-3.5 h-3.5 mr-1" />
                  Following
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5 mr-1" />
                  Follow
                </>
              )}
            </Button>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleShare}>Share</DropdownMenuItem>
              {user?.id === post.user_id && (
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Media */}
      {post.media_url && (
        <div 
          className="relative bg-secondary aspect-square sm:aspect-video max-h-[600px] overflow-hidden"
          onDoubleClick={handleDoubleClick}
        >
          {post.media_type === "image" ? (
            <img
              src={post.media_url}
              alt="Post"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : post.media_type === "video" ? (
            <>
              <video
                ref={videoRef}
                src={post.media_url}
                poster={post.thumbnail_url || undefined}
                className="w-full h-full object-cover"
                loop
                muted={isMuted}
                playsInline
                onClick={togglePlayPause}
              />
              {/* Video Controls Overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {!isPlaying && (
                  <div className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
                    <Play className="w-8 h-8 text-white ml-1" />
                  </div>
                )}
              </div>
              <button
                onClick={toggleMute}
                className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm"
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-white" />
                ) : (
                  <Volume2 className="w-4 h-4 text-white" />
                )}
              </button>
            </>
          ) : null}

          {/* Like Animation Overlay */}
          {isLikeAnimating && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Heart className="w-24 h-24 text-white fill-white animate-heart-beat drop-shadow-lg" />
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLike}
            className={`h-10 w-10 ${liked ? 'text-social-like' : ''}`}
          >
            <Heart className={`w-6 h-6 ${liked ? 'fill-current animate-heart-beat' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCommentsClick}
            className="h-10 w-10"
          >
            <MessageCircle className="w-6 h-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleShare}
            className="h-10 w-10"
          >
            <Send className="w-6 h-6 -rotate-45" />
          </Button>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSaved(!saved)}
          className={`h-10 w-10 ${saved ? 'text-social-save' : ''}`}
        >
          <Bookmark className={`w-6 h-6 ${saved ? 'fill-current' : ''}`} />
        </Button>
      </div>

      {/* Likes count */}
      <div className="px-3 pb-1">
        <p className="font-semibold text-sm">{likesCount.toLocaleString()} likes</p>
      </div>

      {/* Caption */}
      {caption && (
        <div className="px-3 pb-3">
          <p className="text-sm">
            <button 
              onClick={() => navigate(`/profile/${post.user_id}`)}
              className="font-semibold mr-1 hover:text-accent transition-colors"
            >
              {post.profiles?.full_name || "Anonymous"}
            </button>
            {isLongCaption && !showFullCaption ? (
              <>
                {caption.slice(0, 100)}...
                <button 
                  onClick={() => setShowFullCaption(true)}
                  className="text-muted-foreground ml-1"
                >
                  more
                </button>
              </>
            ) : (
              caption
            )}
          </p>
        </div>
      )}

      {/* Comments preview */}
      {post.comments_count > 0 && (
        <button 
          onClick={onCommentsClick}
          className="px-3 pb-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          View all {post.comments_count} comments
        </button>
      )}
    </article>
  );
}
