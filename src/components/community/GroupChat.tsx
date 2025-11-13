import { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Video, MoreVertical, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { FileUpload } from "./FileUpload";
import { VideoCallDialog } from "./VideoCallDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Message {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  profiles?: {
    id: string;
    full_name: string | null;
  };
}

interface GroupChatProps {
  groupId: string;
}

export const GroupChat = ({ groupId }: GroupChatProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [groupName, setGroupName] = useState("");
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, any>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (groupId) {
      fetchGroupInfo();
      fetchMessages();
      const unsubscribe = subscribeToMessages();
      subscribeToPresence();
      return unsubscribe;
    }
  }, [groupId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchGroupInfo = async () => {
    try {
      const supabaseClient: any = supabase;
      const { data, error } = await supabaseClient
        .from("groups")
        .select("name")
        .eq("id", groupId)
        .single();

      if (error) throw error;
      setGroupName(data.name);
    } catch (error) {
      console.error("Error fetching group info:", error);
    }
  };

  const fetchMessages = async () => {
    try {
      const supabaseClient: any = supabase;
      const { data, error } = await supabaseClient
        .from("group_messages")
        .select(`
          *,
          profiles:user_id (
            id,
            full_name
          )
        `)
        .eq("group_id", groupId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true })
        .limit(100);

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`group-messages-${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "group_messages",
          filter: `group_id=eq.${groupId}`
        },
        async (payload) => {
          // Fetch the full message with profile data
          const supabaseClient: any = supabase;
          const { data } = await supabaseClient
            .from("group_messages")
            .select(`
              *,
              profiles:user_id (
                id,
                full_name
              )
            `)
            .eq("id", payload.new.id)
            .single();

          if (data) {
            setMessages((prev) => [...prev, data]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const subscribeToPresence = () => {
    const channel = supabase.channel(`group-presence-${groupId}`);

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setTypingUsers(state);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user?.id,
            typing: false,
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const updateTypingStatus = async (typing: boolean) => {
    const channel = supabase.channel(`group-presence-${groupId}`);
    await channel.track({
      user_id: user?.id,
      typing,
    });
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const supabaseClient: any = supabase;
      const { error } = await supabaseClient
        .from("group_messages")
        .insert({
          group_id: groupId,
          user_id: user?.id,
          content: newMessage.trim()
        });

      if (error) throw error;
      setNewMessage("");
      await updateTypingStatus(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast.error(error.message || "Failed to send message");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    // Update typing status
    updateTypingStatus(true);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to clear typing status after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      updateTypingStatus(false);
    }, 2000);
  };

  const getTypingUsers = () => {
    return Object.values(typingUsers)
      .flatMap((presences: any) => presences)
      .filter((presence: any) => presence.typing && presence.user_id !== user?.id);
  };

  const getUserDisplayName = (msg: Message) => {
    return msg.profiles?.full_name || `User ${msg.user_id.slice(0, 8)}`;
  };

  const handleFileUploaded = async (url: string, fileName: string, fileSize: number, fileType: string) => {
    const fileMessage = fileType.startsWith("image/")
      ? `📷 Image: ${fileName}`
      : `📎 File: ${fileName}`;

    try {
      const supabaseClient: any = supabase;
      const { error } = await supabaseClient
        .from("group_messages")
        .insert({
          group_id: groupId,
          user_id: user?.id,
          content: fileMessage
        });

      if (error) throw error;
    } catch (error: any) {
      console.error("Error sending file message:", error);
      toast.error("Failed to send file");
    }
  };

  return (
    <>
    <Card className="flex flex-col h-[600px]">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h2 className="font-bold text-lg">{groupName}</h2>
          <p className="text-xs text-muted-foreground">Group Chat</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowVideoCall(true)}>
            <Video className="w-4 h-4 mr-1" />
            Call
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Users className="w-4 h-4 mr-2" />
                View Members
              </DropdownMenuItem>
              <DropdownMenuItem>Group Settings</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">Leave Group</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {loading ? (
          <p className="text-center text-muted-foreground">Loading messages...</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-muted-foreground">No messages yet. Start the conversation!</p>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => {
              const isOwnMessage = msg.user_id === user?.id;
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${isOwnMessage ? "flex-row-reverse" : ""}`}
                >
                  <Avatar className="w-8 h-8">
                    <AvatarFallback>
                      {getUserDisplayName(msg).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`flex flex-col ${isOwnMessage ? "items-end" : ""}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold">
                        {isOwnMessage ? "You" : getUserDisplayName(msg)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <div
                      className={`px-4 py-2 rounded-lg max-w-md ${
                        isOwnMessage
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                    </div>
                  </div>
                </div>
              );
            })}
            {getTypingUsers().length > 0 && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm italic px-4">
                <span className="animate-pulse">Someone is typing...</span>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t">
        <div className="flex items-center gap-2">
          <FileUpload onFileUploaded={handleFileUploaded} />
          <Input
            value={newMessage}
            onChange={handleInputChange}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={!newMessage.trim()}>
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </form>
    </Card>

    <VideoCallDialog
      open={showVideoCall}
      onOpenChange={setShowVideoCall}
      groupId={groupId}
      groupName={groupName}
    />
    </>
  );
};
