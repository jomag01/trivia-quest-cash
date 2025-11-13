import { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Video, MoreVertical, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { FileUpload } from "./FileUpload";
import { VideoCallDialog } from "./VideoCallDialog";
import { MessageReactions } from "./MessageReactions";
import { MessageThread } from "./MessageThread";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  read_at: string | null;
}

interface PrivateChatViewProps {
  conversationId: string;
  otherUserId: string;
  otherUserName: string;
}

export const PrivateChatView = ({ conversationId, otherUserId, otherUserName }: PrivateChatViewProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [threadMessageId, setThreadMessageId] = useState<string | null>(null);
  const [threadMessageContent, setThreadMessageContent] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (conversationId) {
      fetchMessages();
      const unsubscribe = subscribeToMessages();
      subscribeToPresence();
      markMessagesAsRead();
      return unsubscribe;
    }
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const supabaseClient: any = supabase;
      const { data, error } = await supabaseClient
        .from("private_messages")
        .select("*")
        .eq("conversation_id", conversationId)
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
      .channel(`private-messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "private_messages",
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const subscribeToPresence = () => {
    const channel = supabase.channel(`private-presence-${conversationId}`);

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const otherUserPresence = Object.values(state)
          .flatMap((presences: any) => presences)
          .find((presence: any) => presence.user_id === otherUserId);
        
        setIsOtherUserTyping(otherUserPresence?.typing || false);
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
    const channel = supabase.channel(`private-presence-${conversationId}`);
    await channel.track({
      user_id: user?.id,
      typing,
    });
  };

  const markMessagesAsRead = async () => {
    try {
      const supabaseClient: any = supabase;
      await supabaseClient
        .from("private_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId)
        .eq("sender_id", otherUserId)
        .is("read_at", null);
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
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
        .from("private_messages")
        .insert({
          conversation_id: conversationId,
          sender_id: user?.id,
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

  const handleFileUploaded = async (url: string, fileName: string, fileSize: number, fileType: string) => {
    const fileMessage = fileType.startsWith("image/")
      ? `📷 Image: ${fileName}`
      : `📎 File: ${fileName}`;

    try {
      const supabaseClient: any = supabase;
      const { error } = await supabaseClient
        .from("private_messages")
        .insert({
          conversation_id: conversationId,
          sender_id: user?.id,
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
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback>
                {otherUserName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-bold">{otherUserName}</h2>
              <p className="text-xs text-muted-foreground">Active now</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowVideoCall(true)}>
              <Video className="w-4 h-4 mr-1" />
              Call
            </Button>
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
                const isOwnMessage = msg.sender_id === user?.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${isOwnMessage ? "flex-row-reverse" : ""}`}
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarFallback>
                        {(isOwnMessage ? "You" : otherUserName).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`flex flex-col ${isOwnMessage ? "items-end" : ""}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold">
                          {isOwnMessage ? "You" : otherUserName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div
                          className={`px-4 py-2 rounded-lg max-w-md ${
                            isOwnMessage
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          <p className="text-sm">{msg.content}</p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <MessageReactions
                            messageId={msg.id}
                            messageType="private"
                            reactions={[]}
                            onReactionUpdate={() => fetchMessages()}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => {
                              setThreadMessageId(msg.id);
                              setThreadMessageContent(msg.content);
                            }}
                          >
                            <MessageSquare className="w-3 h-3 mr-1" />
                            Reply
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
              );
            })}
            {isOtherUserTyping && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm italic px-4">
                <span className="animate-pulse">{otherUserName} is typing...</span>
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
        conversationId={conversationId}
        groupName={otherUserName}
      />

      <MessageThread
        messageId={threadMessageId || ""}
        messageContent={threadMessageContent}
        messageType="private"
        conversationId={conversationId}
        open={!!threadMessageId}
        onOpenChange={(open) => !open && setThreadMessageId(null)}
      />
    </>
  );
};
