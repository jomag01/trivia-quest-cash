import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

interface ProductVariation {
  id?: string;
  size: string;
  weight: string;
  color: string;
  price_adjustment: number;
  stock_quantity: number;
  sku: string;
}

interface ProductVariationsProps {
  shopItemId: string | null;
  onVariationsChange?: () => void;
}

export const ProductVariations = ({ shopItemId, onVariationsChange }: ProductVariationsProps) => {
  const [variations, setVariations] = useState<ProductVariation[]>([]);
  const [newVariation, setNewVariation] = useState<ProductVariation>({
    size: "",
    weight: "",
    color: "",
    price_adjustment: 0,
    stock_quantity: 0,
    sku: "",
  });

  useEffect(() => {
    if (shopItemId) {
      fetchVariations();
    }
  }, [shopItemId]);

  const fetchVariations = async () => {
    if (!shopItemId) return;

    const { data, error } = await supabase
      .from("product_variations")
      .select("*")
      .eq("shop_item_id", shopItemId);

    if (error) {
      toast.error("Failed to load variations");
      return;
    }

    setVariations(data || []);
  };

  const addVariation = async () => {
    if (!shopItemId) {
      toast.error("Please save the product first before adding variations");
      return;
    }

    if (!newVariation.size && !newVariation.weight && !newVariation.color) {
      toast.error("Please provide at least one variation attribute (size, weight, or color)");
      return;
    }

    const { error } = await supabase.from("product_variations").insert({
      shop_item_id: shopItemId,
      ...newVariation,
    });

    if (error) {
      toast.error("Failed to add variation");
      return;
    }

    toast.success("Variation added");
    setNewVariation({
      size: "",
      weight: "",
      color: "",
      price_adjustment: 0,
      stock_quantity: 0,
      sku: "",
    });
    fetchVariations();
    onVariationsChange?.();
  };

  const deleteVariation = async (id: string) => {
    const { error } = await supabase
      .from("product_variations")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete variation");
      return;
    }

    toast.success("Variation deleted");
    fetchVariations();
    onVariationsChange?.();
  };

  if (!shopItemId) {
    return (
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">
          Save the product first to add variations
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Product Variations</h3>
      
      {/* Existing variations */}
      <div className="space-y-2">
        {variations.map((variation) => (
          <Card key={variation.id} className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 grid grid-cols-3 gap-2 text-sm">
                {variation.size && <span>Size: {variation.size}</span>}
                {variation.weight && <span>Weight: {variation.weight}</span>}
                {variation.color && <span>Color: {variation.color}</span>}
                {variation.price_adjustment !== 0 && (
                  <span>Price: +${variation.price_adjustment}</span>
                )}
                {variation.stock_quantity > 0 && (
                  <span>Stock: {variation.stock_quantity}</span>
                )}
                {variation.sku && <span>SKU: {variation.sku}</span>}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => variation.id && deleteVariation(variation.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Add new variation */}
      <Card className="p-4">
        <h4 className="text-sm font-medium mb-3">Add New Variation</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="size" className="text-xs">Size</Label>
            <Input
              id="size"
              value={newVariation.size}
              onChange={(e) =>
                setNewVariation({ ...newVariation, size: e.target.value })
              }
              placeholder="e.g., S, M, L"
            />
          </div>
          <div>
            <Label htmlFor="weight" className="text-xs">Weight</Label>
            <Input
              id="weight"
              value={newVariation.weight}
              onChange={(e) =>
                setNewVariation({ ...newVariation, weight: e.target.value })
              }
              placeholder="e.g., 100g, 1kg"
            />
          </div>
          <div>
            <Label htmlFor="color" className="text-xs">Color</Label>
            <Input
              id="color"
              value={newVariation.color}
              onChange={(e) =>
                setNewVariation({ ...newVariation, color: e.target.value })
              }
              placeholder="e.g., Red, Blue"
            />
          </div>
          <div>
            <Label htmlFor="price_adjustment" className="text-xs">Price Adjustment</Label>
            <Input
              id="price_adjustment"
              type="number"
              step="0.01"
              value={newVariation.price_adjustment}
              onChange={(e) =>
                setNewVariation({
                  ...newVariation,
                  price_adjustment: parseFloat(e.target.value) || 0,
                })
              }
              placeholder="0.00"
            />
          </div>
          <div>
            <Label htmlFor="stock_quantity" className="text-xs">Stock Quantity</Label>
            <Input
              id="stock_quantity"
              type="number"
              value={newVariation.stock_quantity}
              onChange={(e) =>
                setNewVariation({
                  ...newVariation,
                  stock_quantity: parseInt(e.target.value) || 0,
                })
              }
              placeholder="0"
            />
          </div>
          <div>
            <Label htmlFor="sku" className="text-xs">SKU</Label>
            <Input
              id="sku"
              value={newVariation.sku}
              onChange={(e) =>
                setNewVariation({ ...newVariation, sku: e.target.value })
              }
              placeholder="Product SKU"
            />
          </div>
        </div>
        <Button onClick={addVariation} className="mt-3 w-full" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Variation
        </Button>
      </Card>
    </div>
  );
};
