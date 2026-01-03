import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  Star,
  RotateCcw,
  Search,
  Filter,
  ChevronLeft,
  Wallet,
  ShoppingBag,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { OrderStatusCarousel } from "@/components/shop/OrderStatusCarousel";
import { ReviewOrderDialog } from "@/components/shop/ReviewOrderDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type OrderTab = 'all' | 'to_pay' | 'to_ship' | 'to_receive' | 'to_review' | 'returns' | 'cancelled';

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  status: string;
  shipping_fee: number;
  tracking_number?: string;
  created_at: string;
  shipped_at?: string;
  delivered_at?: string;
  seller_id?: string;
  order_items: Array<{
    id: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    product_id: string;
    products: {
      id: string;
      name: string;
      image_url?: string;
    };
  }>;
  seller?: {
    full_name: string;
  } | null;
}

const tabConfig: { key: OrderTab; label: string; icon: React.ReactNode; statuses: string[] }[] = [
  { key: 'all', label: 'All', icon: <ShoppingBag className="w-5 h-5" />, statuses: [] },
  { key: 'to_pay', label: 'To Pay', icon: <Wallet className="w-5 h-5" />, statuses: ['pending_payment'] },
  { key: 'to_ship', label: 'To Ship', icon: <Package className="w-5 h-5" />, statuses: ['pending', 'processing'] },
  { key: 'to_receive', label: 'To Receive', icon: <Truck className="w-5 h-5" />, statuses: ['shipped'] },
  { key: 'to_review', label: 'To Review', icon: <Star className="w-5 h-5" />, statuses: ['delivered'] },
  { key: 'returns', label: 'Returns', icon: <RotateCcw className="w-5 h-5" />, statuses: ['returned', 'refunded'] },
  { key: 'cancelled', label: 'Cancelled', icon: <XCircle className="w-5 h-5" />, statuses: ['cancelled'] },
];

