import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Bell, 
  CheckCircle, 
  Users,
  TrendingUp,
  Crown,
  Hexagon,
  Store,
  DollarSign,
  Eye,
  Clock
} from "lucide-react";
import { format } from "date-fns";

interface CommissionNotification {
  id: string;
  commission_type: string | null;
  amount: number;
  source_type: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface CommissionSummary {
  unilevel: number;
  stairstep: number;
  leadership: number;
  beehives: number;
  seller_referrer: number;
  total: number;
}

export function CommissionNotificationsCard() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<CommissionNotification[]>([]);
  const [summary, setSummary] = useState<CommissionSummary>({
    unilevel: 0,
    stairstep: 0,
    leadership: 0,
    beehives: 0,
    seller_referrer: 0,
    total: 0
  });
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchCommissionSummary();
      setupRealtimeSubscription();
    }
  }, [user]);

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('commission-notifs')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'commission_notifications',
          filter: `user_id=eq.${user?.id}`
        },
        (payload) => {
          setNotifications(prev => [payload.new as CommissionNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          fetchCommissionSummary();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from("commission_notifications")
        .select("id, user_id, amount, source_type, message, is_read, created_at, commission_type")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setNotifications((data || []).map(n => ({
        ...n,
        commission_type: n.commission_type || n.source_type || 'commission'
      })) as CommissionNotification[]);
      setUnreadCount((data || []).filter(n => !n.is_read).length);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCommissionSummary = async () => {
    try {
      const { data, error } = await supabase
        .from("commissions")
        .select("commission_type, amount")
        .eq("user_id", user?.id);

      if (error) throw error;

      const summ: CommissionSummary = {
        unilevel: 0,
        stairstep: 0,
        leadership: 0,
        beehives: 0,
        seller_referrer: 0,
        total: 0
      };

      (data || []).forEach(c => {
        const amount = Number(c.amount) || 0;
        summ.total += amount;
        
        if (c.commission_type === 'unilevel') {
          summ.unilevel += amount;
        } else if (c.commission_type === 'stairstep') {
          summ.stairstep += amount;
        } else if (c.commission_type === 'leadership') {
          summ.leadership += amount;
        } else if (c.commission_type?.includes('binary') || c.commission_type?.includes('beehive')) {
          summ.beehives += amount;
        } else if (c.commission_type === 'seller_referrer') {
          summ.seller_referrer += amount;
        }
      });

      setSummary(summ);
    } catch (error) {
      console.error("Error fetching commission summary:", error);
    }
  };

  const markNotificationRead = async (id: string) => {
    await supabase
      .from("commission_notifications")
      .update({ is_read: true })
      .eq("id", id);
    
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    await supabase
      .from("commission_notifications")
      .update({ is_read: true })
      .eq("user_id", user?.id)
      .eq("is_read", false);
    
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const getTypeIcon = (type: string | null) => {
    const t = type || '';
    switch (t) {
      case 'unilevel': return <Users className="h-4 w-4 text-blue-500" />;
      case 'stairstep': return <TrendingUp className="h-4 w-4 text-purple-500" />;
      case 'leadership': return <Crown className="h-4 w-4 text-amber-500" />;
      case 'seller_referrer': return <Store className="h-4 w-4 text-green-500" />;
      default: 
        if (t.includes('binary') || t.includes('beehive') || t.includes('AI Beehives')) {
          return <Hexagon className="h-4 w-4 text-pink-500" />;
        }
        return <DollarSign className="h-4 w-4 text-primary" />;
    }
  };

  const getTypeBadgeColor = (type: string | null) => {
    const t = type || '';
    switch (t) {
      case 'unilevel': return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
      case 'stairstep': return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
      case 'leadership': return 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300';
      case 'seller_referrer': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      default: 
        if (t.includes('binary') || t.includes('beehive') || t.includes('AI Beehives')) {
          return 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300';
        }
        return 'bg-primary/10 text-primary';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5 text-primary" />
            Commission Earnings
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">
                {unreadCount} new
              </Badge>
            )}
          </CardTitle>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs h-7">
              <Eye className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Breakdown Summary by Origin */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <div className="p-2 bg-blue-500/10 rounded-lg text-center">
            <Users className="h-4 w-4 mx-auto text-blue-500 mb-1" />
            <p className="text-sm font-bold text-blue-600">₱{summary.unilevel.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Unilevel</p>
          </div>
          <div className="p-2 bg-purple-500/10 rounded-lg text-center">
            <TrendingUp className="h-4 w-4 mx-auto text-purple-500 mb-1" />
            <p className="text-sm font-bold text-purple-600">₱{summary.stairstep.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Stair-Step</p>
          </div>
          <div className="p-2 bg-amber-500/10 rounded-lg text-center">
            <Crown className="h-4 w-4 mx-auto text-amber-500 mb-1" />
            <p className="text-sm font-bold text-amber-600">₱{summary.leadership.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Leadership</p>
          </div>
          <div className="p-2 bg-pink-500/10 rounded-lg text-center">
            <Hexagon className="h-4 w-4 mx-auto text-pink-500 mb-1" />
            <p className="text-sm font-bold text-pink-600">₱{summary.beehives.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">AI Beehives</p>
          </div>
          <div className="p-2 bg-green-500/10 rounded-lg text-center">
            <Store className="h-4 w-4 mx-auto text-green-500 mb-1" />
            <p className="text-sm font-bold text-green-600">₱{summary.seller_referrer.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Seller Ref</p>
          </div>
          <div className="p-2 bg-primary/10 rounded-lg text-center">
            <DollarSign className="h-4 w-4 mx-auto text-primary mb-1" />
            <p className="text-sm font-bold text-primary">₱{summary.total.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Total</p>
          </div>
        </div>

        {/* Recent Notifications */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" /> Recent Commission Activity
          </p>
          {notifications.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <DollarSign className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No commission earnings yet</p>
              <p className="text-xs">Build your network to start earning!</p>
            </div>
          ) : (
            <ScrollArea className="h-[200px]">
              <div className="space-y-2 pr-2">
                {notifications.map(notif => (
                  <div 
                    key={notif.id}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      notif.is_read ? 'bg-muted/20' : 'bg-primary/5 border border-primary/20'
                    }`}
                    onClick={() => markNotificationRead(notif.id)}
                  >
                    <div className="flex-shrink-0 p-2 bg-background rounded-full">
                      {getTypeIcon(notif.commission_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`text-[10px] ${getTypeBadgeColor(notif.commission_type)}`}>
                          {notif.source_type || notif.commission_type}
                        </Badge>
                        {!notif.is_read && (
                          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {notif.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {format(new Date(notif.created_at), "MMM d, h:mm a")}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-green-500 text-sm">
                        +₱{Number(notif.amount).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
  );
}