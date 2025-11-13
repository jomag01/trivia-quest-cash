import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Smile } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Reaction {
  emoji: string;
  count: number;
  users: string[];
}

interface MessageReactionsProps {
  messageId: string;
  messageType: "group" | "private";
  reactions: Reaction[];
  onReactionUpdate: () => void;
}

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🎉", "🔥"];

export const MessageReactions = ({ messageId, messageType, reactions, onReactionUpdate }: MessageReactionsProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleReaction = async (emoji: string) => {
    if (!user || loading) return;
    setLoading(true);

    try {
      const supabaseClient: any = supabase;
      
      // Check if user already reacted with this emoji
      const { data: existing } = await supabaseClient
        .from("message_reactions")
        .select("id")
        .eq("message_id", messageId)
        .eq("user_id", user.id)
        .eq("emoji", emoji)
        .single();

      if (existing) {
        // Remove reaction
        const { error } = await supabaseClient
          .from("message_reactions")
          .delete()
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        // Add reaction
        const { error } = await supabaseClient
          .from("message_reactions")
          .insert({
            message_id: messageId,
            user_id: user.id,
            emoji
          });

        if (error) throw error;
      }

      onReactionUpdate();
    } catch (error: any) {
      console.error("Error handling reaction:", error);
      toast.error("Failed to update reaction");
    } finally {
      setLoading(false);
    }
  };

  const userHasReacted = (emoji: string) => {
    const reaction = reactions.find(r => r.emoji === emoji);
    return reaction?.users.includes(user?.id || "");
  };

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {reactions.map((reaction) => (
        <Button
          key={reaction.emoji}
          variant="ghost"
          size="sm"
          className={`h-7 px-2 text-xs ${
            userHasReacted(reaction.emoji) ? "bg-primary/10" : ""
          }`}
          onClick={() => handleReaction(reaction.emoji)}
        >
          <span className="mr-1">{reaction.emoji}</span>
          <span>{reaction.count}</span>
        </Button>
      ))}

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
            <Smile className="w-4 h-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2">
          <div className="grid grid-cols-4 gap-2">
            {QUICK_REACTIONS.map((emoji) => (
              <Button
                key={emoji}
                variant="ghost"
                size="sm"
                className="text-2xl h-12"
                onClick={() => handleReaction(emoji)}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
