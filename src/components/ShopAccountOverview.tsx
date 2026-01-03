import { Package, Users, Calculator, Award, ShoppingCart, Heart, Store, Wallet, Truck, Star, RotateCcw, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const ShopAccountOverview = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orderCounts, setOrderCounts] = useState({
    to_pay: 0,
    to_ship: 0,
    to_receive: 0,
    to_review: 0,
    returns: 0
  });

  const fetchOrderCounts = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("orders")
        .select("status")
        .eq("user_id", user.id);

      if (error) throw error;

      const counts = {
        to_pay: 0,
        to_ship: 0,
        to_receive: 0,
        to_review: 0,
        returns: 0,
      };

      (data || []).forEach((order: { status: string }) => {
        if (order.status === "pending_payment") counts.to_pay++;
        else if (["pending", "processing"].includes(order.status)) counts.to_ship++;
        else if (order.status === "shipped") counts.to_receive++;
        else if (order.status === "delivered") counts.to_review++;
        else if (["returned", "refunded", "cancelled"].includes(order.status)) counts.returns++;
      });

      setOrderCounts(counts);
    } catch (error) {
      console.error("Error fetching order counts:", error);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    fetchOrderCounts();

    const channel = supabase
      .channel(`orders-counts-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `user_id=eq.${user.id}`,
        },
        () => fetchOrderCounts(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchOrderCounts]);


  const orderStatusLinks = [
    { icon: Wallet, label: "To Pay", href: "/my-orders?tab=to_pay", count: orderCounts.to_pay },
    { icon: Package, label: "To Ship", href: "/my-orders?tab=to_ship", count: orderCounts.to_ship },
    { icon: Truck, label: "To Receive", href: "/my-orders?tab=to_receive", count: orderCounts.to_receive },
    { icon: Star, label: "To Review", href: "/my-orders?tab=to_review", count: orderCounts.to_review },
    { icon: RotateCcw, label: "Returns", href: "/my-orders?tab=returns", count: orderCounts.returns },
  ];
  
  const quickLinks = [
    { icon: Users, label: "Affiliates", href: "/dashboard?tab=network", color: "bg-purple-600 text-white" },
    { icon: Calculator, label: "Calculator", href: "/dashboard?tab=calculator", color: "bg-green-600 text-white" },
    { icon: Award, label: "Leadership", href: "/dashboard?tab=leadership", color: "bg-amber-500 text-white" },
    { icon: ShoppingCart, label: "Cart", href: "/dashboard?tab=cart", color: "bg-red-600 text-white" },
    { icon: Heart, label: "Wishlist", href: "/dashboard?tab=wishlist", color: "bg-pink-600 text-white" },
    { icon: Store, label: "Seller", href: "/shop?tab=seller", color: "bg-orange-600 text-white" },
  ];

  const handleClick = (href: string) => {
    navigate(href);
  };

  return (
    <div className="space-y-4">
      {/* My Orders Section - Lazada Style */}
      <div className="bg-card rounded-lg p-3 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">My Orders</h3>
          <button 
            onClick={() => navigate('/my-orders')}
            className="text-xs text-primary flex items-center gap-1"
          >
            View All Orders <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="flex justify-between">
          {orderStatusLinks.map((item) => (
            <button
              key={item.label}
              onClick={() => handleClick(item.href)}
              className="flex flex-col items-center gap-1 min-w-[55px] text-center relative"
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-muted relative">
                <item.icon className="w-5 h-5 text-foreground" />
                {item.count > 0 && (
                  <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center font-medium">
                    {item.count > 99 ? '99+' : item.count}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Quick Links */}
      <div className="flex gap-3 overflow-x-auto py-2 px-1 scrollbar-hide">
        {quickLinks.map((item) => (
          <button
            key={item.label}
            onClick={() => handleClick(item.href)}
            className="flex flex-col items-center gap-1 min-w-[50px] text-center"
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.color}`}>
              <item.icon className="w-4 h-4" />
            </div>
            <span className="text-[10px] text-muted-foreground font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ShopAccountOverview;
