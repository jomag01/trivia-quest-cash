import { useRef, useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Story {
  id: string;
  user_id: string;
  username: string;
  avatar_url?: string;
  has_unseen: boolean;
  is_live?: boolean;
}

interface StorySliderProps {
  onStoryClick?: (story: Story) => void;
  onAddStory?: () => void;
}

export default function StorySlider({ onStoryClick, onAddStory }: StorySliderProps) {
  const { user, profile } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [stories, setStories] = useState<Story[]>([]);

  useEffect(() => {
    loadStories();
  }, []);

  const loadStories = async () => {
    // Load recent posters as "stories"
    const { data: recentPosts } = await supabase
      .from("posts")
      .select("user_id")
      .order("created_at", { ascending: false })
      .limit(20);

    if (!recentPosts) return;

    const uniqueUserIds = [...new Set(recentPosts.map(p => p.user_id))].slice(0, 15);
    
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", uniqueUserIds);

    if (profiles) {
      const storiesData: Story[] = profiles.map(p => ({
        id: p.id,
        user_id: p.id,
        username: p.full_name || "User",
        avatar_url: p.avatar_url,
        has_unseen: Math.random() > 0.5, // Mock unseen status
        is_live: Math.random() > 0.9 // Mock live status
      }));
      setStories(storiesData);
    }
  };

  return (
    <div className="border-b border-border bg-card">
      <div 
        ref={scrollRef}
        className="flex gap-3 p-4 overflow-x-auto scrollbar-hide"
      >
        {/* Add Story */}
        {user && (
          <button
            onClick={onAddStory}
            className="flex flex-col items-center gap-1 min-w-[70px]"
          >
            <div className="relative">
              <Avatar className="h-16 w-16 ring-2 ring-border">
                <AvatarImage src={(profile as any)?.avatar_url || ""} />
                <AvatarFallback className="bg-secondary text-lg">
                  {profile?.full_name?.[0] || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center ring-2 ring-background">
                <Plus className="w-4 h-4" />
              </div>
            </div>
            <span className="text-xs text-center truncate w-16">Your story</span>
          </button>
        )}

        {/* Stories */}
        {stories.map((story) => (
          <button
            key={story.id}
            onClick={() => onStoryClick?.(story)}
            className="flex flex-col items-center gap-1 min-w-[70px]"
          >
            <div className="relative">
              <div className={`p-0.5 rounded-full ${
                story.is_live 
                  ? 'bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500 animate-pulse' 
                  : story.has_unseen 
                    ? 'bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500' 
                    : 'bg-border'
              }`}>
                <Avatar className="h-14 w-14 ring-2 ring-background">
                  <AvatarImage src={story.avatar_url || ""} />
                  <AvatarFallback className="bg-secondary text-sm">
                    {story.username[0]}
                  </AvatarFallback>
                </Avatar>
              </div>
              {story.is_live && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-destructive text-[10px] text-white font-bold rounded">
                  LIVE
                </span>
              )}
            </div>
            <span className="text-xs text-center truncate w-16 text-muted-foreground">
              {story.username.split(" ")[0]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
