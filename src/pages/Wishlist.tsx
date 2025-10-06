import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface WishlistItem {
  id: string;
  name: string;
  price: number;
  image: string;
}

const Wishlist = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([
    {
      id: "1",
      name: "Premium Game Pass",
      price: 99.99,
      image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400",
    },
    {
      id: "2",
      name: "Exclusive Avatar Pack",
      price: 29.99,
      image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400",
    },
  ]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="p-8 text-center max-w-md">
          <Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-4">Login Required</h2>
          <p className="text-muted-foreground mb-6">
            Please login to view your wishlist
          </p>
          <Button onClick={() => navigate("/auth")}>Login</Button>
        </Card>
      </div>
    );
  }

  const removeFromWishlist = (id: string) => {
    setWishlistItems(wishlistItems.filter((item) => item.id !== id));
    toast.success("Removed from wishlist");
  };

  const addToCart = (item: WishlistItem) => {
    toast.success(`${item.name} added to cart!`);
  };

  return (
    <div className="container mx-auto py-8 px-4 min-h-screen">
      <div className="flex items-center gap-3 mb-8">
        <Heart className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold text-gradient-gold">My Wishlist</h1>
      </div>

      {wishlistItems.length === 0 ? (
        <Card className="p-12 text-center">
          <Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Your wishlist is empty</h2>
          <p className="text-muted-foreground mb-6">
            Browse the shop and add items you love!
          </p>
          <Button onClick={() => navigate("/shop")}>Go to Shop</Button>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {wishlistItems.map((item) => (
            <Card key={item.id} className="p-4 gradient-accent border-primary/20">
              <img
                src={item.image}
                alt={item.name}
                className="w-full h-48 object-cover rounded-lg mb-4"
              />
              <h3 className="text-xl font-bold mb-2">{item.name}</h3>
              <p className="text-2xl font-bold text-primary mb-4">
                ${item.price.toFixed(2)}
              </p>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => addToCart(item)}
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Add to Cart
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => removeFromWishlist(item.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Wishlist;