export const MyOrdersPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') as OrderTab | null;
  const [activeTab, setActiveTab] = useState<OrderTab>(tabFromUrl || 'all');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [orderCounts, setOrderCounts] = useState<Record<OrderTab, number>>({
    all: 0, to_pay: 0, to_ship: 0, to_receive: 0, to_review: 0, returns: 0, cancelled: 0
  });
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);
  const [reviewedOrderIds, setReviewedOrderIds] = useState<Set<string>>(new Set());

  // Sync tab with URL
  useEffect(() => {
    if (tabFromUrl && tabConfig.some(t => t.key === tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const handleTabChange = (tab: OrderTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const fetchOrders = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      // NOTE: We intentionally avoid relational embedding here because some projects
      // may not have foreign keys defined (which breaks nested selects).
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select(
          "id, order_number, total_amount, status, shipping_fee, tracking_number, created_at, shipped_at, delivered_at, seller_id",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (ordersError) throw ordersError;

      const orderIds = (ordersData || []).map((o: any) => o.id) as string[];

      const itemsByOrder: Record<string, Order["order_items"]> = {};

      if (orderIds.length > 0) {
        // Fetch order items and existing reviews in parallel
        const [itemsResult, reviewsResult] = await Promise.all([
          supabase
            .from("order_items")
            .select("id, order_id, quantity, unit_price, subtotal, product_id")
            .in("order_id", orderIds),
          supabase
            .from("product_reviews")
            .select("order_id")
            .eq("buyer_id", user.id)
            .in("order_id", orderIds),
        ]);

        if (itemsResult.error) throw itemsResult.error;
        
        // Track which orders have been reviewed
        const reviewedIds = new Set<string>();
        reviewsResult.data?.forEach((r: any) => {
          if (r.order_id) reviewedIds.add(r.order_id);
        });
        setReviewedOrderIds(reviewedIds);

        const productIds = Array.from(
          new Set((itemsResult.data || []).map((i: any) => i.product_id).filter(Boolean)),
        ) as string[];

        const productsById: Record<string, { id: string; name: string; image_url?: string }> = {};
        if (productIds.length > 0) {
          const { data: productsData, error: productsError } = await supabase
            .from("products")
            .select("id, name, image_url")
            .in("id", productIds);

          if (productsError) throw productsError;

          (productsData || []).forEach((p: any) => {
            productsById[p.id] = { id: p.id, name: p.name, image_url: p.image_url || undefined };
          });
        }

        (itemsResult.data || []).forEach((it: any) => {
          const enriched = {
            id: it.id,
            quantity: it.quantity,
            unit_price: it.unit_price,
            subtotal: it.subtotal,
            product_id: it.product_id,
            products: productsById[it.product_id] || { id: it.product_id, name: "Product" },
          } as Order["order_items"][number];

          (itemsByOrder[it.order_id] ||= []).push(enriched);
        });
      }

      const sellerIds = Array.from(
        new Set((ordersData || []).map((o: any) => o.seller_id).filter(Boolean)),
      ) as string[];

      const sellerById: Record<string, { full_name: string }> = {};
      if (sellerIds.length > 0) {
        const { data: sellersData, error: sellersError } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", sellerIds);

        if (sellersError) throw sellersError;

        (sellersData || []).forEach((s: any) => {
          sellerById[s.id] = { full_name: s.full_name };
        });
      }

      const merged = (ordersData || []).map((o: any) => {
        return {
          ...o,
          order_items: itemsByOrder[o.id] || [],
          seller: o.seller_id ? sellerById[o.seller_id] || null : null,
        } as Order;
      });

      setOrders(merged);

      // Calculate counts for each tab (exclude already reviewed orders from to_review count)
      const reviewedIds = new Set<string>();
      const { data: allReviews } = await supabase
        .from("product_reviews")
        .select("order_id")
        .eq("buyer_id", user.id);
      
      allReviews?.forEach((r: any) => {
        if (r.order_id) reviewedIds.add(r.order_id);
      });

      const counts: Record<OrderTab, number> = {
        all: merged.length,
        to_pay: 0,
        to_ship: 0,
        to_receive: 0,
        to_review: 0,
        returns: 0,
        cancelled: 0,
      };

      merged.forEach((order) => {
        tabConfig.forEach((tab) => {
          if (tab.key === "to_review") {
            // Only count delivered orders that haven't been reviewed
            if (order.status === "delivered" && !reviewedIds.has(order.id)) {
              counts[tab.key]++;
            }
          } else if (tab.key !== "all" && tab.statuses.includes(order.status)) {
            counts[tab.key]++;
          }
        });
      });

      setOrderCounts(counts);
    } catch (error: any) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to load orders");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchOrders();

    if (!user) return;

    const channel = supabase
      .channel(`orders-page-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `user_id=eq.${user.id}`,
        },
        () => fetchOrders(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchOrders]);

  const handleCancelOrder = useCallback(async () => {
    if (!cancelOrderId) return;
    
    setCancelling(true);
    try {
      // Check if order can be cancelled (only pending/pending_payment orders)
      const order = orders.find(o => o.id === cancelOrderId);
      if (!order || !['pending', 'pending_payment'].includes(order.status)) {
        toast.error("This order cannot be cancelled");
        return;
      }

      const { error } = await supabase
        .from("orders")
        .update({ status: 'cancelled' })
        .eq("id", cancelOrderId)
        .eq("user_id", user?.id);

      if (error) throw error;

      // Add to status history
      await supabase.from("order_status_history").insert({
        order_id: cancelOrderId,
        status: 'cancelled',
        notes: 'Cancelled by buyer'
      });

      toast.success("Order cancelled successfully");
      fetchOrders();
    } catch (error: any) {
      console.error("Error cancelling order:", error);
      toast.error("Failed to cancel order");
    } finally {
      setCancelling(false);
      setCancelOrderId(null);
    }
  }, [cancelOrderId, orders, user, fetchOrders]);

  const getFilteredOrders = useCallback(() => {
    let filtered = orders;
    
    // Filter by tab
    if (activeTab !== 'all') {
      const tabStatuses = tabConfig.find(t => t.key === activeTab)?.statuses || [];
      filtered = filtered.filter(order => tabStatuses.includes(order.status));
    }
    
    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(order => 
        order.order_number.toLowerCase().includes(query) ||
        order.order_items.some(item => 
          item.products?.name?.toLowerCase().includes(query)
        ) ||
        order.seller?.full_name?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [orders, activeTab, searchQuery]);

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "pending_payment":
        return { label: "To Pay", color: "bg-primary", icon: <Wallet className="w-4 h-4" /> };
      case "pending":
        return { label: "Pending", color: "bg-secondary", icon: <Clock className="w-4 h-4" /> };
      case "processing":
        return { label: "Processing", color: "bg-accent", icon: <Package className="w-4 h-4" /> };
      case "shipped":
        return { label: "In Transit", color: "bg-primary", icon: <Truck className="w-4 h-4" /> };
      case "delivered":
        return { label: "Delivered", color: "bg-primary", icon: <CheckCircle className="w-4 h-4" /> };
      case "cancelled":
        return { label: "Cancelled", color: "bg-destructive", icon: <XCircle className="w-4 h-4" /> };
      case "returned":
        return { label: "Returned", color: "bg-muted", icon: <RotateCcw className="w-4 h-4" /> };
      case "refunded":
        return { label: "Refunded", color: "bg-muted", icon: <RotateCcw className="w-4 h-4" /> };
      default:
        return { label: status, color: "bg-muted", icon: <Package className="w-4 h-4" /> };
    }
  };


  const canCancelOrder = (status: string) => {
    return ['pending', 'pending_payment'].includes(status);
  };

  const filteredOrders = getFilteredOrders();

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-6 text-center max-w-sm">
          <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold mb-2">Sign in to view orders</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Please sign in to access your order history
          </p>
          <Button onClick={() => navigate('/auth')}>Sign In</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background border-b">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">My Orders</h1>
          <div className="flex-1" />
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by seller name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <Button variant="ghost" size="icon">
            <Filter className="w-5 h-5" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto scrollbar-hide border-b">
          {tabConfig.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium relative transition-colors ${
                activeTab === tab.key 
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
              {orderCounts[tab.key] > 0 && tab.key !== 'all' && (
                <span className="absolute -top-0 right-1 bg-destructive text-destructive-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {orderCounts[tab.key]}
                </span>
              )}
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {!loading && orders.length > 0 && (
          <OrderStatusCarousel orders={orders} onSelectTab={handleTabChange} />
        )}

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-20 h-20 bg-muted rounded" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                    <div className="h-3 bg-muted rounded w-1/4" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-32 h-32 bg-muted rounded-full flex items-center justify-center mb-4">
              <Package className="w-16 h-16 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Your order list is empty</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start by exploring our products and great deals!
            </p>
            <Button onClick={() => navigate('/shop')} className="bg-primary">
              Continue shopping
            </Button>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <Card key={order.id} className="overflow-hidden">
              {/* Seller Header */}
              <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" />
                  <span className="font-medium text-sm">
                    {order.seller?.full_name || 'Shop'}
                  </span>
                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                </div>
                <Badge className={`${getStatusDisplay(order.status).color} text-white text-xs`}>
                  {getStatusDisplay(order.status).label}
                </Badge>
              </div>

              {/* Order Items */}
              <div className="p-4 space-y-3">
                {order.order_items.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="w-20 h-20 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                      {item.products?.image_url ? (
                        <img
                          src={item.products.image_url}
                          alt={item.products.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm line-clamp-2">{item.products?.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">Qty: {item.quantity}</p>
                      <p className="font-semibold text-primary mt-1">
                        ₱{item.subtotal.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Status Info */}
              {order.status === "shipped" && (
                <div className="px-4 py-2 bg-muted/40 border-t flex items-center gap-2">
                  <Truck className="w-4 h-4 text-foreground" />
                  <span className="text-sm text-muted-foreground">
                    In Transit |{" "}
                    {order.tracking_number
                      ? `Tracking: ${order.tracking_number}`
                      : "Your parcel is on the way"}
                  </span>
                </div>
              )}


              {/* Order Footer */}
              <div className="px-4 py-3 border-t bg-muted/30 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Total ({order.order_items.length} item{order.order_items.length > 1 ? 's' : ''}):
                  </p>
                  <p className="font-bold text-lg text-primary">
                    ₱{order.total_amount.toFixed(2)}
                  </p>
                </div>
                <div className="flex gap-2">
                  {canCancelOrder(order.status) && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setCancelOrderId(order.id)}
                    >
                      Cancel
                    </Button>
                  )}
                  {order.status === 'delivered' && !reviewedOrderIds.has(order.id) && (
                    <Button 
                      size="sm" 
                      className="bg-primary"
                      onClick={() => setReviewOrder(order)}
                    >
                      <Star className="w-4 h-4 mr-1" />
                      Review
                    </Button>
                  )}
                  {order.status === 'delivered' && reviewedOrderIds.has(order.id) && (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Reviewed
                    </Badge>
                  )}
                  {order.status === 'pending_payment' && (
                    <Button size="sm" className="bg-primary">
                      Pay Now
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Cancel Order Dialog */}
      <AlertDialog open={!!cancelOrderId} onOpenChange={() => setCancelOrderId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Order?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this order? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Order</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancelOrder}
              className="bg-destructive text-destructive-foreground"
              disabled={cancelling}
            >
              {cancelling ? 'Cancelling...' : 'Cancel Order'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Review Order Dialog */}
      {reviewOrder && (
        <ReviewOrderDialog
          open={!!reviewOrder}
          onOpenChange={(open) => !open && setReviewOrder(null)}
          orderId={reviewOrder.id}
          orderItems={reviewOrder.order_items}
          sellerId={reviewOrder.seller_id}
          onSuccess={() => {
            fetchOrders();
            setReviewOrder(null);
          }}
        />
      )}
    </div>
  );
};

export default MyOrdersPage;
