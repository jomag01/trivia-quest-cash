import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { MessageSquare, Send, Check, CheckCheck } from "lucide-react";
import { format } from "date-fns";

export type ProviderType = 'shop' | 'marketplace' | 'restaurant' | 'service' | 'booking';

interface ProviderChatProps {
  providerId: string;
  providerName: string;
  providerAvatar?: string | null;
  providerType: ProviderType;
  referenceId?: string;
  referenceTitle?: string;
  buttonVariant?: "default" | "outline" | "ghost" | "secondary";
  buttonSize?: "default" | "sm" | "lg" | "icon";
  buttonClassName?: string;
  showLabel?: boolean;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface Conversation {
  id: string;
  customer_id: string;
  provider_id: string;
  provider_type: ProviderType;
  reference_id: string | null;
  reference_title: string | null;
  last_message_at: string;
}

export default function ProviderChat({
  providerId,
  providerName,
  providerAvatar,
  providerType,
  referenceId,
  referenceTitle,
  buttonVariant = "outline",
  buttonSize = "sm",
  buttonClassName = "",
  showLabel = true
}: ProviderChatProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [chatOpen, setChatOpen] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isStartingChat, setIsStartingChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Find or create conversation
  useEffect(() => {
    if (!chatOpen) return;
    if (!user || !providerId) return;

    let cancelled = false;
    setIsStartingChat(true);

    findOrCreateConversation()
      .catch(() => {
        // errors are handled inside findOrCreateConversation
      })
      .finally(() => {
        if (!cancelled) setIsStartingChat(false);
      });

    return () => {
      cancelled = true;
    };
  }, [chatOpen, user, providerId, providerType, referenceId]);

  const findOrCreateConversation = async (): Promise<string | null> => {
    if (!user || !providerId) return null;
    if (conversationId) return conversationId;

    // Ensure we actually have an authenticated session (RLS depends on this)
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      let session = sessionData?.session ?? null;

      if (!session) {
        const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          console.error('Chat refreshSession error:', refreshError);
        }
        session = refreshed?.session ?? null;
      }

      if (!session) {
        toast.error("Please login again to start chat");
        return null;
      }
    } catch (e) {
      console.error('Chat session check error:', e);
      toast.error("Please login again to start chat");
      return null;
    }

