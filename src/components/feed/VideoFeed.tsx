import { useState, useRef, useEffect, useCallback } from "react";
import { 
  Heart, MessageCircle, Share2, Bookmark, Music2, 
  Play, Pause, Volume2, VolumeX, UserPlus, ChevronUp, ChevronDown
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface VideoPost {
  id: string;
  user_id: string;
  content: string | null;
  media_url: string;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  created_at: string;
  profiles?: {
    full_name: string | null;
    avatar_url?: string | null;
  };
}

interface VideoFeedProps {
  videos: VideoPost[];
  onClose?: () => void;
}

export default function VideoFeed({ videos, onClose }: VideoFeedProps) {
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const currentVideo = videos[currentIndex];

  useEffect(() => {
    // Play current video, pause others
    videoRefs.current.forEach((video, index) => {
      if (video) {
        if (index === currentIndex) {
          video.play().catch(() => {});
          video.muted = isMuted;
        } else {
          video.pause();
          video.currentTime = 0;
        }
      }
    });
  }, [currentIndex, isMuted]);

  const handleScroll = useCallback((direction: 'up' | 'down') => {
    if (direction === 'down' && currentIndex < videos.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else if (direction === 'up' && currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex, videos.length]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    
    const touchEnd = e.changedTouches[0].clientY;
    const diff = touchStart - touchEnd;

    if (Math.abs(diff) > 50) {
      handleScroll(diff > 0 ? 'down' : 'up');
    }
    setTouchStart(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaY) > 50) {
      handleScroll(e.deltaY > 0 ? 'down' : 'up');
    }
  };

  const handleLike = async (postId: string) => {
    if (!user) {
      toast.error("Please sign in");
      return;
    }

    const newLiked = new Set(likedPosts);
    if (newLiked.has(postId)) {
      newLiked.delete(postId);
      await supabase.from("post_likes").delete()
        .eq("post_id", postId)
        .eq("user_id", user.id);
    } else {
      newLiked.add(postId);
      await supabase.from("post_likes").insert({
        post_id: postId,
        user_id: user.id
      });
    }
    setLikedPosts(newLiked);
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/?video=${currentVideo?.id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied!");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const togglePlayPause = () => {
    const video = videoRefs.current[currentIndex];
    if (video) {
      if (isPlaying) {
        video.pause();
      } else {
        video.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  if (!currentVideo) return null;

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 bg-black z-50"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white"
      >
        ✕
      </button>

      {/* Video container */}
      <div className="relative h-full">
        {videos.map((video, index) => (
          <div
            key={video.id}
            className={`absolute inset-0 transition-transform duration-300 ${
              index === currentIndex ? 'translate-y-0' : 
              index < currentIndex ? '-translate-y-full' : 'translate-y-full'
            }`}
          >
            <video
              ref={el => videoRefs.current[index] = el}
              src={video.media_url}
              className="w-full h-full object-contain bg-black"
              loop
              playsInline
              onClick={togglePlayPause}
            />

            {/* Overlay content */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Play/Pause indicator */}
              {!isPlaying && index === currentIndex && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-black/50 flex items-center justify-center">
                    <Play className="w-10 h-10 text-white ml-1" />
                  </div>
                </div>
              )}

              {/* Bottom info */}
              <div className="absolute bottom-20 left-0 right-16 p-4 pointer-events-auto">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="h-12 w-12 ring-2 ring-white">
                    <AvatarImage src={video.profiles?.avatar_url || ""} />
                    <AvatarFallback className="bg-gradient-to-br from-pink-500 to-purple-500 text-white">
                      {video.profiles?.full_name?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-bold text-white text-shadow">
                      {video.profiles?.full_name || "Anonymous"}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-full border-white text-white hover:bg-white hover:text-black"
                  >
                    <UserPlus className="w-4 h-4 mr-1" />
                    Follow
                  </Button>
                </div>

                {video.content && (
                  <p className="text-white text-sm text-shadow line-clamp-3 mb-2">
                    {video.content}
                  </p>
                )}

                {/* Music info */}
                <div className="flex items-center gap-2">
                  <Music2 className="w-4 h-4 text-white" />
                  <div className="flex-1 overflow-hidden">
                    <p className="text-white text-xs truncate animate-pulse">
                      ♪ Original Sound - {video.profiles?.full_name}
                    </p>
                  </div>
                </div>
              </div>

              {/* Right side actions */}
              <div className="absolute right-2 bottom-32 flex flex-col items-center gap-4 pointer-events-auto">
                <button
                  onClick={() => handleLike(video.id)}
                  className="flex flex-col items-center gap-1"
                >
                  <div className={`w-12 h-12 rounded-full bg-black/30 flex items-center justify-center ${
                    likedPosts.has(video.id) ? 'text-pink-500' : 'text-white'
                  }`}>
                    <Heart className={`w-7 h-7 ${likedPosts.has(video.id) ? 'fill-current' : ''}`} />
                  </div>
                  <span className="text-white text-xs font-semibold">
                    {(video.likes_count + (likedPosts.has(video.id) ? 1 : 0)).toLocaleString()}
                  </span>
                </button>

                <button className="flex flex-col items-center gap-1">
                  <div className="w-12 h-12 rounded-full bg-black/30 flex items-center justify-center text-white">
                    <MessageCircle className="w-7 h-7" />
                  </div>
                  <span className="text-white text-xs font-semibold">
                    {video.comments_count.toLocaleString()}
                  </span>
                </button>

                <button onClick={handleShare} className="flex flex-col items-center gap-1">
                  <div className="w-12 h-12 rounded-full bg-black/30 flex items-center justify-center text-white">
                    <Share2 className="w-7 h-7" />
                  </div>
                  <span className="text-white text-xs font-semibold">Share</span>
                </button>

                <button
                  onClick={() => {
                    const newSaved = new Set(savedPosts);
                    if (newSaved.has(video.id)) {
                      newSaved.delete(video.id);
                    } else {
                      newSaved.add(video.id);
                    }
                    setSavedPosts(newSaved);
                  }}
                  className="flex flex-col items-center gap-1"
                >
                  <div className={`w-12 h-12 rounded-full bg-black/30 flex items-center justify-center ${
                    savedPosts.has(video.id) ? 'text-yellow-400' : 'text-white'
                  }`}>
                    <Bookmark className={`w-7 h-7 ${savedPosts.has(video.id) ? 'fill-current' : ''}`} />
                  </div>
                  <span className="text-white text-xs font-semibold">Save</span>
                </button>

                {/* Mute button */}
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="w-10 h-10 rounded-full bg-black/30 flex items-center justify-center text-white">
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </div>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation indicators */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
        <button
          onClick={() => handleScroll('up')}
          disabled={currentIndex === 0}
          className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white disabled:opacity-30"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
        <button
          onClick={() => handleScroll('down')}
          disabled={currentIndex === videos.length - 1}
          className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white disabled:opacity-30"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      </div>

      {/* Progress dots */}
      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col gap-1">
        {videos.slice(0, 10).map((_, index) => (
          <div
            key={index}
            className={`w-1 h-4 rounded-full transition-all ${
              index === currentIndex ? 'bg-white h-6' : 'bg-white/30'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
