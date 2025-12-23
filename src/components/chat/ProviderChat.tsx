import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MessageSquare, Send, Clock, Check, CheckCheck } from "lucide-react";
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Find or create conversation
  useEffect(() => {
    if (chatOpen && user && providerId) {
      findOrCreateConversation();
    }
  }, [chatOpen, user, providerId]);

  const findOrCreateConversation = async () => {
    if (!user) return;
    
    try {
      // Try to find existing conversation
      let query = supabase
        .from('provider_conversations')
        .select('id')
        .eq('customer_id', user.id)
        .eq('provider_id', providerId)
        .eq('provider_type', providerType);
      
      if (referenceId) {
        query = query.eq('reference_id', referenceId);
      }
      
      const { data: existing } = await query.maybeSingle();
      
      if (existing) {
        setConversationId(existing.id);
      } else {
        // Create new conversation
        const { data: newConvo, error } = await supabase
          .from('provider_conversations')
          .insert({
            customer_id: user.id,
            provider_id: providerId,
            provider_type: providerType,
            reference_id: referenceId || null,
            reference_title: referenceTitle || null
          })
          .select('id')
          .single();
        
        if (error) throw error;
        setConversationId(newConvo.id);
      }
    } catch (error) {
      console.error('Error finding/creating conversation:', error);
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
    mutationFn: async () => {
      if (!user || !conversationId || !newMessage.trim()) {
        throw new Error("Invalid message");
      }
      
      const { error } = await supabase
        .from('provider_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: newMessage.trim()
        });
      
      if (error) throw error;

      // Update last_message_at
      await supabase
        .from('provider_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["provider-chat-messages", conversationId] });
    },
    onError: (error) => {
      toast.error("Failed to send message: " + error.message);
    }
  });

  const handleSend = () => {
    if (newMessage.trim()) {
      sendMessageMutation.mutate();
    }
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
      <DialogContent className="max-w-md h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={providerAvatar || undefined} />
              <AvatarFallback>{providerName.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold">{providerName}</p>
              <p className="text-xs text-muted-foreground capitalize">{providerType}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {referenceTitle && (
          <div className="px-4 py-2 bg-muted/50 border-b">
            <p className="text-sm text-muted-foreground">
              Regarding: <span className="font-medium text-foreground">{referenceTitle}</span>
            </p>
          </div>
        )}

        <ScrollArea className="flex-1 p-4">
          {loadingMessages ? (
            <div className="flex items-center justify-center h-full">
              <Clock className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <MessageSquare className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm font-medium">No messages yet</p>
              <p className="text-xs">Start a conversation with {providerName}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => {
                const isOwnMessage = msg.sender_id === user.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                        isOwnMessage
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted rounded-bl-md"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <div className={`flex items-center gap-1 mt-1 ${isOwnMessage ? "justify-end" : "justify-start"}`}>
                        <span className="text-[10px] opacity-70">
                          {format(new Date(msg.created_at), 'HH:mm')}
                        </span>
                        {isOwnMessage && (
                          msg.is_read 
                            ? <CheckCheck className="w-3 h-3 opacity-70" />
                            : <Check className="w-3 h-3 opacity-70" />
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

        <div className="p-4 border-t bg-background">
          <div className="flex gap-2">
            <Input
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button 
              onClick={handleSend} 
              disabled={!newMessage.trim() || sendMessageMutation.isPending}
              size="icon"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}