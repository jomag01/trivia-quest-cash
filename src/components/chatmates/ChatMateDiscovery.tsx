import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { 
  Heart, X, MessageCircle, Sparkles, MapPin, 
  Languages, Shield, RefreshCw, Zap, Star
} from "lucide-react";

interface MatchCandidate {
  id: string;
  user_id: string;
  profile: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    country: string | null;
    bio: string | null;
    trust_score: number;
  };
  interests: string[];
  personality: {
    communication_style: string;
    conversation_depth: string;
    looking_for: string[];
    languages: string[];
  };
  match_score: number;
  match_reason: string;
  icebreaker: string;
}

interface ChatMateDiscoveryProps {
  onMatch: () => void;
}

export function ChatMateDiscovery({ onMatch }: ChatMateDiscoveryProps) {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState<MatchCandidate[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [swiping, setSwiping] = useState(false);

  const fetchCandidates = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Get user's own interests
      const { data: userInterests } = await supabase
        .from("user_interests")
        .select("interest_tag")
        .eq("user_id", user.id);

      const myInterests = userInterests?.map(i => i.interest_tag) || [];

      // Get existing matches to exclude
      const { data: existingMatches } = await supabase
        .from("chat_matches")
        .select("user_a, user_b")
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);

      const excludedIds = new Set<string>();
      excludedIds.add(user.id);
      existingMatches?.forEach(m => {
        excludedIds.add(m.user_a);
        excludedIds.add(m.user_b);
      });

      // Get visible personality profiles
      const { data: profiles } = await supabase
        .from("user_personality_profiles")
        .select(`
          *,
          profiles:user_id (
            id,
            full_name,
            avatar_url,
            country,
            bio,
            trust_score,
            is_chat_enabled
          )
        `)
        .eq("is_visible", true)
        .not("user_id", "in", `(${Array.from(excludedIds).join(",")})`)
        .order("last_active_at", { ascending: false })
        .limit(20);

      if (!profiles || profiles.length === 0) {
        setCandidates([]);
        setLoading(false);
        return;
      }

      // Get interests for each candidate
      const userIds = profiles.map(p => p.user_id);
      const { data: allInterests } = await supabase
        .from("user_interests")
        .select("user_id, interest_tag")
        .in("user_id", userIds);

      const interestsByUser = new Map<string, string[]>();
      allInterests?.forEach(i => {
        const existing = interestsByUser.get(i.user_id) || [];
        existing.push(i.interest_tag);
        interestsByUser.set(i.user_id, existing);
      });

      // Calculate match scores
      const candidatesWithScores: MatchCandidate[] = profiles
        .filter(p => p.profiles && (p.profiles as any).is_chat_enabled !== false)
        .map(p => {
          const theirInterests = interestsByUser.get(p.user_id) || [];
          const commonInterests = myInterests.filter(i => theirInterests.includes(i));
          const interestScore = myInterests.length > 0 
            ? (commonInterests.length / myInterests.length) * 40 
            : 20;
          
          const trustScore = ((p.profiles as any).trust_score || 100) / 100 * 15;
          const activityScore = 15; // Could be based on last_active_at
          const personalityScore = 30; // Simplified

          const totalScore = Math.min(100, interestScore + trustScore + activityScore + personalityScore);

          const matchReason = commonInterests.length > 0
            ? `Shares ${commonInterests.length} interest${commonInterests.length > 1 ? 's' : ''}: ${commonInterests.slice(0, 3).join(", ")}`
            : `Active in ${(p.looking_for as string[] || ["chat"]).join(", ")}`;

          const icebreakers = [
            "What got you interested in that?",
            "What's the most interesting thing you've learned recently?",
            "What do you enjoy most about that hobby?",
            "How did you get started with that?",
            "What's your favorite thing to do on weekends?"
          ];

          return {
            id: p.id,
            user_id: p.user_id,
            profile: p.profiles as any,
            interests: theirInterests,
            personality: {
              communication_style: p.communication_style || "friendly",
              conversation_depth: p.conversation_depth || "casual",
              looking_for: (p.looking_for as string[]) || [],
              languages: (p.languages as string[]) || ["English"]
            },
            match_score: Math.round(totalScore),
            match_reason: matchReason,
            icebreaker: icebreakers[Math.floor(Math.random() * icebreakers.length)]
          };
        })
        .sort((a, b) => b.match_score - a.match_score);

      setCandidates(candidatesWithScores);
      setCurrentIndex(0);
    } catch (error) {
      console.error("Error fetching candidates:", error);
      toast.error("Failed to load matches");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  const handleSwipe = async (direction: "left" | "right") => {
    if (swiping || !candidates[currentIndex]) return;
    
    setSwiping(true);
    const candidate = candidates[currentIndex];
    const action = direction === "right" ? "liked" : "skipped";

    try {
      // Check if reverse match exists
      const { data: existingMatch } = await supabase
        .from("chat_matches")
        .select("*")
        .eq("user_a", candidate.user_id)
        .eq("user_b", user?.id)
        .single();

      if (existingMatch && direction === "right") {
        // It's a match! Create room and update
        const { data: room } = await supabase
          .from("chatmate_rooms")
          .insert({
            room_type: "private",
            participant_ids: [user?.id, candidate.user_id]
          })
          .select()
          .single();

        await supabase
          .from("chat_matches")
          .update({
            status: "accepted",
            user_b_action: "liked",
            room_id: room?.id
          })
          .eq("id", existingMatch.id);

        toast.success("It's a match! 🎉", {
          description: `You and ${candidate.profile.full_name || "someone"} liked each other!`
        });
        onMatch();
      } else {
        // Create new match record
        await supabase
          .from("chat_matches")
          .insert({
            user_a: user?.id,
            user_b: candidate.user_id,
            match_score: candidate.match_score,
            match_reason: candidate.match_reason,
            icebreaker_message: candidate.icebreaker,
            user_a_action: action,
            status: action === "skipped" ? "skipped" : "pending"
          });

        if (direction === "right") {
          toast("Liked!", { description: "We'll let you know if they like you back!" });
        }
      }

      // Move to next candidate
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
        setSwiping(false);
      }, 300);
    } catch (error) {
      console.error("Error processing swipe:", error);
      toast.error("Something went wrong");
      setSwiping(false);
    }
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = 100;
    if (info.offset.x > threshold) {
      handleSwipe("right");
    } else if (info.offset.x < -threshold) {
      handleSwipe("left");
    }
  };

  const currentCandidate = candidates[currentIndex];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-rose-400 to-purple-500 animate-pulse flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-white animate-spin" />
          </div>
          <p className="text-muted-foreground">Finding your perfect chat mates...</p>
        </div>
      </div>
    );
  }

  if (!currentCandidate) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-20 h-20 mx-auto rounded-full bg-muted flex items-center justify-center">
            <Heart className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold">No more profiles</h3>
          <p className="text-muted-foreground">
            You've seen everyone for now. Check back later or update your interests to find more matches!
          </p>
          <Button onClick={fetchCandidates} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="relative h-[65vh] sm:h-[70vh]">
        <AnimatePresence>
          <motion.div
            key={currentCandidate.id}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={handleDragEnd}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
          >
            <Card className="h-full overflow-hidden border-0 shadow-2xl bg-gradient-to-b from-background to-muted/30">
              <div className="relative h-2/3 bg-gradient-to-br from-rose-100 to-purple-100 dark:from-rose-900/30 dark:to-purple-900/30">
                <Avatar className="w-full h-full rounded-none">
                  <AvatarImage 
                    src={currentCandidate.profile.avatar_url || ""} 
                    className="object-cover"
                  />
                  <AvatarFallback className="w-full h-full rounded-none text-6xl bg-gradient-to-br from-rose-400 to-purple-500 text-white">
                    {(currentCandidate.profile.full_name || "?")[0]}
                  </AvatarFallback>
                </Avatar>

                {/* Match Score Badge */}
                <div className="absolute top-4 right-4">
                  <Badge className="bg-gradient-to-r from-rose-500 to-purple-600 text-white border-0 px-3 py-1.5 text-sm font-semibold shadow-lg">
                    <Zap className="w-3 h-3 mr-1" />
                    {currentCandidate.match_score}% Match
                  </Badge>
                </div>

                {/* Trust Badge */}
                {currentCandidate.profile.trust_score >= 80 && (
                  <div className="absolute top-4 left-4">
                    <Badge variant="secondary" className="bg-green-500/90 text-white border-0">
                      <Shield className="w-3 h-3 mr-1" />
                      Trusted
                    </Badge>
                  </div>
                )}

                {/* Gradient Overlay */}
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />
              </div>

              <CardContent className="p-4 space-y-3 -mt-8 relative z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold">
                      {currentCandidate.profile.full_name || "Anonymous"}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {currentCandidate.profile.country && (
                        <>
                          <MapPin className="w-3 h-3" />
                          <span>{currentCandidate.profile.country}</span>
                        </>
                      )}
                      {currentCandidate.personality.languages.length > 0 && (
                        <>
                          <Languages className="w-3 h-3 ml-2" />
                          <span>{currentCandidate.personality.languages[0]}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {currentCandidate.profile.bio && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {currentCandidate.profile.bio}
                  </p>
                )}

                {/* Interests */}
                <div className="flex flex-wrap gap-1.5">
                  {currentCandidate.interests.slice(0, 5).map((interest, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {interest}
                    </Badge>
                  ))}
                  {currentCandidate.interests.length > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{currentCandidate.interests.length - 5}
                    </Badge>
                  )}
                </div>

                {/* Match Reason */}
                <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                  <Star className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    {currentCandidate.match_reason}
                  </p>
                </div>

                {/* AI Icebreaker */}
                <div className="flex items-start gap-2 p-3 bg-gradient-to-r from-rose-50 to-purple-50 dark:from-rose-950/30 dark:to-purple-950/30 rounded-lg border border-rose-200/50 dark:border-rose-800/30">
                  <MessageCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">AI Suggested:</p>
                    <p className="text-sm font-medium">"{currentCandidate.icebreaker}"</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-6 mt-6">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => handleSwipe("left")}
          disabled={swiping}
          className="w-16 h-16 rounded-full bg-white dark:bg-muted shadow-lg flex items-center justify-center border-2 border-red-200 dark:border-red-800 hover:border-red-400 transition-colors disabled:opacity-50"
        >
          <X className="w-8 h-8 text-red-500" />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => handleSwipe("right")}
          disabled={swiping}
          className="w-20 h-20 rounded-full bg-gradient-to-r from-rose-500 to-purple-600 shadow-lg flex items-center justify-center hover:from-rose-600 hover:to-purple-700 transition-colors disabled:opacity-50"
        >
          <Heart className="w-10 h-10 text-white" />
        </motion.button>
      </div>

      {/* Progress indicator */}
      <div className="text-center mt-4 text-sm text-muted-foreground">
        {currentIndex + 1} of {candidates.length} profiles
      </div>
    </div>
  );
}
