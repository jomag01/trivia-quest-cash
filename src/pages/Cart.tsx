import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Trash2, Plus, Minus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { CheckoutDialog } from "@/components/CheckoutDialog";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

const Cart = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showCheckout, setShowCheckout] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([
    {
      id: "1",
      name: "Premium Game Pass",
      price: 99.99,
      quantity: 1,
      image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400",
    },
  ]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="p-8 text-center max-w-md">
          <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-4">Login Required</h2>
          <p className="text-muted-foreground mb-6">
            Please login to view your cart
          </p>
          <Button onClick={() => navigate("/auth")}>Login</Button>
        </Card>
      </div>
    );
  }

  const updateQuantity = (id: string, delta: number) => {
    setCartItems(
      cartItems.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item
      )
    );
  };

  const removeFromCart = (id: string) => {
    setCartItems(cartItems.filter((item) => item.id !== id));
    toast.success("Removed from cart");
  };

  const total = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const handleCheckout = () => {
    setShowCheckout(true);
  };

  const handleCheckoutComplete = () => {
    setCartItems([]);
    toast.success("Thank you for your order!");
  };

  return (
    <div className="container mx-auto py-8 px-4 min-h-screen">
      <div className="flex items-center gap-3 mb-8">
        <ShoppingCart className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold text-gradient-gold">Shopping Cart</h1>
      </div>

      {cartItems.length === 0 ? (
        <Card className="p-12 text-center">
          <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
          <p className="text-muted-foreground mb-6">
            Add some items from the shop!
          </p>
          <Button onClick={() => navigate("/shop")}>Go to Shop</Button>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <Card key={item.id} className="p-4 gradient-accent border-primary/20">
                <div className="flex gap-4">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-24 h-24 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2">{item.name}</h3>
                    <p className="text-lg font-bold text-primary mb-3">
                      ${item.price.toFixed(2)}
                    </p>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => updateQuantity(item.id, -1)}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="w-8 text-center font-bold">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => updateQuantity(item.id, 1)}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => removeFromCart(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="lg:col-span-1">
            <Card className="p-6 gradient-primary border-primary/20 sticky top-20">
              <h2 className="text-2xl font-bold mb-6">Order Summary</h2>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-bold">${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="font-bold">${(total * 0.1).toFixed(2)}</span>
                </div>
                <div className="border-t border-primary/20 pt-3">
                  <div className="flex justify-between text-xl">
                    <span className="font-bold">Total</span>
                    <span className="font-bold text-primary">
                      ${(total * 1.1).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
              <Button className="w-full" onClick={handleCheckout}>
                Proceed to Checkout
              </Button>
            </Card>
          </div>
        </div>
      )}

      <CheckoutDialog 
        open={showCheckout}
        onOpenChange={setShowCheckout}
        cartTotal={total}
        onCheckoutComplete={handleCheckoutComplete}
      />
    </div>
  );
};

export default Cart;
