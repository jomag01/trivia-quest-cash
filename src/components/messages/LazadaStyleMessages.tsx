import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  MessageCircle, Package, Bell, Megaphone, Bot, 
  Trash2, MoreHorizontal, ArrowLeft, Send,
  Check, CheckCheck, Sparkles
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { MessageChatView } from "./MessageChatView";

interface Conversation {
  id: string;
  customer_id: string;
  provider_id: string;
  provider_type: string;
  reference_id: string | null;
  reference_title: string | null;
  last_message_at: string;
  created_at: string;
  other_user_name?: string;
  other_user_avatar?: string;
  unread_count?: number;
  last_message?: string;
  product_image?: string;
}

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  order_id: string | null;
  created_at: string;
}

export const LazadaStyleMessages = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("chats");
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  // Fetch conversations where user is customer
  const { data: customerConversations = [], isLoading: loadingCustomer } = useQuery({
    queryKey: ["customer-conversations", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('provider_conversations')
        .select('*')
        .eq('customer_id', user.id)
        .order('last_message_at', { ascending: false });
      
      if (error) throw error;

      // Enrich with provider info
      const enriched = await Promise.all(
        (data || []).map(async (conv) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', conv.provider_id)
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
            other_user_name: profile?.full_name || 'Seller',
            other_user_avatar: profile?.avatar_url,
            unread_count: count || 0,
            last_message: lastMsg?.content || ''
          } as Conversation;
        })
      );

      return enriched;
    },
    enabled: !!user
  });

  // Fetch conversations where user is provider (seller)
  const { data: providerConversations = [], isLoading: loadingProvider } = useQuery({
    queryKey: ["provider-conversations", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('provider_conversations')
        .select('*')
        .eq('provider_id', user.id)
        .order('last_message_at', { ascending: false });
      
      if (error) throw error;

      const enriched = await Promise.all(
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
            other_user_name: profile?.full_name || 'Customer',
            other_user_avatar: profile?.avatar_url,
            unread_count: count || 0,
            last_message: lastMsg?.content || ''
          } as Conversation;
        })
      );

      return enriched;
    },
    enabled: !!user
  });

  // Fetch notifications
  const { data: notifications = [], isLoading: loadingNotifications } = useQuery({
    queryKey: ["user-notifications", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return (data || []) as Notification[];
    },
    enabled: !!user
  });

  // Combine all conversations
  const allConversations = [...customerConversations, ...providerConversations]
    .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());

  // Filter by type
  const orderNotifications = notifications.filter(n => n.type === 'order');
  const activityNotifications = notifications.filter(n => ['referral', 'signup', 'reward'].includes(n.type));
  const promoNotifications = notifications.filter(n => n.type === 'promo');

  // Counts
  const chatUnread = allConversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);
  const orderUnread = orderNotifications.filter(n => !n.read).length;
  const activityUnread = activityNotifications.filter(n => !n.read).length;
  const promoUnread = promoNotifications.filter(n => !n.read).length;

  if (selectedConversation) {
    return (
      <MessageChatView 
        conversation={selectedConversation} 
        onBack={() => setSelectedConversation(null)} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-background z-10 border-b">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-2xl font-bold">Message+</h1>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Trash2 className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full h-12 bg-transparent border-b rounded-none p-0 justify-start gap-0">
            <TabsTrigger 
              value="chats" 
              className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none h-full gap-1"
            >
              <MessageCircle className="w-4 h-4" />
              Chats
              {chatUnread > 0 && (
                <Badge variant="destructive" className="h-5 min-w-5 p-0 flex items-center justify-center text-[10px]">
                  {chatUnread > 99 ? '99+' : chatUnread}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="orders" 
              className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none h-full gap-1"
            >
              <Package className="w-4 h-4" />
              Orders
              {orderUnread > 0 && (
                <Badge variant="destructive" className="h-5 min-w-5 p-0 flex items-center justify-center text-[10px]">
                  {orderUnread}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="activities" 
              className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none h-full gap-1"
            >
              <Bell className="w-4 h-4" />
              Activities
              {activityUnread > 0 && (
                <Badge variant="destructive" className="h-5 min-w-5 p-0 flex items-center justify-center text-[10px]">
                  {activityUnread}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="promos" 
              className="flex-1 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none h-full gap-1"
            >
              <Megaphone className="w-4 h-4" />
              Promos
              {promoUnread > 0 && (
                <span className="w-2 h-2 bg-destructive rounded-full" />
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <div className="p-0">
        {activeTab === "chats" && (
          <ChatsTabContent 
            conversations={allConversations} 
            loading={loadingCustomer || loadingProvider}
            onSelectConversation={setSelectedConversation}
          />
        )}
        {activeTab === "orders" && (
          <NotificationsTabContent 
            notifications={orderNotifications} 
            loading={loadingNotifications}
            emptyIcon={<Package className="w-12 h-12 text-muted-foreground/50" />}
            emptyText="No order updates yet"
          />
        )}
        {activeTab === "activities" && (
          <NotificationsTabContent 
            notifications={activityNotifications} 
            loading={loadingNotifications}
            emptyIcon={<Bell className="w-12 h-12 text-muted-foreground/50" />}
            emptyText="No activities yet"
          />
        )}
        {activeTab === "promos" && (
          <NotificationsTabContent 
            notifications={promoNotifications} 
            loading={loadingNotifications}
            emptyIcon={<Megaphone className="w-12 h-12 text-muted-foreground/50" />}
            emptyText="No promotions yet"
          />
        )}
      </div>

      {/* Bottom AI Assistant Bar */}
      <div className="fixed bottom-16 left-0 right-0 p-3 bg-background border-t">
        <div className="flex items-center gap-2 bg-muted/50 rounded-full px-4 py-2 border">
          <Bot className="w-5 h-5 text-primary" />
          <span className="text-sm text-muted-foreground flex-1">
            Ask anything you want to know ✨
          </span>
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
      </div>
    </div>
  );
};

// Chats Tab Content
const ChatsTabContent = ({ 
  conversations, 
  loading,
  onSelectConversation 
}: { 
  conversations: Conversation[], 
  loading: boolean,
  onSelectConversation: (conv: Conversation) => void 
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
        <MessageCircle className="w-12 h-12 mb-2 opacity-50" />
        <p className="text-sm">No messages yet</p>
        <p className="text-xs mt-1">Start chatting with sellers or buyers</p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {/* System Message - Triviabees Bot */}
      <div className="bg-purple-50 dark:bg-purple-950/30">
        <div className="flex items-start gap-3 p-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">TriviaBee</p>
            <p className="text-sm text-foreground mt-1">
              👋 Welcome! Check your messages for updates from sellers and buyers.
            </p>
          </div>
        </div>
      </div>

      {/* Conversations */}
      {conversations.map((conv) => (
        <button
          key={conv.id}
          onClick={() => onSelectConversation(conv)}
          className="w-full p-4 flex items-start gap-3 hover:bg-muted/50 transition-colors text-left"
        >
          <div className="relative">
            <Avatar className="w-12 h-12">
              <AvatarImage src={conv.other_user_avatar || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-white">
                {conv.other_user_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            {(conv.unread_count || 0) > 0 && (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center px-1">
                {conv.unread_count}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className={`font-medium truncate ${(conv.unread_count || 0) > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                {conv.other_user_name}
              </p>
              <span className="text-xs text-muted-foreground ml-2 shrink-0">
                {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: false })}
              </span>
            </div>
            <p className={`text-sm mt-1 truncate ${(conv.unread_count || 0) > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
              {conv.last_message || 'No messages yet'}
            </p>
            {conv.reference_title && (
              <p className="text-xs text-muted-foreground mt-1 truncate">
                Re: {conv.reference_title}
              </p>
            )}
          </div>
          {conv.product_image && (
            <img 
              src={conv.product_image} 
              alt="" 
              className="w-12 h-12 rounded object-cover"
            />
          )}
        </button>
      ))}
    </div>
  );
};

// Notifications Tab Content
const NotificationsTabContent = ({ 
  notifications, 
  loading,
  emptyIcon,
  emptyText
}: { 
  notifications: Notification[], 
  loading: boolean,
  emptyIcon: React.ReactNode,
  emptyText: string
}) => {
  const markAsRead = async (id: string) => {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
        {emptyIcon}
        <p className="text-sm mt-2">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {/* System Header */}
      <div className="bg-purple-50 dark:bg-purple-950/30">
        <div className="flex items-start gap-3 p-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">TriviaBee</p>
            <p className="text-sm text-foreground mt-1">
              📦 Here are your latest updates
            </p>
          </div>
        </div>
      </div>

      {notifications.map((notification) => (
        <div
          key={notification.id}
          onClick={() => !notification.read && markAsRead(notification.id)}
          className={`p-4 cursor-pointer transition-colors ${
            !notification.read ? 'bg-primary/5' : ''
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              notification.type === 'order' ? 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400' :
              notification.type === 'reward' ? 'bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400' :
              notification.type === 'referral' ? 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400' :
              'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
            }`}>
              {notification.type === 'order' && <Package className="w-5 h-5" />}
              {notification.type === 'reward' && <Sparkles className="w-5 h-5" />}
              {notification.type === 'referral' && <Bell className="w-5 h-5" />}
              {!['order', 'reward', 'referral'].includes(notification.type) && <Bell className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className={`font-medium text-sm ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {notification.title}
                </p>
                {!notification.read && (
                  <span className="w-2 h-2 bg-primary rounded-full shrink-0 mt-1.5" />
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {notification.message}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default LazadaStyleMessages;