    try {
      // Try to find existing conversation (limit 1 to avoid maybeSingle() errors when duplicates exist)
      let query = supabase
        .from('provider_conversations')
        .select('id')
        .eq('customer_id', user.id)
        .eq('provider_id', providerId)
        .eq('provider_type', providerType)
        .order('created_at', { ascending: true })
        .limit(1);

      if (referenceId) {
        query = query.eq('reference_id', referenceId);
      } else {
        query = query.is('reference_id', null);
      }

      const { data: existing, error: findError } = await query.maybeSingle();
      if (findError) {
        console.error('Error finding conversation:', findError);
      }

      if (existing?.id) {
        setConversationId(existing.id);
        return existing.id;
      }

      // Create new conversation
      const insertData: {
        customer_id: string;
        provider_id: string;
        provider_type: ProviderType;
        reference_id?: string;
        reference_title?: string;
      } = {
        customer_id: user.id,
        provider_id: providerId,
        provider_type: providerType
      };

      if (referenceId) {
        insertData.reference_id = referenceId;
      }
      if (referenceTitle) {
        insertData.reference_title = referenceTitle;
      }

      const { data: newConvo, error: insertError } = await supabase
        .from('provider_conversations')
        .insert(insertData)
        .select('id')
        .single();

      if (insertError) {
        console.error('Error creating conversation:', insertError);
        toast.error(insertError.message || "Failed to start conversation");
        return null;
      }

      setConversationId(newConvo.id);
      return newConvo.id;
    } catch (error) {
      console.error('Error finding/creating conversation:', error);
      toast.error("Failed to start chat");
      return null;
    }
  };

  // Fetch messages
  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ["provider-chat-messages", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      
      const { data, error } = await supabase
        .from('provider_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as Message[];
    },
    enabled: !!conversationId,
    refetchInterval: chatOpen ? 3000 : false
  });

  // Mark messages as read
  useEffect(() => {
    if (conversationId && user && messages.length > 0) {
      const unreadMessages = messages.filter(m => !m.is_read && m.sender_id !== user.id);
      if (unreadMessages.length > 0) {
        supabase
          .from('provider_messages')
          .update({ is_read: true })
          .eq('conversation_id', conversationId)
          .neq('sender_id', user.id)
          .then(() => {
            queryClient.invalidateQueries({ queryKey: ["provider-chat-messages", conversationId] });
          });
      }
    }
  }, [messages, conversationId, user]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (vars: { conversationId: string; content: string }) => {
      if (!user) {
        throw new Error("Please login to send messages");
      }

      const { error } = await supabase
        .from('provider_messages')
        .insert({
          conversation_id: vars.conversationId,
          sender_id: user.id,
          content: vars.content
        });

      if (error) {
        console.error('Send message error:', error);
        throw new Error(error.message || "Failed to send message");
      }

      // Update last_message_at
      await supabase
        .from('provider_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', vars.conversationId);
    },
    onSuccess: (_data, vars) => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["provider-chat-messages", vars.conversationId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to send message");
    }
  });

  const handleSend = async () => {
    const content = newMessage.trim();
    if (!content || sendMessageMutation.isPending) return;

    let convoId = conversationId;
    if (!convoId) {
      setIsStartingChat(true);
      convoId = await findOrCreateConversation();
      setIsStartingChat(false);
    }

    if (!convoId) {
      toast.error("Chat is still starting. Please try again.");
      return;
    }

    sendMessageMutation.mutate({ conversationId: convoId, content });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!user) {
    return (
      <Button variant={buttonVariant} size={buttonSize} disabled className={buttonClassName}>
        <MessageSquare className="w-4 h-4" />
        {showLabel && <span className="ml-2">Login to Chat</span>}
      </Button>
    );
  }

  // Don't show chat button if user is the provider
  if (user.id === providerId) {
    return null;
  }

  const getProviderTypeLabel = () => {
    switch (providerType) {
      case 'shop': return 'Seller';
      case 'marketplace': return 'Seller';
      case 'restaurant': return 'Restaurant';
      case 'service': return 'Provider';
      case 'booking': return 'Provider';
      default: return 'Provider';
    }
  };

  return (
    <Dialog open={chatOpen} onOpenChange={setChatOpen}>
      <DialogTrigger asChild>
        <Button variant={buttonVariant} size={buttonSize} className={`gap-2 ${buttonClassName}`}>
          <MessageSquare className="w-4 h-4" />
          {showLabel && `Chat ${getProviderTypeLabel()}`}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm sm:max-w-md max-h-[60vh] sm:max-h-[500px] flex flex-col p-0 rounded-2xl overflow-hidden border-0 shadow-2xl">
        {/* Gradient Header */}
        <DialogHeader className="p-3 bg-gradient-to-r from-primary via-primary/90 to-primary/80 text-primary-foreground">
          <DialogTitle className="flex items-center gap-2">
            <Avatar className="w-8 h-8 ring-2 ring-primary-foreground/30">
              <AvatarImage src={providerAvatar || undefined} />
              <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground text-sm font-bold">
                {providerName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{providerName}</p>
              <p className="text-[10px] opacity-80 capitalize">{providerType}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {referenceTitle && (
          <div className="px-3 py-1.5 bg-gradient-to-r from-secondary/50 to-muted/50 border-b">
            <p className="text-xs text-muted-foreground truncate">
              Regarding: <span className="font-medium text-foreground">{referenceTitle}</span>
            </p>
          </div>
        )}

        <ScrollArea className="flex-1 p-3 bg-gradient-to-b from-background to-muted/20">
          {loadingMessages ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-2">
                <MessageSquare className="w-6 h-6 text-primary/60" />
              </div>
              <p className="text-xs font-medium">Start chatting with {providerName}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {messages.map((msg) => {
                const isOwnMessage = msg.sender_id === user.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-3 py-1.5 shadow-sm ${
                        isOwnMessage
                          ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-br-sm"
                          : "bg-card border border-border/50 rounded-bl-sm"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      <div className={`flex items-center gap-1 mt-0.5 ${isOwnMessage ? "justify-end" : "justify-start"}`}>
                        <span className="text-[9px] opacity-60">
                          {format(new Date(msg.created_at), 'HH:mm')}
                        </span>
                        {isOwnMessage && (
                          msg.is_read 
                            ? <CheckCheck className="w-2.5 h-2.5 opacity-60" />
                            : <Check className="w-2.5 h-2.5 opacity-60" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        <div className="p-2 border-t bg-gradient-to-r from-background via-muted/30 to-background">
          <div className="flex gap-2 items-center">
            <Input
              placeholder={isStartingChat ? "Starting chat…" : "Type your message..."}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isStartingChat}
              className="flex-1 h-9 text-sm rounded-full bg-muted/50 border-muted-foreground/20 focus-visible:ring-primary/50"
            />
            <Button 
              onClick={handleSend} 
              disabled={isStartingChat || !newMessage.trim() || sendMessageMutation.isPending}
              size="icon"
              className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}