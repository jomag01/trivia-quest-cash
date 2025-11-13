import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Reply {
  id: string;
  content: string;
  sender_id: string;
  user_id?: string;
  created_at: string;
  profiles?: {
    full_name: string | null;
  };
}

interface MessageThreadProps {
  messageId: string;
  messageContent: string;
  messageType: "group" | "private";
  groupId?: string;
  conversationId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MessageThread = ({ 
  messageId, 
  messageContent, 
  messageType, 
  groupId, 
  conversationId,
  open, 
  onOpenChange 
}: MessageThreadProps) => {
  const { user } = useAuth();
  const [replies, setReplies] = useState<Reply[]>([]);
  const [newReply, setNewReply] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchReplies();
      subscribeToReplies();
    }
  }, [open, messageId]);

  const fetchReplies = async () => {
    try {
      const supabaseClient: any = supabase;
      const table = messageType === "group" ? "group_messages" : "private_messages";
      const userField = messageType === "group" ? "user_id" : "sender_id";

      // First get replies
      const { data: repliesData, error: repliesError } = await supabaseClient
        .from(table)
        .select("*")
        .eq("parent_message_id", messageId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });

      if (repliesError) throw repliesError;

      // Then get profiles for all unique user IDs
      const userIds = [...new Set(repliesData?.map((m: any) => m[userField]) || [])];
      const { data: profilesData, error: profilesError } = await supabaseClient
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Combine the data
      const profilesMap = new Map(profilesData?.map((p: any) => [p.id, p]) || []);
      const repliesWithProfiles = repliesData?.map((reply: any) => ({
        ...reply,
        profiles: profilesMap.get(reply[userField])
      })) || [];

      setReplies(repliesWithProfiles);
    } catch (error) {
      console.error("Error fetching replies:", error);
    }
  };

  const subscribeToReplies = () => {
    const table = messageType === "group" ? "group_messages" : "private_messages";
    const channel = supabase
      .channel(`thread-${messageId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table,
          filter: `parent_message_id=eq.${messageId}`
        },
        async (payload) => {
          const supabaseClient: any = supabase;
          const userField = messageType === "group" ? "user_id" : "sender_id";
          
          // Get the new reply
          const { data: replyData } = await supabaseClient
            .from(table)
            .select("*")
            .eq("id", payload.new.id)
            .single();

          if (replyData) {
            // Get profile for the user
            const { data: profileData } = await supabaseClient
              .from("profiles")
              .select("id, full_name")
              .eq("id", replyData[userField])
              .single();

            const replyWithProfile = {
              ...replyData,
              profiles: profileData
            };

            setReplies((prev) => [...prev, replyWithProfile]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReply.trim() || loading) return;

    setLoading(true);
    try {
      const supabaseClient: any = supabase;
      const table = messageType === "group" ? "group_messages" : "private_messages";
      const userField = messageType === "group" ? "user_id" : "sender_id";
      const parentField = messageType === "group" ? "group_id" : "conversation_id";
      const parentValue = messageType === "group" ? groupId : conversationId;

      const { error } = await supabaseClient
        .from(table)
        .insert({
          [parentField]: parentValue,
          [userField]: user?.id,
          content: newReply.trim(),
          parent_message_id: messageId
        });

      if (error) throw error;
      setNewReply("");
    } catch (error: any) {
      console.error("Error sending reply:", error);
      toast.error("Failed to send reply");
    } finally {
      setLoading(false);
    }
  };

  const getUserName = (reply: Reply) => {
    return reply.profiles?.full_name || `User ${(reply.sender_id || reply.user_id || "").slice(0, 8)}`;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Thread</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Original message */}
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm">{messageContent}</p>
          </div>

          {/* Replies */}
          <ScrollArea className="h-[calc(100vh-300px)]">
            <div className="space-y-4 pr-4">
              {replies.map((reply) => {
                const isOwnReply = (reply.sender_id || reply.user_id) === user?.id;
                return (
                  <div key={reply.id} className={`flex gap-3 ${isOwnReply ? "flex-row-reverse" : ""}`}>
                    <Avatar className="w-8 h-8">
                      <AvatarFallback>
                        {getUserName(reply).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`flex flex-col ${isOwnReply ? "items-end" : ""}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold">
                          {isOwnReply ? "You" : getUserName(reply)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <div
                        className={`px-3 py-2 rounded-lg max-w-md ${
                          isOwnReply ? "bg-primary text-primary-foreground" : "bg-muted"
                        }`}
                      >
                        <p className="text-sm">{reply.content}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {/* Reply input */}
          <form onSubmit={handleSendReply} className="flex items-center gap-2">
            <Input
              value={newReply}
              onChange={(e) => setNewReply(e.target.value)}
              placeholder="Reply to thread..."
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={!newReply.trim() || loading}>
              <Send className="w-5 h-5" />
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
};
