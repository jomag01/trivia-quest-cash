import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Music, Heart, MessageCircle, Share2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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
  reactions_count?: number;
  comments_count?: number;
  shares_count?: number;
  profiles?: {
    full_name: string | null;
    avatar_url?: string | null;
  };
}

interface StoryComment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
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
  const { user } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [hasReacted, setHasReacted] = useState(false);
  const [reactionsCount, setReactionsCount] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<StoryComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);

  useEffect(() => {
    if (open && userId) {
      loadUserStories();
    }
  }, [open, userId]);

  useEffect(() => {
    if (!open || stories.length === 0) return;

    const currentStory = stories[currentIndex];
    if (currentStory) {
      checkReactionStatus(currentStory.id);
      loadComments(currentStory.id);
      setReactionsCount(currentStory.reactions_count || 0);
    }
  }, [currentIndex, stories, open]);

  useEffect(() => {
    if (!open || stories.length === 0 || showComments) return;

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
  }, [open, currentIndex, stories, showComments]);

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

  const checkReactionStatus = async (storyId: string) => {
    if (!user) return;
    
    const { data } = await supabase
      .from("story_reactions")
      .select("id")
      .eq("story_id", storyId)
      .eq("user_id", user.id)
      .maybeSingle();

    setHasReacted(!!data);
  };

  const loadComments = async (storyId: string) => {
    const { data: commentsData } = await supabase
      .from("story_comments")
      .select("*")
      .eq("story_id", storyId)
      .order("created_at", { ascending: true });

    if (commentsData && commentsData.length > 0) {
      // Fetch profiles for all comment authors
      const userIds = [...new Set(commentsData.map(c => c.user_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      const commentsWithProfiles = commentsData.map(comment => ({
        ...comment,
        profiles: profilesMap.get(comment.user_id) || { full_name: null, avatar_url: null }
      }));

      setComments(commentsWithProfiles as StoryComment[]);
    } else {
      setComments([]);
    }
  };

  const handleReaction = async () => {
    if (!user) {
      toast.error("Please login to react");
      return;
    }

    const currentStory = stories[currentIndex];
    if (!currentStory) return;

    try {
      if (hasReacted) {
        await supabase
          .from("story_reactions")
          .delete()
          .eq("story_id", currentStory.id)
          .eq("user_id", user.id);
        
        setHasReacted(false);
        setReactionsCount(prev => Math.max(0, prev - 1));
      } else {
        await supabase
          .from("story_reactions")
          .insert({
            story_id: currentStory.id,
            user_id: user.id,
            reaction_type: "heart"
          });
        
        setHasReacted(true);
        setReactionsCount(prev => prev + 1);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to react");
    }
  };

  const handleShare = async () => {
    if (!user) {
      toast.error("Please login to share");
      return;
    }

    const currentStory = stories[currentIndex];
    if (!currentStory) return;

    try {
      await supabase
        .from("story_shares")
        .insert({
          story_id: currentStory.id,
          user_id: user.id
        });

      const shareUrl = `${window.location.origin}/feed?story=${currentStory.id}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Story link copied!");
    } catch (error: any) {
      toast.error(error.message || "Failed to share");
    }
  };

  const handleSendComment = async () => {
    if (!user) {
      toast.error("Please login to comment");
      return;
    }

    if (!newComment.trim()) return;

    const currentStory = stories[currentIndex];
    if (!currentStory) return;

    setSendingComment(true);
    try {
      const { error } = await supabase
        .from("story_comments")
        .insert({
          story_id: currentStory.id,
          user_id: user.id,
          content: newComment.trim()
        });

      if (error) throw error;

      setNewComment("");
      loadComments(currentStory.id);
      toast.success("Comment added!");
    } catch (error: any) {
      toast.error(error.message || "Failed to add comment");
    } finally {
      setSendingComment(false);
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
      <DialogContent className="max-w-md p-0 bg-black border-none h-[85vh] max-h-[750px]">
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
                  <div className="absolute bottom-20 left-4 right-4 bg-black/60 backdrop-blur-sm rounded-lg p-3 flex items-center gap-3 z-10">
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

          {/* Reactions sidebar */}
          <div className="absolute right-4 bottom-24 flex flex-col gap-4 z-20">
            <button 
              onClick={handleReaction}
              className="flex flex-col items-center gap-1"
            >
              <div className={`p-2 rounded-full ${hasReacted ? 'bg-red-500' : 'bg-white/20'}`}>
                <Heart className={`w-6 h-6 ${hasReacted ? 'text-white fill-white' : 'text-white'}`} />
              </div>
              <span className="text-white text-xs">{reactionsCount}</span>
            </button>
            
            <button 
              onClick={() => setShowComments(!showComments)}
              className="flex flex-col items-center gap-1"
            >
              <div className="p-2 rounded-full bg-white/20">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <span className="text-white text-xs">{comments.length}</span>
            </button>
            
            <button 
              onClick={handleShare}
              className="flex flex-col items-center gap-1"
            >
              <div className="p-2 rounded-full bg-white/20">
                <Share2 className="w-6 h-6 text-white" />
              </div>
            </button>
          </div>

          {/* Comments panel */}
          {showComments && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/90 backdrop-blur-sm max-h-[50%] z-30 rounded-t-2xl">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold">Comments</h3>
                  <button onClick={() => setShowComments(false)}>
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
                
                <div className="max-h-[200px] overflow-y-auto space-y-3 mb-4">
                  {comments.length === 0 ? (
                    <p className="text-white/60 text-center text-sm py-4">No comments yet</p>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={comment.profiles?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {comment.profiles?.full_name?.[0] || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-white text-sm">
                            <span className="font-semibold">{comment.profiles?.full_name || "User"}</span>
                            {" "}{comment.content}
                          </p>
                          <p className="text-white/40 text-xs">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Input
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    onKeyDown={(e) => e.key === "Enter" && handleSendComment()}
                  />
                  <Button 
                    size="icon" 
                    onClick={handleSendComment}
                    disabled={sendingComment || !newComment.trim()}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

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