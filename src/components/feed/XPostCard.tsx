import { useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  MessageCircle, Repeat2, Heart, BarChart3, Bookmark, Share, 
  MoreHorizontal, BadgeCheck, Play, Pause, Volume2, VolumeX
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

interface XPostCardProps {
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
      is_verified?: boolean;
    };
  };
  onCommentsClick?: () => void;
  onDelete?: () => void;
}

function formatCount(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return num.toString();
}

export default function XPostCard({ post, onCommentsClick, onDelete }: XPostCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [liked, setLiked] = useState(false);
  const [reposted, setReposted] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [repostsCount, setRepostsCount] = useState(post.shares_count || 0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  const handleLike = async () => {
    if (!user) {
      toast.error("Please sign in to like");
      return;
    }

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

  const handleRepost = async () => {
    if (!user) {
      toast.error("Please sign in to repost");
      return;
    }

    if (reposted) {
      setReposted(false);
      setRepostsCount(prev => prev - 1);
    } else {
      setReposted(true);
      setRepostsCount(prev => prev + 1);
      await supabase.from("post_shares").insert({
        post_id: post.id,
        user_id: user.id
      });
      toast.success("Reposted!");
    }
  };

  const handleShare = async () => {
    const shareUrl = user 
      ? `${window.location.origin}/?post=${post.id}&ref=${user.id}`
      : `${window.location.origin}/?post=${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ 
          title: `${post.profiles?.full_name || 'Someone'} on Triviabees`,
          text: post.content?.substring(0, 100) || 'Check out this post on Triviabees!',
          url: shareUrl 
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied!");
      }
    } catch {
      // User cancelled share
    }
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

  const username = post.profiles?.full_name || post.profiles?.email?.split('@')[0] || "user";
  const handle = `@${username.toLowerCase().replace(/\s+/g, '')}`;
  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: false })
    .replace('about ', '')
    .replace(' minutes', 'm')
    .replace(' minute', 'm')
    .replace(' hours', 'h')
    .replace(' hour', 'h')
    .replace(' days', 'd')
    .replace(' day', 'd');

  // Parse hashtags and mentions in content
  const renderContent = (text: string) => {
    const parts = text.split(/(#\w+|@\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('#')) {
        return <span key={i} className="text-primary hover:underline cursor-pointer">{part}</span>;
      }
      if (part.startsWith('@')) {
        return <span key={i} className="text-primary hover:underline cursor-pointer">{part}</span>;
      }
      return part;
    });
  };

  // Render media grid (1-4 images like X)
  const renderMedia = () => {
    if (!post.media_url) return null;

    if (post.media_type === "image") {
      return (
        <div className="mt-3 rounded-2xl overflow-hidden border border-border">
          <img 
            src={post.media_url} 
            alt="" 
            className="w-full max-h-[512px] object-cover"
            loading="lazy"
          />
        </div>
      );
    }

    if (post.media_type === "video") {
      return (
        <div className="mt-3 rounded-2xl overflow-hidden border border-border relative">
          <video
            ref={videoRef}
            src={post.media_url}
            poster={post.thumbnail_url || undefined}
            className="w-full max-h-[512px] object-cover"
            loop
            muted={isMuted}
            playsInline
            onClick={toggleVideo}
          />
          {!isPlaying && (
            <button
              onClick={toggleVideo}
              className="absolute inset-0 flex items-center justify-center bg-black/20"
            >
              <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center">
                <Play className="w-7 h-7 text-primary-foreground ml-1" fill="currentColor" />
              </div>
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
            className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-background/80 flex items-center justify-center"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      );
    }

    if (post.media_type === "audio") {
      return (
        <div className="mt-3 p-4 rounded-2xl bg-muted/50 border border-border">
          <audio src={post.media_url} controls className="w-full" />
        </div>
      );
    }

    return null;
  };

  return (
    <article className="flex gap-3 px-4 py-3 border-b border-border hover:bg-muted/30 transition-colors cursor-pointer">
      {/* Avatar */}
      <button onClick={() => navigate(`/profile/${post.user_id}`)} className="flex-shrink-0">
        <Avatar className="h-10 w-10">
          <AvatarImage src={post.profiles?.avatar_url || ""} />
          <AvatarFallback className="bg-muted text-muted-foreground font-semibold">
            {username[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 min-w-0">
            <button 
              onClick={() => navigate(`/profile/${post.user_id}`)}
              className="font-bold text-[15px] hover:underline truncate"
            >
              {username}
            </button>
            {post.profiles?.is_verified && (
              <BadgeCheck className="w-4 h-4 text-primary flex-shrink-0" fill="currentColor" />
            )}
            <span className="text-muted-foreground text-[15px] truncate">{handle}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground text-[15px] hover:underline">{timeAgo}</span>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary -mr-2">
                <MoreHorizontal className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={handleShare}>Copy link</DropdownMenuItem>
              {user?.id === post.user_id && (
                <DropdownMenuItem onClick={onDelete} className="text-destructive">Delete</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Post content */}
        {post.content && (
          <p className="text-[15px] leading-normal mt-0.5 whitespace-pre-wrap break-words">
            {renderContent(post.content)}
          </p>
        )}

        {/* Media */}
        {renderMedia()}

        {/* Action bar */}
        <div className="flex items-center justify-between mt-3 -ml-2 max-w-md">
          {/* Reply */}
          <button 
            onClick={(e) => { e.stopPropagation(); onCommentsClick?.(); }}
            className="flex items-center gap-1 text-muted-foreground hover:text-primary group"
          >
            <div className="p-2 rounded-full group-hover:bg-primary/10">
              <MessageCircle className="w-[18px] h-[18px]" />
            </div>
            {post.comments_count > 0 && (
              <span className="text-[13px]">{formatCount(post.comments_count)}</span>
            )}
          </button>

          {/* Repost */}
          <button 
            onClick={(e) => { e.stopPropagation(); handleRepost(); }}
            className={`flex items-center gap-1 group ${reposted ? 'text-green-500' : 'text-muted-foreground hover:text-green-500'}`}
          >
            <div className="p-2 rounded-full group-hover:bg-green-500/10">
              <Repeat2 className="w-[18px] h-[18px]" />
            </div>
            {repostsCount > 0 && (
              <span className="text-[13px]">{formatCount(repostsCount)}</span>
            )}
          </button>

          {/* Like */}
          <button 
            onClick={(e) => { e.stopPropagation(); handleLike(); }}
            className={`flex items-center gap-1 group ${liked ? 'text-pink-500' : 'text-muted-foreground hover:text-pink-500'}`}
          >
            <div className="p-2 rounded-full group-hover:bg-pink-500/10">
              <Heart className={`w-[18px] h-[18px] ${liked ? 'fill-current' : ''}`} />
            </div>
            {likesCount > 0 && (
              <span className="text-[13px]">{formatCount(likesCount)}</span>
            )}
          </button>

          {/* Views */}
          <button className="flex items-center gap-1 text-muted-foreground hover:text-primary group">
            <div className="p-2 rounded-full group-hover:bg-primary/10">
              <BarChart3 className="w-[18px] h-[18px]" />
            </div>
            {post.views_count > 0 && (
              <span className="text-[13px]">{formatCount(post.views_count)}</span>
            )}
          </button>

          {/* Bookmark & Share */}
          <div className="flex items-center">
            <button 
              onClick={(e) => { e.stopPropagation(); setBookmarked(!bookmarked); }}
              className={`p-2 rounded-full hover:bg-primary/10 ${bookmarked ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
            >
              <Bookmark className={`w-[18px] h-[18px] ${bookmarked ? 'fill-current' : ''}`} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); handleShare(); }}
              className="p-2 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
            >
              <Share className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
