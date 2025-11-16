import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Package2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  weight_kg: number | null;
  shipping_fee: number;
  free_shipping: boolean;
}

export const BulkShippingManagement = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [updateMode, setUpdateMode] = useState<"fixed" | "weight-based">("fixed");
  const [fixedFee, setFixedFee] = useState("");
  const [ratePerKg, setRatePerKg] = useState("");
  const [baseFee, setBaseFee] = useState("");
  const [freeShipping, setFreeShipping] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("id, name, weight_kg, shipping_fee, free_shipping")
      .eq("is_active", true)
      .order("name");

    if (error) {
      toast.error("Failed to load products");
      console.error(error);
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  const toggleProduct = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleAll = () => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map(p => p.id)));
    }
  };

  const handleBulkUpdate = async () => {
    if (selectedIds.size === 0) {
      toast.error("Please select at least one product");
      return;
    }

    const updates: any = { free_shipping: freeShipping };

    if (!freeShipping) {
      if (updateMode === "fixed") {
        if (!fixedFee) {
          toast.error("Please enter a fixed shipping fee");
          return;
        }
        updates.shipping_fee = parseFloat(fixedFee);
      } else {
        // Weight-based calculation
        if (!ratePerKg || !baseFee) {
          toast.error("Please enter both base fee and rate per kg");
          return;
        }

        const selectedProducts = products.filter(p => selectedIds.has(p.id));
        const bulkUpdates = selectedProducts.map(product => {
          const weight = product.weight_kg || 1;
          const calculatedFee = parseFloat(baseFee) + (weight * parseFloat(ratePerKg));
          
          return supabase
            .from("products")
            .update({ 
              shipping_fee: calculatedFee,
              free_shipping: false
            })
            .eq("id", product.id);
        });

        try {
          await Promise.all(bulkUpdates);
          toast.success(`Updated ${selectedIds.size} product(s)`);
          setSelectedIds(new Set());
          fetchProducts();
          return;
        } catch (error) {
          toast.error("Failed to update products");
          console.error(error);
          return;
        }
      }
    }

    const { error } = await supabase
      .from("products")
      .update(updates)
      .in("id", Array.from(selectedIds));

    if (error) {
      toast.error("Failed to update products");
      console.error(error);
      return;
    }

    toast.success(`Updated ${selectedIds.size} product(s)`);
    setSelectedIds(new Set());
    fetchProducts();
  };

  if (loading) return <div>Loading products...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Package2 className="w-6 h-6" />
          Bulk Shipping Management
        </h2>
        <p className="text-sm text-muted-foreground">
          Update shipping fees for multiple products at once
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Update Settings */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Update Settings</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Free Shipping</Label>
              <Switch
                checked={freeShipping}
                onCheckedChange={setFreeShipping}
              />
            </div>

            {!freeShipping && (
              <>
                <div>
                  <Label>Calculation Mode</Label>
                  <Select
                    value={updateMode}
                    onValueChange={(value: any) => setUpdateMode(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed Fee</SelectItem>
                      <SelectItem value="weight-based">Weight-Based</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {updateMode === "fixed" ? (
                  <div>
                    <Label htmlFor="fixed_fee">Fixed Shipping Fee (₱)</Label>
                    <Input
                      id="fixed_fee"
                      type="number"
                      step="0.01"
                      min="0"
                      value={fixedFee}
                      onChange={(e) => setFixedFee(e.target.value)}
                      placeholder="e.g., 50.00"
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <Label htmlFor="base_fee">Base Fee (₱)</Label>
                      <Input
                        id="base_fee"
                        type="number"
                        step="0.01"
                        min="0"
                        value={baseFee}
                        onChange={(e) => setBaseFee(e.target.value)}
                        placeholder="e.g., 30.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="rate_per_kg">Rate Per KG (₱)</Label>
                      <Input
                        id="rate_per_kg"
                        type="number"
                        step="0.01"
                        min="0"
                        value={ratePerKg}
                        onChange={(e) => setRatePerKg(e.target.value)}
                        placeholder="e.g., 10.00"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Formula: Base Fee + (Weight × Rate Per KG)
                      </p>
                    </div>
                  </>
                )}
              </>
            )}

            <Button 
              className="w-full" 
              onClick={handleBulkUpdate}
              disabled={selectedIds.size === 0}
            >
              Update {selectedIds.size} Selected Product(s)
            </Button>
          </div>
        </Card>

        {/* Product Selection */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Select Products</h3>
            <Button variant="outline" size="sm" onClick={toggleAll}>
              {selectedIds.size === products.length ? "Deselect All" : "Select All"}
            </Button>
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {products.map((product) => (
              <div
                key={product.id}
                className="flex items-start gap-3 p-3 rounded border hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  checked={selectedIds.has(product.id)}
                  onCheckedChange={() => toggleProduct(product.id)}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{product.name}</p>
                  <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                    <span>Weight: {product.weight_kg ? `${product.weight_kg}kg` : "N/A"}</span>
                    <span>•</span>
                    <span>
                      Shipping: {product.free_shipping 
                        ? "FREE" 
                        : `₱${product.shipping_fee.toFixed(2)}`}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
