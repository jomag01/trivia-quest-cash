import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useFoodCart } from "@/hooks/useFoodCart";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ShoppingCart, Plus, Minus, Trash2, MapPin, Bike } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const FoodCart = () => {
  const { user } = useAuth();
  const { cart, updateQuantity, removeFromCart, clearCart, getTotal, getTotalDiamonds } = useFoodCart();
  const [isOpen, setIsOpen] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [minimumOrder, setMinimumOrder] = useState(0);

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = getTotal();
  const totalDiamonds = getTotalDiamonds();
  const totalAmount = subtotal + deliveryFee;
  
  // Get vendor info for delivery fee
  const vendorId = cart[0]?.vendor_id;
  const vendorName = cart[0]?.vendor_name;

  // Fetch delivery fee when vendor changes
  useEffect(() => {
    const fetchVendorInfo = async () => {
      if (!vendorId) {
        setDeliveryFee(0);
        setMinimumOrder(0);
        return;
      }
      
      const { data: vendor } = await (supabase as any)
        .from("food_vendors")
        .select("delivery_fee, minimum_order")
        .eq("id", vendorId)
        .single();
      
      if (vendor) {
        setDeliveryFee(vendor.delivery_fee || 0);
        setMinimumOrder(vendor.minimum_order || 0);
      }
    };

    fetchVendorInfo();
  }, [vendorId]);

  const handlePlaceOrder = async () => {
    if (!user) {
      toast.error("Please log in to place an order");
      return;
    }

    if (!deliveryAddress) {
      toast.error("Please enter a delivery address");
      return;
    }

    if (!customerPhone) {
      toast.error("Please enter your phone number");
      return;
    }

    if (subtotal < minimumOrder) {
      toast.error(`Minimum order is ₱${minimumOrder}`);
      return;
    }

    setIsOrdering(true);

    try {
      // Check for referrer in localStorage
      const referrerId = localStorage.getItem("food_referrer_id");

      // Create order
      const orderNumber = `FO-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Get user profile for customer name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();

      const { data: order, error: orderError } = await (supabase as any)
        .from("food_orders")
        .insert({
          order_number: orderNumber,
          customer_id: user.id,
          customer_name: profile?.full_name || "Customer",
          vendor_id: vendorId,
          referrer_id: referrerId || null,
          subtotal,
          delivery_fee: deliveryFee,
          total_amount: totalAmount,
          diamond_reward: totalDiamonds,
          delivery_address: deliveryAddress,
          notes: deliveryNotes,
          customer_phone: customerPhone,
          payment_method: "cod",
          status: "pending", // Start as pending, vendor confirms and marks ready for riders
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items - use originalItemId for the database UUID
      const orderItems = cart.map((item) => ({
        order_id: order.id,
        item_id: item.originalItemId, // Use the actual menu item UUID, not the cart's composite ID
        item_name: item.name, // Include item name with customizations
        quantity: item.quantity,
        unit_price: item.price,
        subtotal: item.price * item.quantity,
      }));

      const { error: itemsError } = await (supabase as any)
        .from("food_order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Notify vendor about new order
      const { data: vendor } = await (supabase as any)
        .from("food_vendors")
        .select("owner_id")
        .eq("id", vendorId)
        .single();

      if (vendor?.owner_id) {
        await (supabase as any).from("notifications").insert({
          user_id: vendor.owner_id,
          type: "new_food_order",
          title: "New Food Order",
          message: `You have a new order #${orderNumber} for ₱${totalAmount.toFixed(2)}`,
        });
      }

      toast.success("Order placed successfully! The restaurant will confirm your order.");
      clearCart();
      setDeliveryAddress("");
      setDeliveryNotes("");
      setCustomerPhone("");
      setIsOpen(false);
      localStorage.removeItem("food_referrer_id");
    } catch (error: any) {
      toast.error(error.message || "Failed to place order");
    } finally {
      setIsOrdering(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <ShoppingCart className="w-5 h-5" />
          {totalItems > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
              {totalItems}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>Your Cart</SheetTitle>
        </SheetHeader>

        {cart.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <ShoppingCart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Your cart is empty</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {vendorName && (
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-sm font-medium">{vendorName}</p>
                </div>
              )}

              {cart.map((item) => (
                <div key={item.id} className="flex gap-3 border-b pb-3">
                  <img
                    src={item.image_url || "/placeholder.svg"}
                    alt={item.name}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{item.name}</h4>
                    <p className="text-sm text-muted-foreground">₱{item.price.toFixed(2)}</p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        onClick={() => removeFromCart(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">₱{(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                </div>
              ))}

              {/* Delivery Info */}
              <div className="space-y-4 pt-4">
                <div>
                  <Label className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4" />
                    Delivery Address *
                  </Label>
                  <Textarea
                    placeholder="Enter your complete delivery address"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    rows={2}
                  />
                </div>
                <div>
                  <Label className="mb-2 block">Phone Number *</Label>
                  <Input
                    placeholder="Your contact number"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="mb-2 block">Delivery Notes (Optional)</Label>
                  <Textarea
                    placeholder="Any special instructions..."
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="border-t pt-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>₱{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-1">
                  <Bike className="w-4 h-4" />
                  Delivery Fee
                </span>
                <span>{deliveryFee === 0 ? "Free" : `₱${deliveryFee.toFixed(2)}`}</span>
              </div>
              {totalDiamonds > 0 && (
                <div className="flex justify-between text-sm text-primary">
                  <span>Diamond Rewards</span>
                  <span>+{totalDiamonds} 💎</span>
                </div>
              )}
              {minimumOrder > 0 && subtotal < minimumOrder && (
                <div className="text-xs text-destructive">
                  Minimum order: ₱{minimumOrder} (₱{(minimumOrder - subtotal).toFixed(2)} more needed)
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t pt-3">
                <span>Total</span>
                <span>₱{totalAmount.toFixed(2)}</span>
              </div>
              <Button
                className="w-full"
                size="lg"
                onClick={handlePlaceOrder}
                disabled={isOrdering || !user || subtotal < minimumOrder}
              >
                {isOrdering ? "Placing Order..." : user ? "Place Order" : "Log in to Order"}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={clearCart}
              >
                Clear Cart
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};