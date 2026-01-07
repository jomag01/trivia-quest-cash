import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import { 
  MessageCircle, Heart, Clock, Sparkles, 
  ChevronRight, Users, Zap
} from "lucide-react";

interface Match {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  match_score: number;
  status: string;
  room_id: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  icebreaker_message: string | null;
}

interface ChatMateConversationsProps {
  showOnlyMatches: boolean;
  onOpenChat: (roomId: string, userId: string) => void;
}

export function ChatMateConversations({ showOnlyMatches, onOpenChat }: ChatMateConversationsProps) {
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchMatches();
      
      // Subscribe to realtime updates
      const channel = supabase
        .channel("chat-matches")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "chat_matches",
            filter: `user_a=eq.${user.id}`,
          },
          () => fetchMatches()
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "chat_matches",
            filter: `user_b=eq.${user.id}`,
          },
          () => fetchMatches()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchMatches = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get matches where user is involved
      const { data: matchesData, error } = await supabase
        .from("chat_matches")
        .select(`
          id,
          user_a,
          user_b,
          match_score,
          status,
          room_id,
          icebreaker_message,
          created_at
        `)
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
        .in("status", showOnlyMatches ? ["pending", "accepted"] : ["accepted"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!matchesData || matchesData.length === 0) {
        setMatches([]);
        setLoading(false);
        return;
      }

      // Get other user IDs
      const otherUserIds = matchesData.map(m => 
        m.user_a === user.id ? m.user_b : m.user_a
      );

      // Fetch profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", otherUserIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]));

      // Fetch last messages for rooms
      const roomIds = matchesData
        .filter(m => m.room_id)
        .map(m => m.room_id as string);

      let lastMessages = new Map<string, { message: string; created_at: string }>();
      
      if (roomIds.length > 0) {
        const { data: messages } = await supabase
          .from("chatmate_messages")
          .select("room_id, message, created_at")
          .in("room_id", roomIds)
          .order("created_at", { ascending: false });

        messages?.forEach(msg => {
          if (!lastMessages.has(msg.room_id)) {
            lastMessages.set(msg.room_id, { message: msg.message, created_at: msg.created_at });
          }
        });
      }

      // Build matches list
      const matchesList: Match[] = matchesData.map(m => {
        const otherUserId = m.user_a === user.id ? m.user_b : m.user_a;
        const profile = profileMap.get(otherUserId);
        const lastMsg = m.room_id ? lastMessages.get(m.room_id) : null;

        return {
          id: m.id,
          user_id: otherUserId,
          full_name: profile?.full_name || null,
          avatar_url: profile?.avatar_url || null,
          match_score: m.match_score,
          status: m.status,
          room_id: m.room_id,
          last_message: lastMsg?.message || null,
          last_message_at: lastMsg?.created_at || m.created_at,
          unread_count: 0, // TODO: Implement unread count
          icebreaker_message: m.icebreaker_message
        };
      });

      setMatches(matchesList);
    } catch (error) {
      console.error("Error fetching matches:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = async (match: Match) => {
    if (match.room_id) {
      onOpenChat(match.room_id, match.user_id);
      return;
    }

    // Create a new room for pending matches
    try {
      const { data: room, error } = await supabase
        .from("chatmate_rooms")
        .insert({
          room_type: "private",
          participant_ids: [user?.id, match.user_id]
        })
        .select()
        .single();

      if (error) throw error;

      // Update match with room_id
      await supabase
        .from("chat_matches")
        .update({ room_id: room.id, status: "accepted" })
        .eq("id", match.id);

      onOpenChat(room.id, match.user_id);
    } catch (error) {
      console.error("Error creating room:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-20 h-20 mx-auto rounded-full bg-muted flex items-center justify-center">
            {showOnlyMatches ? (
              <Heart className="w-10 h-10 text-muted-foreground" />
            ) : (
              <MessageCircle className="w-10 h-10 text-muted-foreground" />
            )}
          </div>
          <h3 className="text-xl font-semibold">
            {showOnlyMatches ? "No matches yet" : "No conversations yet"}
          </h3>
          <p className="text-muted-foreground">
            {showOnlyMatches 
              ? "Start discovering people to find your bees mates!"
              : "When you match with someone, your chats will appear here."
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-w-2xl mx-auto">
      {showOnlyMatches && (
        <div className="flex items-center gap-2 px-1 mb-4">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {matches.length} match{matches.length !== 1 ? "es" : ""}
          </span>
        </div>
      )}

      {matches.map((match, index) => (
        <motion.div
          key={match.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <Card 
            className="hover:shadow-md transition-all cursor-pointer border-0 shadow-sm"
            onClick={() => handleStartChat(match)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="w-14 h-14 border-2 border-white dark:border-muted shadow-sm">
                    <AvatarImage src={match.avatar_url || ""} />
                    <AvatarFallback className="bg-gradient-to-br from-rose-400 to-purple-500 text-white">
                      {(match.full_name || "?")[0]}
                    </AvatarFallback>
                  </Avatar>
                  {match.status === "pending" && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center">
                      <Sparkles className="w-3 h-3 text-white" />
                    </div>
                  )}
                  {match.status === "accepted" && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                      <Heart className="w-3 h-3 text-white fill-white" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold truncate">
                      {match.full_name || "Someone"}
                    </h3>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge 
                        variant="secondary" 
                        className="bg-gradient-to-r from-rose-100 to-purple-100 dark:from-rose-900/30 dark:to-purple-900/30 text-rose-700 dark:text-rose-300 border-0"
                      >
                        <Zap className="w-3 h-3 mr-1" />
                        {match.match_score}%
                      </Badge>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground truncate mt-0.5">
                    {match.last_message || match.icebreaker_message || "Start a conversation..."}
                  </p>

                  <div className="flex items-center gap-2 mt-1.5">
                    {match.last_message_at && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(match.last_message_at), { addSuffix: true })}
                      </span>
                    )}
                    {match.unread_count > 0 && (
                      <Badge className="bg-rose-500 text-white border-0 text-xs px-2">
                        {match.unread_count}
                      </Badge>
                    )}
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
