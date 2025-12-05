import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ArrowLeft, Star, Clock, MapPin, Plus, Minus } from "lucide-react";
import { useFoodCart } from "@/hooks/useFoodCart";
import { toast } from "sonner";

interface RestaurantMenuProps {
  vendorId: string;
  onBack: () => void;
}

export const RestaurantMenu = ({ vendorId, onBack }: RestaurantMenuProps) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { addToCart, cart, updateQuantity } = useFoodCart();

  const { data: vendor } = useQuery({
    queryKey: ["food-vendor", vendorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("food_vendors")
        .select("*")
        .eq("id", vendorId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: menuItems, isLoading } = useQuery({
    queryKey: ["food-items", vendorId, selectedCategory],
    queryFn: async () => {
      let query = supabase
        .from("food_items")
        .select("*")
        .eq("vendor_id", vendorId)
        .eq("is_available", true);

      if (selectedCategory) {
        query = query.eq("category", selectedCategory);
      }

      const { data, error } = await query.order("is_featured", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const categories = [...new Set(menuItems?.map((item) => item.category).filter(Boolean))];

  const getItemQuantity = (itemId: string) => {
    const cartItem = cart.find((item) => item.id === itemId);
    return cartItem?.quantity || 0;
  };

  const handleAddToCart = (item: any) => {
    if (cart.length > 0 && cart[0].vendor_id !== vendorId) {
      toast.error("You can only order from one restaurant at a time. Please clear your cart first.");
      return;
    }
    addToCart({
      id: item.id,
      name: item.name,
      price: item.price,
      image_url: item.image_url,
      vendor_id: vendorId,
      vendor_name: vendor?.name || "",
      diamond_reward: item.diamond_reward || 0,
    });
    toast.success(`${item.name} added to cart`);
  };

  if (!vendor) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 left-2 z-10 bg-background/80 backdrop-blur"
          onClick={onBack}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <img
          src={vendor.cover_image_url || "/placeholder.svg"}
          alt={vendor.name}
          className="w-full h-48 object-cover rounded-lg"
        />
      </div>

      {/* Restaurant Info */}
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold">{vendor.name}</h2>
            <p className="text-muted-foreground">{vendor.cuisine_type}</p>
          </div>
          <div className="flex items-center gap-1 bg-primary/10 px-3 py-1 rounded-full">
            <Star className="w-4 h-4 fill-primary text-primary" />
            <span className="font-medium">{vendor.rating || "New"}</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{vendor.description}</p>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{vendor.estimated_delivery_time}</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            <span>{vendor.address}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {vendor.delivery_fee === 0 ? (
            <Badge variant="secondary">Free Delivery</Badge>
          ) : (
            <Badge variant="outline">₱{vendor.delivery_fee} delivery fee</Badge>
          )}
          {vendor.minimum_order > 0 && (
            <Badge variant="outline">Min order ₱{vendor.minimum_order}</Badge>
          )}
        </div>
      </div>

      {/* Category Filter */}
      {categories.length > 0 && (
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-2 pb-2">
            <Badge
              variant={selectedCategory === null ? "default" : "outline"}
              className="cursor-pointer shrink-0"
              onClick={() => setSelectedCategory(null)}
            >
              All
            </Badge>
            {categories.map((category) => (
              <Badge
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                className="cursor-pointer shrink-0"
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Badge>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}

      {/* Menu Items */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 flex gap-4">
                <div className="w-24 h-24 bg-muted rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-4 bg-muted rounded w-1/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : menuItems?.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No menu items available</p>
        </div>
      ) : (
        <div className="space-y-3">
          {menuItems?.map((item) => {
            const quantity = getItemQuantity(item.id);
            return (
              <Card key={item.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex gap-3 p-3">
                    <img
                      src={item.image_url || "/placeholder.svg"}
                      alt={item.name}
                      className="w-24 h-24 object-cover rounded-lg shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold truncate">{item.name}</h3>
                          {item.is_featured && (
                            <Badge variant="secondary" className="text-xs">Featured</Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {item.description}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <div>
                          <span className="font-bold text-lg">₱{item.price}</span>
                          {item.diamond_reward > 0 && (
                            <span className="text-xs text-primary ml-2">+{item.diamond_reward} 💎</span>
                          )}
                        </div>
                        {quantity === 0 ? (
                          <Button
                            size="sm"
                            onClick={() => handleAddToCart(item)}
                            disabled={!vendor.is_open}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add
                          </Button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              onClick={() => updateQuantity(item.id, quantity - 1)}
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                            <span className="font-medium w-6 text-center">{quantity}</span>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              onClick={() => updateQuantity(item.id, quantity + 1)}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
