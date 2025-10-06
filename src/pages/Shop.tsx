import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Heart, Star } from "lucide-react";
import { toast } from "sonner";

const products = [
  {
    id: 1,
    name: "Premium Game T-Shirt",
    price: "₱599",
    image: "🎮",
    category: "Clothing",
    rating: 4.5
  },
  {
    id: 2,
    name: "Lucky Winner Cap",
    price: "₱399",
    image: "🧢",
    category: "Accessories",
    rating: 4.8
  },
  {
    id: 3,
    name: "Champion Hoodie",
    price: "₱1,299",
    image: "👕",
    category: "Clothing",
    rating: 4.9
  },
  {
    id: 4,
    name: "Winner's Mug",
    price: "₱299",
    image: "☕",
    category: "Merchandise",
    rating: 4.3
  },
  {
    id: 5,
    name: "Game Master Backpack",
    price: "₱1,899",
    image: "🎒",
    category: "Accessories",
    rating: 4.7
  },
  {
    id: 6,
    name: "Victory Sneakers",
    price: "₱2,499",
    image: "👟",
    category: "Footwear",
    rating: 4.6
  }
];

const Shop = () => {
  const handleAddToCart = (productName: string) => {
    toast.success(`${productName} added to cart!`);
  };

  const handleAddToWishlist = (productName: string) => {
    toast.success(`${productName} added to wishlist!`);
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gradient-gold">
            Game Shop
          </h1>
          <p className="text-lg text-foreground/80">
            Exclusive merchandise for our gaming community
          </p>
        </div>

        {/* Products Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <Card 
              key={product.id}
              className="gradient-accent border-primary/20 shadow-card hover:shadow-gold transition-smooth overflow-hidden group"
            >
              <div className="p-6">
                {/* Product Image */}
                <div className="text-8xl text-center mb-4 group-hover:scale-110 transition-smooth">
                  {product.image}
                </div>

                {/* Category Badge */}
                <Badge className="mb-3 bg-primary/20 text-primary border-primary/30">
                  {product.category}
                </Badge>

                {/* Product Info */}
                <h3 className="text-xl font-bold mb-2">{product.name}</h3>
                
                {/* Rating */}
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < Math.floor(product.rating)
                          ? "fill-primary text-primary"
                          : "text-muted-foreground"
                      }`}
                    />
                  ))}
                  <span className="text-sm text-muted-foreground ml-2">
                    ({product.rating})
                  </span>
                </div>

                {/* Price */}
                <div className="text-2xl font-bold text-primary mb-4">
                  {product.price}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button 
                    className="flex-1"
                    onClick={() => handleAddToCart(product.name)}
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Add to Cart
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleAddToWishlist(product.name)}
                  >
                    <Heart className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Affiliate Earnings Badge */}
              <div className="bg-primary/10 border-t border-primary/20 p-3 text-center text-sm">
                <span className="text-primary font-semibold">Earn 10% commission</span>
                <span className="text-muted-foreground"> on referrals</span>
              </div>
            </Card>
          ))}
        </div>

        {/* Info Section */}
        <Card className="mt-12 p-8 gradient-primary border-primary/20 shadow-card text-center">
          <h2 className="text-2xl font-bold mb-4">
            Earn While You Shop!
          </h2>
          <p className="text-lg text-foreground/90 max-w-2xl mx-auto">
            Every purchase from your referrals earns you commission. Reach Level 10 to unlock unlimited earning potential from your entire network!
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Shop;