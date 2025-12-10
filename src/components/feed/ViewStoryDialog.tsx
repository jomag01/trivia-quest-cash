import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { X, Music } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface TextOverlay {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontWeight: string;
  fontStyle: string;
  textAlign: string;
}

interface EmojiOverlay {
  emoji: string;
  x: number;
  y: number;
  size: number;
}

interface StoryMetadata {
  textOverlays?: TextOverlay[];
  emojiOverlays?: EmojiOverlay[];
  musicTrack?: string | null;
}

interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  created_at: string;
  metadata?: StoryMetadata;
  profiles?: {
    full_name: string | null;
    avatar_url?: string | null;
  };
}

interface ViewStoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  username: string;
  avatarUrl?: string;
}

const MUSIC_TRACKS: Record<string, string> = {
  "1": "Happy Vibes",
  "2": "Chill Beats",
  "3": "Party Time",
  "4": "Emotional",
  "5": "Upbeat Energy"
};

export default function ViewStoryDialog({ 
  open, 
  onOpenChange, 
  userId,
  username,
  avatarUrl
}: ViewStoryDialogProps) {
  const [stories, setStories] = useState<Story[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (open && userId) {
      loadUserStories();
    }
  }, [open, userId]);

  useEffect(() => {
    if (!open || stories.length === 0) return;

    const duration = stories[currentIndex]?.media_type === "video" ? 15000 : 5000;
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          if (currentIndex < stories.length - 1) {
            setCurrentIndex(i => i + 1);
            return 0;
          } else {
            onOpenChange(false);
            return 100;
          }
        }
        return prev + (100 / (duration / 100));
      });
    }, 100);

    return () => clearInterval(interval);
  }, [open, currentIndex, stories]);

  const loadUserStories = async () => {
    const { data } = await supabase
      .from("stories")
      .select("*")
      .eq("user_id", userId)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: true });

    if (data) {
      setStories(data as Story[]);
      setCurrentIndex(0);
      setProgress(0);
    }
  };

  const goNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(i => i + 1);
      setProgress(0);
    } else {
      onOpenChange(false);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1);
      setProgress(0);
    }
  };

  const currentStory = stories[currentIndex];
  const metadata = currentStory?.metadata as StoryMetadata | undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 bg-black border-none h-[80vh] max-h-[700px]">
        <div className="relative h-full flex flex-col">
          {/* Progress bars */}
          <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-2">
            {stories.map((_, idx) => (
              <div key={idx} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white transition-all duration-100"
                  style={{ 
                    width: idx < currentIndex ? "100%" : idx === currentIndex ? `${progress}%` : "0%" 
                  }}
                />
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="absolute top-4 left-0 right-0 z-20 flex items-center justify-between px-4 pt-2">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 ring-2 ring-white">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback>{username[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-white font-medium text-sm">{username}</p>
                {currentStory && (
                  <p className="text-white/60 text-xs">
                    {formatDistanceToNow(new Date(currentStory.created_at), { addSuffix: true })}
                  </p>
                )}
              </div>
            </div>
            <button 
              onClick={() => onOpenChange(false)}
              className="text-white p-2"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Story content */}
          <div className="flex-1 flex items-center justify-center relative">
            {currentStory && (
              <>
                {currentStory.media_type === "video" ? (
                  <video 
                    src={currentStory.media_url} 
                    className="max-h-full max-w-full object-contain"
                    autoPlay
                    playsInline
                    muted
                  />
                ) : (
                  <img 
                    src={currentStory.media_url} 
                    alt="Story"
                    className="max-h-full max-w-full object-contain"
                  />
                )}

                {/* Text overlays */}
                {metadata?.textOverlays?.map((overlay, idx) => (
                  <div
                    key={idx}
                    className="absolute pointer-events-none"
                    style={{
                      left: `${overlay.x}%`,
                      top: `${overlay.y}%`,
                      transform: 'translate(-50%, -50%)',
                      fontSize: `${overlay.fontSize}px`,
                      color: overlay.color,
                      fontWeight: overlay.fontWeight,
                      fontStyle: overlay.fontStyle,
                      textAlign: overlay.textAlign as any,
                      textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                      zIndex: 10
                    }}
                  >
                    {overlay.text}
                  </div>
                ))}

                {/* Emoji overlays */}
                {metadata?.emojiOverlays?.map((overlay, idx) => (
                  <div
                    key={idx}
                    className="absolute pointer-events-none"
                    style={{
                      left: `${overlay.x}%`,
                      top: `${overlay.y}%`,
                      transform: 'translate(-50%, -50%)',
                      fontSize: `${overlay.size}px`,
                      zIndex: 10
                    }}
                  >
                    {overlay.emoji}
                  </div>
                ))}

                {/* Music indicator */}
                {metadata?.musicTrack && (
                  <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-sm rounded-lg p-3 flex items-center gap-3 z-10">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center animate-pulse">
                      <Music className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">{MUSIC_TRACKS[metadata.musicTrack] || "Music"}</p>
                      <p className="text-white/60 text-xs">Lovable Music</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Navigation areas */}
          <button 
            onClick={goPrev}
            className="absolute left-0 top-1/4 bottom-1/4 w-1/3 z-10"
          />
          <button 
            onClick={goNext}
            className="absolute right-0 top-1/4 bottom-1/4 w-1/3 z-10"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
