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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  MessageSquare, Send, Inbox, ArrowLeft,
  Store, ShoppingBag, Utensils, Wrench, Calendar,
  Check, CheckCheck
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

type ProviderType = 'shop' | 'marketplace' | 'restaurant' | 'service' | 'booking';

interface Conversation {
  id: string;
  customer_id: string;
  provider_id: string;
  provider_type: ProviderType;
  reference_id: string | null;
  reference_title: string | null;
  last_message_at: string;
  created_at: string;
  customer_profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
  unread_count?: number;
  last_message?: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface ProviderInboxProps {
  buttonVariant?: "default" | "outline" | "ghost" | "secondary";
  buttonSize?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export default function ProviderInbox({
  buttonVariant = "outline",
  buttonSize = "default",
  className = ""
}: ProviderInboxProps) {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [inboxOpen, setInboxOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [storeSupportId, setStoreSupportId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!inboxOpen || !isAdmin) return;
    let cancelled = false;

    (async () => {
      try {
        const { data } = await supabase.rpc("get_store_support_user_id");
        if (!cancelled) setStoreSupportId(data ?? null);
      } catch (e) {
        console.error("Failed to load store support id:", e);
        if (!cancelled) setStoreSupportId(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [inboxOpen, isAdmin]);

  // Fetch all conversations where user is the provider (admins also see Store Support conversations)
  const { data: conversations = [], isLoading: loadingConversations } = useQuery({
    queryKey: ["provider-inbox-conversations", user?.id, isAdmin, storeSupportId],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from('provider_conversations')
        .select('*')
        .order('last_message_at', { ascending: false });

      if (isAdmin) {
        const ids = [user.id, storeSupportId].filter(Boolean) as string[];
        if (ids.length === 1) {
          query = query.eq('provider_id', ids[0]);
        } else {
          // provider_id is UUID; include store support UUID if available
          query = query.or(ids.map((id) => `provider_id.eq.${id}`).join(','));
        }
      } else {
        query = query.eq('provider_id', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch customer profiles and unread counts
      const enrichedConversations = await Promise.all(
        (data || []).map(async (conv) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', conv.customer_id)
            .single();

          const { count } = await supabase
            .from('provider_messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('is_read', false)
            .neq('sender_id', user.id);

          const { data: lastMsg } = await supabase
            .from('provider_messages')
            .select('content')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          return {
            ...conv,
            customer_profile: profile,
            unread_count: count || 0,
            last_message: lastMsg?.content || ''
          } as Conversation;
        })
      );

      return enrichedConversations;
    },
    enabled: inboxOpen && !!user,
    refetchInterval: inboxOpen ? 5000 : false
  });

  // Get total unread count
  const totalUnread = conversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);

  // Filter conversations by type
  const filteredConversations = activeTab === 'all' 
    ? conversations 
    : conversations.filter(c => c.provider_type === activeTab);

  // Fetch messages for selected conversation
  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ["provider-inbox-messages", selectedConversation?.id],
    queryFn: async () => {
      if (!selectedConversation) return [];
      
      const { data, error } = await supabase
        .from('provider_messages')
        .select('*')
        .eq('conversation_id', selectedConversation.id)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as Message[];
    },
    enabled: !!selectedConversation,
    refetchInterval: selectedConversation ? 3000 : false
  });

  // Mark messages as read when viewing conversation
  useEffect(() => {
    if (selectedConversation && user && messages.length > 0) {
      const unreadMessages = messages.filter(m => !m.is_read && m.sender_id !== user.id);
      if (unreadMessages.length > 0) {
        supabase
          .from('provider_messages')
          .update({ is_read: true })
          .eq('conversation_id', selectedConversation.id)
          .neq('sender_id', user.id)
          .then(() => {
            queryClient.invalidateQueries({ queryKey: ["provider-inbox-conversations"] });
            queryClient.invalidateQueries({ queryKey: ["provider-inbox-messages", selectedConversation.id] });
          });
      }
    }
  }, [messages, selectedConversation, user]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message
  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      if (!user || !selectedConversation || !newMessage.trim()) {
        throw new Error("Invalid message");
      }
      
      const { error } = await supabase
        .from('provider_messages')
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: user.id,
          content: newMessage.trim()
        });
      
      if (error) throw error;

      await supabase
        .from('provider_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', selectedConversation.id);
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["provider-inbox-messages", selectedConversation?.id] });
      queryClient.invalidateQueries({ queryKey: ["provider-inbox-conversations"] });
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

  const getTypeIcon = (type: ProviderType) => {
    switch (type) {
      case 'shop': return <Store className="w-4 h-4" />;
      case 'marketplace': return <ShoppingBag className="w-4 h-4" />;
      case 'restaurant': return <Utensils className="w-4 h-4" />;
      case 'service': return <Wrench className="w-4 h-4" />;
      case 'booking': return <Calendar className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: ProviderType) => {
    switch (type) {
      case 'shop': return 'Shop';
      case 'marketplace': return 'Market';
      case 'restaurant': return 'Food';
      case 'service': return 'Service';
      case 'booking': return 'Booking';
    }
  };

  if (!user) return null;

  return (
    <Dialog open={inboxOpen} onOpenChange={setInboxOpen}>
      <DialogTrigger asChild>
        <Button variant={buttonVariant} size={buttonSize} className={`relative gap-2 ${className}`}>
          <Inbox className="w-4 h-4" />
          <span>Messages</span>
          {totalUnread > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {totalUnread > 99 ? '99+' : totalUnread}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg h-[85vh] flex flex-col p-0">
        {selectedConversation ? (
          // Chat View
          <>
            <DialogHeader className="p-4 border-b">
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setSelectedConversation(null)}
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <Avatar className="w-10 h-10">
                  <AvatarImage src={selectedConversation.customer_profile?.avatar_url || undefined} />
                  <AvatarFallback>
                    {selectedConversation.customer_profile?.full_name?.charAt(0) || 'C'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <DialogTitle className="text-base">
                    {selectedConversation.customer_profile?.full_name || 'Customer'}
                  </DialogTitle>
                  <div className="flex items-center gap-2">
                    {getTypeIcon(selectedConversation.provider_type)}
                    <span className="text-xs text-muted-foreground">
                      {selectedConversation.reference_title || getTypeLabel(selectedConversation.provider_type)}
                    </span>
                  </div>
                </div>
              </div>
            </DialogHeader>

            <ScrollArea className="flex-1 p-4">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
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

            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  placeholder="Type your reply..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                />
                <Button onClick={handleSend} disabled={!newMessage.trim()} size="icon">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          // Inbox List View
          <>
            <DialogHeader className="p-4 border-b">
              <DialogTitle className="flex items-center gap-2">
                <Inbox className="w-5 h-5" />
                Customer Messages
                {totalUnread > 0 && (
                  <Badge variant="destructive">{totalUnread}</Badge>
                )}
              </DialogTitle>
            </DialogHeader>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="mx-4 mt-2 grid grid-cols-6">
                <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                <TabsTrigger value="shop" className="text-xs">Shop</TabsTrigger>
                <TabsTrigger value="marketplace" className="text-xs">Market</TabsTrigger>
                <TabsTrigger value="restaurant" className="text-xs">Food</TabsTrigger>
                <TabsTrigger value="service" className="text-xs">Service</TabsTrigger>
                <TabsTrigger value="booking" className="text-xs">Book</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="flex-1 m-0">
                <ScrollArea className="h-full">
                  {loadingConversations ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                    </div>
                  ) : filteredConversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                      <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
                      <p className="text-sm">No messages yet</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredConversations.map((conv) => (
                        <button
                          key={conv.id}
                          onClick={() => setSelectedConversation(conv)}
                          className="w-full p-4 flex items-start gap-3 hover:bg-muted/50 transition-colors text-left"
                        >
                          <div className="relative">
                            <Avatar className="w-12 h-12">
                              <AvatarImage src={conv.customer_profile?.avatar_url || undefined} />
                              <AvatarFallback>
                                {conv.customer_profile?.full_name?.charAt(0) || 'C'}
                              </AvatarFallback>
                            </Avatar>
                            {(conv.unread_count || 0) > 0 && (
                              <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                                {conv.unread_count}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className={`font-medium truncate ${(conv.unread_count || 0) > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {conv.customer_profile?.full_name || 'Customer'}
                              </p>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                {getTypeIcon(conv.provider_type)}
                                <span className="ml-1">{getTypeLabel(conv.provider_type)}</span>
                              </Badge>
                            </div>
                            {conv.reference_title && (
                              <p className="text-xs text-muted-foreground mt-1 truncate">
                                Re: {conv.reference_title}
                              </p>
                            )}
                            {conv.last_message && (
                              <p className={`text-sm truncate mt-1 ${(conv.unread_count || 0) > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                                {conv.last_message}
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}