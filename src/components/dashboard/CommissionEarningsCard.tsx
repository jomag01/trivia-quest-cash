import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  DollarSign, 
  Store, 
  Gavel, 
  CalendarCheck, 
  Utensils,
  ShoppingBag,
  Bell,
  CheckCircle,
  TrendingUp
} from "lucide-react";
import { format } from "date-fns";

interface CommissionEarning {
  id: string;
  source_category: string;
  sale_amount: number;
  referrer_commission: number;
  created_at: string;
  status: string;
  seller: {
    full_name: string | null;
    email: string | null;
  } | null;
}

interface CommissionNotification {
  id: string;
  source_type: string;
  amount: number;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface EarningsSummary {
  total: number;
  products: number;
  auctions: number;
  services: number;
  food: number;
  marketplace: number;
}

export function CommissionEarningsCard() {
  const { user } = useAuth();
  const [earnings, setEarnings] = useState<CommissionEarning[]>([]);
  const [notifications, setNotifications] = useState<CommissionNotification[]>([]);
  const [summary, setSummary] = useState<EarningsSummary>({
    total: 0, products: 0, auctions: 0, services: 0, food: 0, marketplace: 0
  });
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchEarnings();
      fetchNotifications();
      setupRealtimeSubscription();
    }
  }, [user]);

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('commission-notifications')
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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchEarnings = async () => {
    try {
      const { data, error } = await supabase
        .from("seller_referrer_earnings")
        .select(`
          id,
          source_category,
          sale_amount,
          referrer_commission,
          created_at,
          status,
          seller:profiles!seller_referrer_earnings_seller_id_fkey(full_name, email)
        `)
        .eq("referrer_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setEarnings(data || []);

      // Calculate summary
      const summ: EarningsSummary = {
        total: 0, products: 0, auctions: 0, services: 0, food: 0, marketplace: 0
      };
      (data || []).forEach(e => {
        summ.total += e.referrer_commission;
        if (e.source_category in summ) {
          (summ as any)[e.source_category] += e.referrer_commission;
        }
      });
      setSummary(summ);
    } catch (error) {
      console.error("Error fetching earnings:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from("commission_notifications")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setNotifications(data || []);
      setUnreadCount((data || []).filter(n => !n.is_read).length);
    } catch (error) {
      console.error("Error fetching notifications:", error);
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

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: React.ReactNode } = {
      products: <Store className="h-4 w-4 text-blue-500" />,
      auctions: <Gavel className="h-4 w-4 text-amber-500" />,
      services: <CalendarCheck className="h-4 w-4 text-purple-500" />,
      food: <Utensils className="h-4 w-4 text-green-500" />,
      marketplace: <ShoppingBag className="h-4 w-4 text-pink-500" />
    };
    return icons[category] || <DollarSign className="h-4 w-4" />;
  };

  const getCategoryLabel = (category: string) => {
    const labels: { [key: string]: string } = {
      products: "Shop Sales",
      auctions: "Auction",
      services: "Services",
      food: "Food Delivery",
      marketplace: "Marketplace"
    };
    return labels[category] || category;
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
            <TrendingUp className="h-5 w-5 text-primary" />
            Seller Referral Earnings
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount} new
              </Badge>
            )}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 bg-primary/10 rounded-lg">
            <p className="text-lg font-bold text-primary">₱{summary.total.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Total Earned</p>
          </div>
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <p className="text-lg font-bold text-blue-500">₱{summary.products.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Products</p>
          </div>
          <div className="p-2 bg-amber-500/10 rounded-lg">
            <p className="text-lg font-bold text-amber-500">₱{summary.auctions.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Auctions</p>
          </div>
        </div>

        {/* Notifications */}
        {notifications.filter(n => !n.is_read).length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Bell className="h-3 w-3" /> Recent Notifications
            </p>
            {notifications.filter(n => !n.is_read).slice(0, 3).map(notif => (
              <div 
                key={notif.id}
                className="p-2 bg-primary/5 border border-primary/20 rounded-lg flex items-center justify-between"
                onClick={() => markNotificationRead(notif.id)}
              >
                <div className="flex-1">
                  <p className="text-xs">{notif.message}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {format(new Date(notif.created_at), "MMM d, h:mm a")}
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs">
                  +₱{notif.amount.toLocaleString()}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {/* Earnings List */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Recent Earnings</p>
          {earnings.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Store className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No earnings yet</p>
              <p className="text-xs">Refer sellers to earn recurring commissions!</p>
            </div>
          ) : (
            <ScrollArea className="h-[200px]">
              <div className="space-y-2 pr-2">
                {earnings.map(earning => (
                  <div 
                    key={earning.id}
                    className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex-shrink-0 p-2 bg-background rounded-full">
                      {getCategoryIcon(earning.source_category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">
                          {getCategoryLabel(earning.source_category)}
                        </span>
                        {earning.status === 'processed' && (
                          <CheckCircle className="h-3 w-3 text-green-500" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        From: {earning.seller?.full_name || earning.seller?.email || 'Seller'}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Sale: ₱{earning.sale_amount.toLocaleString()} • {format(new Date(earning.created_at), "MMM d")}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-green-500">
                        +₱{earning.referrer_commission.toLocaleString()}
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
