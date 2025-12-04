import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ShoppingCart, Trash2, Plus, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export const CartView = () => {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutDialog, setCheckoutDialog] = useState(false);
  const [shippingAddress, setShippingAddress] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [shippingFee] = useState(50);
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [userCredits, setUserCredits] = useState(0);
  const [userDiamonds, setUserDiamonds] = useState(0);
  const [isVerified, setIsVerified] = useState(false);
  const [checkingVerification, setCheckingVerification] = useState(true);

  useEffect(() => {
    if (user) {
      fetchCart();
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      setCheckingVerification(true);
      
      // Fetch profile data (credits and verification status)
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("credits, is_verified")
        .eq("id", user?.id)
        .maybeSingle();

      if (profileError) throw profileError;

      setUserCredits(profile?.credits || 0);
      setIsVerified(profile?.is_verified || false);

      // Fetch treasure wallet (diamonds)
      const { data: wallet, error: walletError } = await supabase
        .from("treasure_wallet")
        .select("diamonds")
        .eq("user_id", user?.id)
        .single();

      if (walletError && walletError.code !== "PGRST116") {
        throw walletError;
      }

      setUserDiamonds(wallet?.diamonds || 0);
    } catch (error: any) {
      console.error("Error fetching user data:", error);
    } finally {
      setCheckingVerification(false);
    }
  };

  const fetchCart = async () => {
    try {
      const { data, error } = await supabase
        .from("cart")
        .select("*, products(*)")
        .eq("user_id", user?.id);

      if (error) throw error;
      setCartItems(data || []);
    } catch (error: any) {
      console.error("Error fetching cart:", error);
      toast.error("Failed to load cart");
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (cartId: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    try {
      const { error } = await supabase
        .from("cart")
        .update({ quantity: newQuantity })
        .eq("id", cartId);

      if (error) throw error;
      fetchCart();
      toast.success("Quantity updated");
    } catch (error: any) {
      console.error("Error updating quantity:", error);
      toast.error("Failed to update quantity");
    }
  };

  const removeFromCart = async (cartId: string) => {
    try {
      const { error } = await supabase.from("cart").delete().eq("id", cartId);

      if (error) throw error;
      fetchCart();
      toast.success("Removed from cart");
    } catch (error: any) {
      console.error("Error removing from cart:", error);
      toast.error("Failed to remove item");
    }
  };

  const getEffectivePrice = (product: any) => {
    if (!product) return 0;
    if (product.promo_active && product.promo_price) {
      return product.promo_price;
    }
    return product.base_price;
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      return total + getEffectivePrice(item.products) * item.quantity;
    }, 0);
  };

  const handleCheckout = async () => {
    if (!customerName || !customerEmail || !shippingAddress) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!paymentMethod) {
      toast.error("Please select a payment method");
      return;
    }

    // Validate payment method for first-time users
    if (!isVerified && paymentMethod === "cod") {
      toast.error("First-time users must pay via GCash or Bank Transfer to become verified affiliates");
      return;
    }

    const subtotal = calculateTotal();
    const totalAmount = subtotal + shippingFee;
    const diamondsRequired = Math.ceil(totalAmount / 10);

    // Validate credits/diamonds if selected
    if (paymentMethod === "credits" && userCredits < totalAmount) {
      toast.error(`Insufficient credits. You need ₱${totalAmount} but have ₱${userCredits}`);
      return;
    }

    if (paymentMethod === "diamonds") {
      if (userDiamonds < diamondsRequired) {
        toast.error(`Insufficient diamonds. You need ${diamondsRequired} diamonds (₱10 each) but have ${userDiamonds}`);
        return;
      }
      if (totalAmount % 10 !== 0) {
        toast.error("Diamond payments require amounts in multiples of ₱10");
        return;
      }
    }

    try {
      const { data: orderNumberData, error: orderNumError } = await supabase.rpc(
        "generate_order_number"
      );

      if (orderNumError) throw orderNumError;

      const subtotal = calculateTotal();
      const totalAmount = subtotal + shippingFee;

      // Check for live stream referrer
      const liveStreamReferrers = JSON.parse(localStorage.getItem('live_stream_referrers') || '[]');
      const cartProductIds = cartItems.map(item => item.product_id);
      const matchingReferrer = liveStreamReferrers.find((r: any) => cartProductIds.includes(r.product_id));

      // Create order with live stream tracking if applicable
      const orderData: any = {
        user_id: user?.id,
        order_number: orderNumberData,
        total_amount: totalAmount,
        shipping_fee: shippingFee,
        shipping_address: shippingAddress,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        status: "pending",
        payment_method: paymentMethod,
      };

      // Add live stream referrer tracking for commission calculation
      if (matchingReferrer) {
        orderData.live_stream_id = matchingReferrer.stream_id;
        orderData.live_streamer_id = matchingReferrer.streamer_id;
        orderData.product_referrer_id = matchingReferrer.streamer_id;
      }

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert(orderData)
        .select()
        .single();

      if (orderError) throw orderError;

      // Clear live stream referrers from localStorage after order
      if (matchingReferrer) {
        const updatedReferrers = liveStreamReferrers.filter(
          (r: any) => !cartProductIds.includes(r.product_id)
        );
        localStorage.setItem('live_stream_referrers', JSON.stringify(updatedReferrers));
      }

      // Calculate total diamond credits and create order items from cart
      const totalDiamondCredits = cartItems.reduce((total, item) => {
        return total + ((item.products?.diamond_reward || 0) * item.quantity);
      }, 0);

      const orderItems = cartItems.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: getEffectivePrice(item.products),
        subtotal: getEffectivePrice(item.products) * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Update order with total diamond credits
      const { error: updateError } = await supabase
        .from("orders")
        .update({ total_diamond_credits: totalDiamondCredits })
        .eq("id", order.id);

      if (updateError) throw updateError;

      // Deduct credits or diamonds if used
      if (paymentMethod === "credits") {
        const { error: creditsError } = await supabase
          .from("profiles")
          .update({ credits: userCredits - totalAmount })
          .eq("id", user?.id);

        if (creditsError) throw creditsError;
      } else if (paymentMethod === "diamonds") {
        const { error: diamondsError } = await supabase
          .from("treasure_wallet")
          .update({ diamonds: userDiamonds - diamondsRequired })
          .eq("user_id", user?.id);

        if (diamondsError) throw diamondsError;
      }

      // Clear cart
      const { error: clearError } = await supabase
        .from("cart")
        .delete()
        .eq("user_id", user?.id);

      if (clearError) throw clearError;

      toast.success(
        `Order placed successfully! Order #${orderNumberData}. ${
          paymentMethod === "credits"
            ? `₱${totalAmount} deducted from credits`
            : paymentMethod === "diamonds"
            ? `${diamondsRequired} diamonds deducted`
            : ""
        }`
      );
      setCheckoutDialog(false);
      fetchCart();
      fetchUserData();
      setShippingAddress("");
      setCustomerName("");
      setCustomerEmail("");
      setCustomerPhone("");
      setPaymentMethod("");
    } catch (error: any) {
      console.error("Error creating order:", error);
      toast.error("Failed to place order");
    }
  };

  const getAvailablePaymentMethods = () => {
    const methods = [];
    
    if (isVerified) {
      methods.push({ value: "cod", label: "Cash on Delivery" });
    }
    
    methods.push(
      { value: "gcash", label: "GCash" },
      { value: "bank_transfer", label: "Bank Transfer" }
    );

    const subtotal = calculateTotal();
    const totalAmount = subtotal + shippingFee;
    const diamondsRequired = Math.ceil(totalAmount / 10);

    if (userCredits >= totalAmount) {
      methods.push({
        value: "credits",
        label: `Pay with Credits (Available: ₱${userCredits})`,
      });
    }

    if (userDiamonds >= diamondsRequired && totalAmount % 10 === 0) {
      methods.push({
        value: "diamonds",
        label: `Pay with Diamonds (Need: ${diamondsRequired}, Available: ${userDiamonds})`,
      });
    }

    return methods;
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <ShoppingCart className="w-8 h-8 text-primary animate-pulse" />
        </div>
      </Card>
    );
  }

  if (cartItems.length === 0) {
    return (
      <Card className="p-6 text-center">
        <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">Your cart is empty</p>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {cartItems.map((item) => (
          <Card key={item.id} className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-semibold">{item.products?.name}</h3>
                <p className="text-sm text-muted-foreground">
                  ₱{getEffectivePrice(item.products).toFixed(2)} each
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  disabled={item.quantity <= 1}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="w-12 text-center font-semibold">
                  {item.quantity}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <div className="text-right">
                <p className="font-bold text-primary">
                  ₱{(getEffectivePrice(item.products) * item.quantity).toFixed(2)}
                </p>
              </div>

              <Button
                size="sm"
                variant="destructive"
                onClick={() => removeFromCart(item.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ))}

        <Card className="p-6">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>₱{calculateTotal().toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Shipping Fee:</span>
              <span>₱{shippingFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-xl font-bold">Total:</span>
              <span className="text-2xl font-bold text-primary">
                ₱{(calculateTotal() + shippingFee).toFixed(2)}
              </span>
            </div>
          </div>
          <Button className="w-full" size="lg" onClick={() => setCheckoutDialog(true)}>
            <ShoppingCart className="w-4 h-4 mr-2" />
            Proceed to Checkout
          </Button>
        </Card>
      </div>

      {/* Checkout Dialog */}
      <Dialog open={checkoutDialog} onOpenChange={setCheckoutDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Your Order</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {!isVerified && (
                <span className="text-yellow-600 font-semibold">
                  ⚠️ First-time users: Pay via GCash or Bank Transfer to become a verified affiliate
                </span>
              )}
            </p>
          </DialogHeader>

          <div className="space-y-4">
            {/* User Status Info */}
            <div className="p-3 bg-secondary rounded-lg space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Status:</span>
                <span className={isVerified ? "text-green-600" : "text-yellow-600"}>
                  {isVerified ? "✓ Verified Affiliate" : "⚠ Unverified (First Order)"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Available Credits:</span>
                <span>₱{userCredits}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Available Diamonds:</span>
                <span>{userDiamonds} (₱10 each)</span>
              </div>
            </div>
            <div>
              <Label htmlFor="customerName">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="customerEmail">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="customerEmail"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="customerPhone">Phone Number</Label>
              <Input
                id="customerPhone"
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="shippingAddress">
                Shipping Address <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="shippingAddress"
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                rows={3}
                required
              />
            </div>

            {/* Payment Method Selection */}
            <div>
              <Label htmlFor="paymentMethod">
                Payment Method <span className="text-red-500">*</span>
              </Label>
              <select
                id="paymentMethod"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full p-2 border rounded-md bg-background"
                required
              >
                <option value="">Select payment method</option>
                {getAvailablePaymentMethods().map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
              {!isVerified && (
                <p className="text-xs text-yellow-600 mt-1">
                  Note: Cash on Delivery is only available for verified users
                </p>
              )}
              {paymentMethod === "diamonds" && calculateTotal() % 10 !== 0 && (
                <p className="text-xs text-red-600 mt-1">
                  Diamond payments require amounts in multiples of ₱10
                </p>
              )}
            </div>

            <div className="pt-4 border-t space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>₱{calculateTotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Shipping Fee:</span>
                <span>₱{shippingFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span className="text-primary">₱{(calculateTotal() + shippingFee).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCheckout}>Place Order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
