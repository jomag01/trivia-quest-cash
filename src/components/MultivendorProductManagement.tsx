import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Package, Edit2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function MultivendorProductManagement() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [markup, setMarkup] = useState("");
  const [commission, setCommission] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          profiles!products_seller_id_fkey (
            id,
            full_name,
            email,
            seller_rating
          )
        `)
        .not("seller_id", "is", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditProduct = (product: any) => {
    setSelectedProduct(product);
    setMarkup(product.admin_markup_percentage?.toString() || "0");
    setCommission(product.commission_percentage?.toString() || "0");
  };

  const handleSaveMarkup = async () => {
    if (!selectedProduct) return;

    const markupValue = parseInt(markup);
    if (markupValue < 0 || markupValue > 200) {
      toast.error("Markup must be between 0% and 200%");
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from("products")
        .update({
          admin_markup_percentage: markupValue,
          commission_percentage: parseInt(commission),
          is_active: true, // Activate product when markup is set
        })
        .eq("id", selectedProduct.id);

      if (error) throw error;

      toast.success("Product updated successfully!");
      setSelectedProduct(null);
      fetchProducts();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setProcessing(false);
    }
  };

  const calculateFinalPrice = (wholesalePrice: number, markupPercent: number) => {
    return wholesalePrice * (1 + markupPercent / 100);
  };

  const calculateAdminProfit = (wholesalePrice: number, markupPercent: number) => {
    if (markupPercent >= 200) {
      const markupAmount = wholesalePrice * (markupPercent / 100);
      return markupAmount * 0.35; // 35% of markup
    }
    return 0;
  };

  const calculateCommissionPool = (wholesalePrice: number, markupPercent: number) => {
    const markupAmount = wholesalePrice * (markupPercent / 100);
    if (markupPercent >= 200) {
      return markupAmount * 0.65; // 65% of markup
    }
    return markupAmount; // 100% of markup if below 200%
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            User Products (Multivendor)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {products.map((product) => (
              <Card key={product.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">{product.name}</span>
                        <Badge variant={product.is_active ? "default" : "secondary"}>
                          {product.is_active ? "Active" : "Pending"}
                        </Badge>
                        {product.admin_markup_percentage > 0 && (
                          <Badge variant="outline">
                            {product.admin_markup_percentage}% markup
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {product.description}
                      </p>
                      <div className="text-sm space-y-1">
                        <p>
                          <span className="text-muted-foreground">Seller:</span>{" "}
                          {product.profiles?.full_name || product.profiles?.email}
                        </p>
                        <p>
                          <span className="text-muted-foreground">Wholesale Price:</span> ₱
                          {product.wholesale_price}
                        </p>
                        {product.final_price && (
                          <p>
                            <span className="text-muted-foreground">Final Price:</span>{" "}
                            <span className="font-medium text-primary">
                              ₱{product.final_price}
                            </span>
                          </p>
                        )}
                        <p>
                          <span className="text-muted-foreground">Stock:</span>{" "}
                          {product.stock_quantity}
                        </p>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditProduct(product)}
                    >
                      <Edit2 className="h-4 w-4 mr-1" />
                      Set Markup
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {products.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No user products yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Markup Dialog */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set Product Markup & Commission</DialogTitle>
            <DialogDescription>
              Configure pricing and commission for {selectedProduct?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="markup">Markup Percentage (0-200%)</Label>
              <Input
                id="markup"
                type="number"
                min="0"
                max="200"
                value={markup}
                onChange={(e) => setMarkup(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="commission">Commission Percentage</Label>
              <Input
                id="commission"
                type="number"
                min="0"
                max="100"
                value={commission}
                onChange={(e) => setCommission(e.target.value)}
              />
            </div>

            {selectedProduct && markup && (
              <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Wholesale Price:</span>
                  <span className="font-medium">
                    ₱{selectedProduct.wholesale_price}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Final Retail Price:</span>
                  <span className="font-medium text-primary">
                    ₱
                    {calculateFinalPrice(
                      selectedProduct.wholesale_price,
                      parseInt(markup) || 0
                    ).toFixed(2)}
                  </span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Admin Profit (35%):</span>
                    <span className="font-medium">
                      ₱
                      {calculateAdminProfit(
                        selectedProduct.wholesale_price,
                        parseInt(markup) || 0
                      ).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Commission Pool (65%):</span>
                    <span className="font-medium">
                      ₱
                      {calculateCommissionPool(
                        selectedProduct.wholesale_price,
                        parseInt(markup) || 0
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedProduct(null)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveMarkup} disabled={processing}>
              {processing ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
