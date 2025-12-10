import { useRef, useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AddStoryDialog from "./AddStoryDialog";
import ViewStoryDialog from "./ViewStoryDialog";

interface StoryUser {
  id: string;
  user_id: string;
  username: string;
  avatar_url?: string;
  has_stories: boolean;
  story_count: number;
}

export default function StorySlider() {
  const { user, profile } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [storyUsers, setStoryUsers] = useState<StoryUser[]>([]);
  const [showAddStory, setShowAddStory] = useState(false);
  const [viewingStory, setViewingStory] = useState<StoryUser | null>(null);
  const [hasOwnStory, setHasOwnStory] = useState(false);

  useEffect(() => {
    loadStories();
  }, [user]);

  const loadStories = async () => {
    // Get all active stories grouped by user
    const { data: storiesData } = await supabase
      .from("stories")
      .select("user_id")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (!storiesData || storiesData.length === 0) {
      setStoryUsers([]);
      setHasOwnStory(false);
      return;
    }

    // Count stories per user
    const userStoryCounts: Record<string, number> = {};
    storiesData.forEach(s => {
      userStoryCounts[s.user_id] = (userStoryCounts[s.user_id] || 0) + 1;
    });

    const uniqueUserIds = Object.keys(userStoryCounts);
    
    // Check if current user has stories
    if (user) {
      setHasOwnStory(uniqueUserIds.includes(user.id));
    }

    // Fetch profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", uniqueUserIds);

    if (profiles) {
      const storyUsersData: StoryUser[] = profiles
        .filter(p => p.id !== user?.id) // Exclude current user from list
        .map(p => ({
          id: p.id,
          user_id: p.id,
          username: p.full_name || "User",
          avatar_url: p.avatar_url,
          has_stories: true,
          story_count: userStoryCounts[p.id] || 0
        }));
      setStoryUsers(storyUsersData);
    }
  };

  const handleStoryAdded = () => {
    loadStories();
    setHasOwnStory(true);
  };

  return (
    <>
      <div className="border-b border-border bg-card">
        <div 
          ref={scrollRef}
          className="flex gap-3 p-4 overflow-x-auto scrollbar-hide"
        >
          {/* Add/View Own Story */}
          {user && (
            <button
              onClick={() => hasOwnStory 
                ? setViewingStory({
                    id: user.id,
                    user_id: user.id,
                    username: profile?.full_name || "You",
                    avatar_url: (profile as any)?.avatar_url,
                    has_stories: true,
                    story_count: 1
                  })
                : setShowAddStory(true)
              }
              className="flex flex-col items-center gap-1 min-w-[70px]"
            >
              <div className="relative">
                <div className={`p-0.5 rounded-full ${hasOwnStory ? 'bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500' : ''}`}>
                  <Avatar className={`h-14 w-14 ring-2 ${hasOwnStory ? 'ring-background' : 'ring-border'}`}>
                    <AvatarImage src={(profile as any)?.avatar_url || ""} />
                    <AvatarFallback className="bg-secondary text-lg">
                      {profile?.full_name?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                </div>
                {!hasOwnStory && (
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center ring-2 ring-background">
                    <Plus className="w-4 h-4" />
                  </div>
                )}
              </div>
              <span className="text-xs text-center truncate w-16">
                {hasOwnStory ? "Your story" : "Add story"}
              </span>
            </button>
          )}

          {/* Other Users' Stories */}
          {storyUsers.map((storyUser) => (
            <button
              key={storyUser.id}
              onClick={() => setViewingStory(storyUser)}
              className="flex flex-col items-center gap-1 min-w-[70px]"
            >
              <div className="relative">
                <div className="p-0.5 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500">
                  <Avatar className="h-14 w-14 ring-2 ring-background">
                    <AvatarImage src={storyUser.avatar_url || ""} />
                    <AvatarFallback className="bg-secondary text-sm">
                      {storyUser.username[0]}
                    </AvatarFallback>
                  </Avatar>
                </div>
                {storyUser.story_count > 1 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {storyUser.story_count}
                  </span>
                )}
              </div>
              <span className="text-xs text-center truncate w-16 text-muted-foreground">
                {storyUser.username.split(" ")[0]}
              </span>
            </button>
          ))}
        </div>
      </div>

      <AddStoryDialog 
        open={showAddStory} 
        onOpenChange={setShowAddStory}
        onStoryAdded={handleStoryAdded}
      />

      {viewingStory && (
        <ViewStoryDialog
          open={!!viewingStory}
          onOpenChange={(open) => !open && setViewingStory(null)}
          userId={viewingStory.user_id}
          username={viewingStory.username}
          avatarUrl={viewingStory.avatar_url}
        />
      )}
    </>
  );
}
