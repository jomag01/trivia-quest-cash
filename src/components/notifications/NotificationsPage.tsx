import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Bell, Package, Gift, Info, Users, Heart, MessageCircle, 
  AtSign, UserPlus, Settings, Check, Trash2, ChevronLeft,
  ShoppingBag, Radio, TrendingUp
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  order_id: string | null;
  reference_id: string | null;
  created_at: string;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    if (user) {
      fetchNotifications();
      
      const channel = supabase
        .channel('notifications-channel')
        .on(
          'postgres_changes' as any,
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          } as any,
          (payload: any) => {
            setNotifications(prev => [payload.new as Notification, ...prev]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setNotifications((data as Notification[]) || []);
    } catch (error: any) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from("notifications")
        .update({ read: true })
        .eq("id", id);

      if (error) throw error;
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
    } catch (error: any) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await (supabase as any)
        .from("notifications")
        .update({ read: true })
        .eq("read", false);

      if (error) throw error;
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      toast.success("All notifications marked as read");
    } catch (error: any) {
      toast.error("Failed to mark notifications as read");
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from("notifications")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success("Notification deleted");
    } catch (error: any) {
      toast.error("Failed to delete notification");
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "order":
        return <Package className="h-5 w-5" />;
      case "reward":
        return <Gift className="h-5 w-5" />;
      case "referral":
        return <Gift className="h-5 w-5" />;
      case "signup":
      case "follow":
        return <UserPlus className="h-5 w-5" />;
      case "upline_transfer":
        return <Users className="h-5 w-5" />;
      case "like":
        return <Heart className="h-5 w-5" />;
      case "comment":
        return <MessageCircle className="h-5 w-5" />;
      case "mention":
        return <AtSign className="h-5 w-5" />;
      case "live":
        return <Radio className="h-5 w-5" />;
      case "sale":
        return <ShoppingBag className="h-5 w-5" />;
      case "trending":
        return <TrendingUp className="h-5 w-5" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case "order":
        return "bg-blue-500/10 text-blue-500";
      case "reward":
        return "bg-green-500/10 text-green-500";
      case "referral":
        return "bg-amber-500/10 text-amber-500";
      case "signup":
      case "follow":
        return "bg-primary/10 text-primary";
      case "like":
        return "bg-pink-500/10 text-pink-500";
      case "comment":
        return "bg-cyan-500/10 text-cyan-500";
      case "mention":
        return "bg-purple-500/10 text-purple-500";
      case "live":
        return "bg-red-500/10 text-red-500";
      case "sale":
        return "bg-emerald-500/10 text-emerald-500";
      case "trending":
        return "bg-orange-500/10 text-orange-500";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const notifDate = new Date(date);
    const diffMs = now.getTime() - notifDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return notifDate.toLocaleDateString();
  };

  const filterNotifications = (tab: string) => {
    if (tab === "all") return notifications;
    return notifications.filter(n => {
      switch (tab) {
        case "likes":
          return n.type === "like";
        case "comments":
          return n.type === "comment";
        case "mentions":
          return n.type === "mention";
        case "followers":
          return n.type === "follow" || n.type === "signup";
        case "system":
          return ["order", "reward", "referral", "sale", "upline_transfer"].includes(n.type);
        default:
          return true;
      }
    });
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const filteredNotifications = filterNotifications(activeTab);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="animate-pulse space-y-4 p-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full"
              onClick={() => navigate(-1)}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">Notifications</h1>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="rounded-full px-2 py-0.5 text-xs">
                  {unreadCount}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={markAllAsRead}
                className="text-primary"
              >
                <Check className="w-4 h-4 mr-1" />
                Read all
              </Button>
            )}
            <Button variant="ghost" size="icon" className="rounded-full">
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start gap-1 bg-transparent px-4 pb-2 h-auto overflow-x-auto flex-nowrap">
            {["all", "likes", "comments", "mentions", "followers", "system"].map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="px-4 py-2 rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground capitalize text-sm whitespace-nowrap"
              >
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Notifications List */}
      <div className="p-4 space-y-2">
        {filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <Bell className="w-10 h-10 text-muted-foreground" />
            </div>
            <p className="font-medium text-lg">No notifications</p>
            <p className="text-sm text-muted-foreground">
              {activeTab === "all" ? "You're all caught up!" : `No ${activeTab} notifications`}
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {filteredNotifications.map((notification, index) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ delay: index * 0.02 }}
              >
                <Card
                  className={`p-4 cursor-pointer transition-all hover:bg-muted/50 group ${
                    !notification.read ? "bg-primary/5 border-primary/20" : ""
                  }`}
                  onClick={() => !notification.read && markAsRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-full flex-shrink-0 ${getIconColor(notification.type)}`}>
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm line-clamp-1">{notification.title}</p>
                          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {!notification.read && (
                            <div className="w-2 h-2 rounded-full bg-primary" />
                          )}
                          <span className="text-xs text-muted-foreground">
                            {getTimeAgo(notification.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity rounded-full h-8 w-8 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}