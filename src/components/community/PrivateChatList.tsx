import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { StartConversationDialog } from "./StartConversationDialog";

interface Conversation {
  id: string;
  user1_id: string;
  user2_id: string;
  other_user: {
    id: string;
    full_name: string | null;
  };
  last_message?: {
    content: string;
    created_at: string;
    sender_id: string;
  };
  unread_count: number;
}

interface PrivateChatListProps {
  onSelectConversation: (conversationId: string, otherUserId: string, otherUserName: string) => void;
  selectedConversationId: string | null;
}

export const PrivateChatList = ({ onSelectConversation, selectedConversationId }: PrivateChatListProps) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  const fetchConversations = async () => {
    try {
      const supabaseClient: any = supabase;
      
      // Fetch conversations where user is either user1 or user2
      const { data: convData, error } = await supabaseClient
        .from("private_conversations")
        .select(`
          *,
          user1:profiles!private_conversations_user1_id_fkey (id, full_name),
          user2:profiles!private_conversations_user2_id_fkey (id, full_name),
          private_messages (content, created_at, sender_id)
        `)
        .or(`user1_id.eq.${user?.id},user2_id.eq.${user?.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Process conversations to get other user info and last message
      const processedConversations = (convData || []).map((conv: any) => {
        const isUser1 = conv.user1_id === user?.id;
        const otherUser = isUser1 ? conv.user2 : conv.user1;
        const messages = conv.private_messages || [];
        const lastMessage = messages[messages.length - 1];
        
        // Count unread messages (messages from other user that haven't been read)
        const unreadCount = messages.filter(
          (msg: any) => msg.sender_id !== user?.id && !msg.read_at
        ).length;

        return {
          id: conv.id,
          user1_id: conv.user1_id,
          user2_id: conv.user2_id,
          other_user: otherUser,
          last_message: lastMessage,
          unread_count: unreadCount
        };
      });

      setConversations(processedConversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      toast.error("Failed to load conversations");
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.other_user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Messages</h2>
        <StartConversationDialog onConversationStarted={fetchConversations} />
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <ScrollArea className="h-[500px]">
        {loading ? (
          <p className="text-center text-muted-foreground py-4">Loading...</p>
        ) : filteredConversations.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No conversations yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Start chatting with other users!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredConversations.map((conv) => (
              <Card
                key={conv.id}
                className={`p-3 cursor-pointer transition-colors hover:bg-accent ${
                  selectedConversationId === conv.id ? "bg-accent border-primary" : ""
                }`}
                onClick={() => onSelectConversation(
                  conv.id,
                  conv.other_user.id,
                  conv.other_user.full_name || "User"
                )}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback>
                      {(conv.other_user.full_name || "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-sm truncate">
                        {conv.other_user.full_name || "User"}
                      </h3>
                      {conv.last_message && (
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(conv.last_message.created_at), {
                            addSuffix: true
                          })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {conv.last_message?.content || "No messages yet"}
                      </p>
                      {conv.unread_count > 0 && (
                        <Badge variant="default" className="ml-2 h-5 min-w-[20px] px-1">
                          {conv.unread_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
};
