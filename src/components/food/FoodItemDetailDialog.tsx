import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Minus, Store, Share2 } from "lucide-react";
import { useFoodCart } from "@/hooks/useFoodCart";
import { toast } from "sonner";
import { FoodItemShareButton } from "./FoodItemShareButton";

interface FoodItemDetailDialogProps {
  foodItemId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

interface FoodItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  diamond_reward: number;
  vendor_id: string;
  variations?: Variation[];
  addons?: AddOn[];
  vendor?: {
    id: string;
    name: string;
    is_open: boolean;
  };
}

export const FoodItemDetailDialog = ({
  foodItemId,
  open,
  onOpenChange,
}: FoodItemDetailDialogProps) => {
  const [selectedVariations, setSelectedVariations] = useState<
    Record<string, { label: string; priceAdjustment: number }>
  >({});
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const { addToCart, cart } = useFoodCart();

  const { data: foodItem, isLoading } = useQuery({
    queryKey: ["food-item-detail", foodItemId],
    queryFn: async () => {
      if (!foodItemId) return null;

      const { data, error } = await (supabase as any)
        .from("food_items")
        .select(
          `
          *,
          vendor:food_vendors(id, name, is_open)
        `
        )
        .eq("id", foodItemId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // Fetch variations and add-ons
      const [{ data: variations }, { data: addons }] = await Promise.all([
        (supabase as any)
          .from("food_item_variations")
          .select("*")
          .eq("item_id", foodItemId),
        (supabase as any)
          .from("food_item_addons")
          .select("*")
          .eq("item_id", foodItemId)
          .eq("is_available", true),
      ]);

      return {
        ...data,
        variations: variations || [],
        addons: addons || [],
      } as FoodItem;
    },
    enabled: !!foodItemId && open,
  });

  const calculateTotal = () => {
    if (!foodItem) return 0;
    let total = foodItem.price;

    Object.values(selectedVariations).forEach((v) => {
      total += v.priceAdjustment;
    });

    selectedAddOns.forEach((addOnId) => {
      const addOn = foodItem.addons?.find((a) => a.id === addOnId);
      if (addOn) total += addOn.price;
    });

    return total * quantity;
  };

  const handleVariationChange = (
    variationName: string,
    option: { label: string; priceAdjustment: number }
  ) => {
    setSelectedVariations({ ...selectedVariations, [variationName]: option });
  };

  const handleAddOnToggle = (addOnId: string) => {
    if (selectedAddOns.includes(addOnId)) {
      setSelectedAddOns(selectedAddOns.filter((id) => id !== addOnId));
    } else {
      setSelectedAddOns([...selectedAddOns, addOnId]);
    }
  };

  const handleAddToCart = () => {
    if (!foodItem || !foodItem.vendor) return;

    if (cart.length > 0 && cart[0].vendor_id !== foodItem.vendor_id) {
      toast.error(
        "You can only order from one restaurant at a time. Please clear your cart first."
      );
      return;
    }

    const finalPrice = calculateTotal() / quantity;

    let itemName = foodItem.name;
    const customizations: string[] = [];
    Object.entries(selectedVariations).forEach(([key, val]) => {
      if (key !== "combined") customizations.push(val.label);
    });
    if (selectedAddOns.length > 0) {
      const addonNames = selectedAddOns
        .map((id) => foodItem.addons?.find((a) => a.id === id)?.name)
        .filter(Boolean);
      customizations.push(...(addonNames as string[]));
    }
    if (customizations.length > 0) {
      itemName = `${foodItem.name} (${customizations.join(", ")})`;
    }

    for (let i = 0; i < quantity; i++) {
      addToCart({
        id: `${foodItem.id}-${Date.now()}-${i}`,
        originalItemId: foodItem.id,
        name: itemName,
        price: finalPrice,
        image_url: foodItem.image_url,
        vendor_id: foodItem.vendor_id,
        vendor_name: foodItem.vendor.name,
        diamond_reward: foodItem.diamond_reward || 0,
      });
    }

    toast.success(`${quantity}x ${foodItem.name} added to cart`);
    onOpenChange(false);
    setQuantity(1);
    setSelectedVariations({});
    setSelectedAddOns([]);
  };

  const canAddToCart = () => {
    if (!foodItem) return false;
    const requiredVariations =
      foodItem.variations?.filter((v) => v.is_required) || [];
    const multiOptionVariations = requiredVariations.filter(
      (v) => v.options.length > 1
    );
    return multiOptionVariations.every((v) => selectedVariations[v.name]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : !foodItem ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Food item not found</p>
          </div>
        ) : (
          <>
            <DialogHeader className="space-y-3">
              <div className="flex justify-between items-start">
                <DialogTitle className="text-xl">{foodItem.name}</DialogTitle>
                <FoodItemShareButton
                  foodItemId={foodItem.id}
                  foodItemName={foodItem.name}
                  foodItemImage={foodItem.image_url || undefined}
                  variant="ghost"
                  size="icon"
                />
              </div>
            </DialogHeader>

            <div className="space-y-4">
              {foodItem.image_url && (
                <img
                  src={foodItem.image_url}
                  alt={foodItem.name}
                  className="w-full h-48 object-cover rounded-lg"
                />
              )}

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Store className="w-4 h-4" />
                <span>{foodItem.vendor?.name}</span>
                {!foodItem.vendor?.is_open && (
                  <Badge variant="destructive" className="text-xs">
                    Closed
                  </Badge>
                )}
              </div>

              {foodItem.description && (
                <p className="text-sm text-muted-foreground">
                  {foodItem.description}
                </p>
              )}

              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">
                  ₱{foodItem.price.toFixed(2)}
                </span>
                {foodItem.diamond_reward > 0 && (
                  <Badge variant="secondary">
                    +{foodItem.diamond_reward} 💎
                  </Badge>
                )}
              </div>

              {/* Variations */}
              {foodItem.variations && foodItem.variations.length > 0 && (
                <div className="space-y-4">
                  {foodItem.variations.map((variation) => (
                    <div key={variation.id} className="space-y-2">
                      <Label className="font-medium">
                        {variation.name}
                        {variation.is_required && (
                          <span className="text-destructive ml-1">*</span>
                        )}
                      </Label>
                      <RadioGroup
                        value={selectedVariations[variation.name]?.label || ""}
                        onValueChange={(value) => {
                          const option = variation.options.find(
                            (o) => o.label === value
                          );
                          if (option) {
                            handleVariationChange(variation.name, option);
                          }
                        }}
                      >
                        {variation.options.map((option, idx) => (
                          <div
                            key={idx}
                            className="flex items-center space-x-2"
                          >
                            <RadioGroupItem
                              value={option.label}
                              id={`${variation.id}-${idx}`}
                            />
                            <Label
                              htmlFor={`${variation.id}-${idx}`}
                              className="flex-1 cursor-pointer"
                            >
                              {option.label}
                              {option.priceAdjustment > 0 && (
                                <span className="text-muted-foreground ml-2">
                                  +₱{option.priceAdjustment.toFixed(2)}
                                </span>
                              )}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  ))}
                </div>
              )}

              {/* Add-ons */}
              {foodItem.addons && foodItem.addons.length > 0 && (
                <div className="space-y-2">
                  <Label className="font-medium">Add-ons</Label>
                  <div className="space-y-2">
                    {foodItem.addons.map((addon) => (
                      <div
                        key={addon.id}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={addon.id}
                          checked={selectedAddOns.includes(addon.id)}
                          onCheckedChange={() => handleAddOnToggle(addon.id)}
                        />
                        <Label
                          htmlFor={addon.id}
                          className="flex-1 cursor-pointer"
                        >
                          {addon.name}
                          <span className="text-muted-foreground ml-2">
                            +₱{addon.price.toFixed(2)}
                          </span>
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity Selector */}
              <div className="flex items-center justify-between pt-2 border-t">
                <Label className="font-medium">Quantity</Label>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="font-medium w-8 text-center">{quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Total and Add to Cart */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-xl font-bold">
                    ₱{calculateTotal().toFixed(2)}
                  </p>
                </div>
                <Button
                  size="lg"
                  onClick={handleAddToCart}
                  disabled={!foodItem.vendor?.is_open || !canAddToCart()}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add to Cart
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
