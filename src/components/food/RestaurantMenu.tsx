import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, Star, Clock, MapPin, Plus, Minus } from "lucide-react";
import { useFoodCart } from "@/hooks/useFoodCart";
import { toast } from "sonner";

interface RestaurantMenuProps {
  vendorId: string;
  onBack: () => void;
}

interface FoodVendor {
  id: string;
  name: string;
  cuisine_type: string | null;
  description: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  address: string | null;
  is_open: boolean;
  rating: number | null;
  estimated_delivery_time: string | null;
  delivery_fee: number;
  minimum_order: number;
}

interface Variation {
  id: string;
  name: string;
  options: { label: string; priceAdjustment: number }[];
  is_required: boolean;
}

interface AddOn {
  id: string;
  name: string;
  price: number;
  is_available: boolean;
}

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  image_url: string | null;
  is_available: boolean;
  is_featured: boolean;
  diamond_reward: number;
  variations?: Variation[];
  addons?: AddOn[];
}

export const RestaurantMenu = ({ vendorId, onBack }: RestaurantMenuProps) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [selectedVariations, setSelectedVariations] = useState<Record<string, { label: string; priceAdjustment: number }>>({});
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const { addToCart, cart, updateQuantity } = useFoodCart();

  const { data: vendor } = useQuery({
    queryKey: ["food-vendor", vendorId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("food_vendors")
        .select("*")
        .eq("id", vendorId)
        .single();
      if (error) throw error;
      return data as FoodVendor;
    },
  });

  const { data: menuItems, isLoading } = useQuery({
    queryKey: ["food-items", vendorId, selectedCategory],
    queryFn: async () => {
      let query = (supabase as any)
        .from("food_items")
        .select("*")
        .eq("vendor_id", vendorId)
        .eq("is_available", true);

      if (selectedCategory) {
        query = query.eq("category", selectedCategory);
      }

      const { data, error } = await query.order("is_featured", { ascending: false });
      if (error) throw error;

      // Fetch variations and add-ons for each item
      const itemsWithExtras = await Promise.all(
        (data || []).map(async (item: MenuItem) => {
          const [{ data: variations }, { data: addons }] = await Promise.all([
            (supabase as any).from("food_item_variations").select("*").eq("item_id", item.id),
            (supabase as any).from("food_item_addons").select("*").eq("item_id", item.id).eq("is_available", true),
          ]);
          return { ...item, variations: variations || [], addons: addons || [] };
        })
      );

      return itemsWithExtras as MenuItem[];
    },
  });

  const categories = [...new Set(menuItems?.map((item) => item.category).filter(Boolean))];

  const getItemQuantity = (itemId: string) => {
    const cartItem = cart.find((item) => item.id === itemId);
    return cartItem?.quantity || 0;
  };

  const calculateItemTotal = (item: MenuItem) => {
    let total = item.price;
    
    // Add variation price adjustments
    Object.values(selectedVariations).forEach((v) => {
      total += v.priceAdjustment;
    });
    
    // Add add-on prices
    selectedAddOns.forEach((addOnId) => {
      const addOn = item.addons?.find((a) => a.id === addOnId);
      if (addOn) total += addOn.price;
    });
    
    return total;
  };

  const handleAddToCart = (item: MenuItem, withOptions = false) => {
    if (cart.length > 0 && cart[0].vendor_id !== vendorId) {
      toast.error("You can only order from one restaurant at a time. Please clear your cart first.");
      return;
    }

    // If item has variations/addons and not already customized, open dialog
    if (!withOptions && ((item.variations?.length || 0) > 0 || (item.addons?.length || 0) > 0)) {
      setSelectedItem(item);
      setSelectedVariations({});
      setSelectedAddOns([]);
      return;
    }

    const finalPrice = withOptions ? calculateItemTotal(item) : item.price;
    
    addToCart({
      id: withOptions ? `${item.id}-${Date.now()}` : item.id,
      name: item.name,
      price: finalPrice,
      image_url: item.image_url,
      vendor_id: vendorId,
      vendor_name: vendor?.name || "",
      diamond_reward: item.diamond_reward || 0,
    });
    
    toast.success(`${item.name} added to cart`);
    setSelectedItem(null);
  };

  const handleVariationChange = (variationName: string, option: { label: string; priceAdjustment: number }) => {
    setSelectedVariations({ ...selectedVariations, [variationName]: option });
  };

  const handleAddOnToggle = (addOnId: string) => {
    if (selectedAddOns.includes(addOnId)) {
      setSelectedAddOns(selectedAddOns.filter((id) => id !== addOnId));
    } else {
      setSelectedAddOns([...selectedAddOns, addOnId]);
    }
  };

  const canAddToCart = () => {
    if (!selectedItem) return false;
    const requiredVariations = selectedItem.variations?.filter((v) => v.is_required) || [];
    
    // If there are multiple single-option variations, check if combined selection is made
    const singleOptionVariations = selectedItem.variations?.filter(v => v.options.length === 1) || [];
    if (singleOptionVariations.length > 1) {
      const hasAnyRequired = singleOptionVariations.some(v => v.is_required);
      if (hasAnyRequired && !selectedVariations["combined"]) {
        return false;
      }
    }
    
    // Check standard required variations
    const multiOptionVariations = requiredVariations.filter(v => v.options.length > 1);
    return multiOptionVariations.every((v) => selectedVariations[v.name]);
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
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{vendor.estimated_delivery_time}</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            <span className="truncate max-w-[200px]">{vendor.address}</span>
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
            const hasExtras = (item.variations?.length || 0) > 0 || (item.addons?.length || 0) > 0;
            
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
                      
                      {/* Show variation/addon indicators */}
                      {hasExtras && (
                        <div className="flex gap-1 mt-1">
                          {(item.variations?.length || 0) > 0 && (
                            <Badge variant="outline" className="text-[10px]">
                              {item.variations?.length} options
                            </Badge>
                          )}
                          {(item.addons?.length || 0) > 0 && (
                            <Badge variant="outline" className="text-[10px]">
                              {item.addons?.length} add-ons
                            </Badge>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between mt-2">
                        <div>
                          <span className="font-bold text-lg">₱{item.price.toFixed(2)}</span>
                          {item.diamond_reward > 0 && (
                            <span className="text-xs text-primary ml-2">+{item.diamond_reward} 💎</span>
                          )}
                        </div>
                        {!hasExtras && quantity === 0 ? (
                          <Button
                            size="sm"
                            onClick={() => handleAddToCart(item)}
                            disabled={!vendor.is_open}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add
                          </Button>
                        ) : hasExtras ? (
                          <Button
                            size="sm"
                            onClick={() => handleAddToCart(item)}
                            disabled={!vendor.is_open}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Customize
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

      {/* Customization Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedItem?.name}</DialogTitle>
          </DialogHeader>
          
          {selectedItem && (
            <div className="space-y-4">
              <div className="flex gap-3">
                <img
                  src={selectedItem.image_url || "/placeholder.svg"}
                  alt={selectedItem.name}
                  className="w-20 h-20 rounded-lg object-cover"
                />
                <div>
                  <p className="text-sm text-muted-foreground">{selectedItem.description}</p>
                  <p className="font-bold mt-1">Base: ₱{selectedItem.price.toFixed(2)}</p>
                </div>
              </div>

              {/* Variations - Group by similar names for single selection */}
              {selectedItem.variations && selectedItem.variations.length > 0 && (
                <div className="space-y-4">
                  {/* Check if all variations have single options (size variants stored separately) */}
                  {(() => {
                    const singleOptionVariations = selectedItem.variations.filter(v => v.options.length === 1);
                    const multiOptionVariations = selectedItem.variations.filter(v => v.options.length > 1);
                    const hasAnyRequired = selectedItem.variations.some(v => v.is_required);
                    
                    return (
                      <>
                        {/* If all variations have single options, combine them into one radio group */}
                        {singleOptionVariations.length > 1 && (
                          <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                              Select Option
                              {hasAnyRequired && <Badge variant="destructive" className="text-[10px]">Required</Badge>}
                            </Label>
                            <RadioGroup
                              value={selectedVariations["combined"]?.label || ""}
                              onValueChange={(value) => {
                                const variation = singleOptionVariations.find(v => v.options[0]?.label === value);
                                if (variation && variation.options[0]) {
                                  setSelectedVariations({ 
                                    ...selectedVariations, 
                                    combined: variation.options[0],
                                    [variation.name]: variation.options[0]
                                  });
                                }
                              }}
                            >
                              {singleOptionVariations.map((variation) => {
                                const option = variation.options[0];
                                if (!option) return null;
                                return (
                                  <div key={variation.id} className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem value={option.label} id={`option-${variation.id}`} />
                                      <Label htmlFor={`option-${variation.id}`} className="text-sm cursor-pointer">
                                        {variation.name} - {option.label}
                                      </Label>
                                    </div>
                                    {option.priceAdjustment > 0 && (
                                      <span className="text-sm text-muted-foreground">+₱{option.priceAdjustment.toFixed(2)}</span>
                                    )}
                                  </div>
                                );
                              })}
                            </RadioGroup>
                          </div>
                        )}

                        {/* Single variation with single option - just show as info */}
                        {singleOptionVariations.length === 1 && (
                          <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                              {singleOptionVariations[0].name}
                              {singleOptionVariations[0].is_required && <Badge variant="destructive" className="text-[10px]">Required</Badge>}
                            </Label>
                            <RadioGroup
                              value={selectedVariations[singleOptionVariations[0].name]?.label || ""}
                              onValueChange={(value) => {
                                const option = singleOptionVariations[0].options.find((o) => o.label === value);
                                if (option) handleVariationChange(singleOptionVariations[0].name, option);
                              }}
                            >
                              {singleOptionVariations[0].options.map((option) => (
                                <div key={option.label} className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value={option.label} id={`${singleOptionVariations[0].name}-${option.label}`} />
                                    <Label htmlFor={`${singleOptionVariations[0].name}-${option.label}`} className="text-sm cursor-pointer">
                                      {option.label}
                                    </Label>
                                  </div>
                                  {option.priceAdjustment > 0 && (
                                    <span className="text-sm text-muted-foreground">+₱{option.priceAdjustment.toFixed(2)}</span>
                                  )}
                                </div>
                              ))}
                            </RadioGroup>
                          </div>
                        )}

                        {/* Multi-option variations - standard radio group */}
                        {multiOptionVariations.map((variation) => (
                          <div key={variation.id} className="space-y-2">
                            <Label className="flex items-center gap-2">
                              {variation.name}
                              {variation.is_required && <Badge variant="destructive" className="text-[10px]">Required</Badge>}
                            </Label>
                            <RadioGroup
                              value={selectedVariations[variation.name]?.label || ""}
                              onValueChange={(value) => {
                                const option = variation.options.find((o) => o.label === value);
                                if (option) handleVariationChange(variation.name, option);
                              }}
                            >
                              {variation.options.map((option) => (
                                <div key={option.label} className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value={option.label} id={`${variation.name}-${option.label}`} />
                                    <Label htmlFor={`${variation.name}-${option.label}`} className="text-sm cursor-pointer">
                                      {option.label}
                                    </Label>
                                  </div>
                                  {option.priceAdjustment > 0 && (
                                    <span className="text-sm text-muted-foreground">+₱{option.priceAdjustment.toFixed(2)}</span>
                                  )}
                                </div>
                              ))}
                            </RadioGroup>
                          </div>
                        ))}
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Add-ons - Optional */}
              {(selectedItem.addons?.length || 0) > 0 && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Add-ons
                    <Badge variant="secondary" className="text-[10px]">Optional</Badge>
                  </Label>
                  {selectedItem.addons?.map((addon) => (
                    <div key={addon.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={addon.id}
                          checked={selectedAddOns.includes(addon.id)}
                          onCheckedChange={() => handleAddOnToggle(addon.id)}
                        />
                        <Label htmlFor={addon.id} className="text-sm cursor-pointer">
                          {addon.name}
                        </Label>
                      </div>
                      <span className="text-sm text-muted-foreground">+₱{addon.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t pt-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-xl font-bold">₱{calculateItemTotal(selectedItem).toFixed(2)}</p>
                </div>
                <Button
                  onClick={() => handleAddToCart(selectedItem, true)}
                  disabled={!canAddToCart()}
                >
                  Add to Cart
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};