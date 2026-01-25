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
  const [fixedMarkup, setFixedMarkup] = useState("");
  const [commission, setCommission] = useState("");
  const [diamondReward, setDiamondReward] = useState("");
  const [referralCommission, setReferralCommission] = useState("");
  const [stairstepPercentage, setStairstepPercentage] = useState("");
  const [leadershipPercentage, setLeadershipPercentage] = useState("");
  const [adminNetProfitPercentage, setAdminNetProfitPercentage] = useState("");
  const [diamondBasePrice, setDiamondBasePrice] = useState(10);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchDiamondPrice();
  }, []);

  const fetchDiamondPrice = async () => {
    try {
      const { data, error } = await supabase.from("treasure_admin_settings").select("setting_value").eq("setting_key", "diamond_base_price").maybeSingle();
      if (error) throw error;
      if (data) setDiamondBasePrice(parseFloat(data.setting_value));
    } catch (error: any) {
      console.error("Error fetching diamond price:", error);
    }
  };

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
    setFixedMarkup(product.fixed_markup_amount?.toString() || "0");
    setCommission(product.commission_percentage?.toString() || "0");
    setDiamondReward(product.diamond_reward?.toString() || "0");
    setReferralCommission(product.referral_commission_diamonds?.toString() || "0");
    setStairstepPercentage(product.stairstep_percentage?.toString() || "0");
    setLeadershipPercentage(product.leadership_percentage?.toString() || "0");
    setAdminNetProfitPercentage(product.admin_net_profit_percentage?.toString() || "0");
  };

  const handleApproveProduct = async (product: any, approved: boolean) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("products")
        .update({
          approval_status: approved ? "approved" : "rejected",
          is_active: approved, // Only active if approved
        })
        .eq("id", product.id);

      if (error) throw error;

      toast.success(`Product ${approved ? "approved" : "rejected"} successfully!`);
      fetchProducts();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleSaveMarkup = async () => {
    if (!selectedProduct) return;

    const markupValue = parseInt(markup);
    if (markupValue < 0 || markupValue > 500) {
      toast.error("Markup must be between 0% and 500%");
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from("products")
        .update({
          admin_markup_percentage: markupValue,
          fixed_markup_amount: parseFloat(fixedMarkup) || 0,
          commission_percentage: parseInt(commission),
          diamond_reward: parseInt(diamondReward),
          referral_commission_diamonds: parseInt(referralCommission),
          stairstep_percentage: parseFloat(stairstepPercentage) || 0,
          leadership_percentage: parseFloat(leadershipPercentage) || 0,
          admin_net_profit_percentage: parseFloat(adminNetProfitPercentage) || 0,
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

  const calculateFinalPrice = (wholesalePrice: number, markupPercent: number, fixedAmount: number = 0) => {
    return wholesalePrice * (1 + markupPercent / 100) + fixedAmount;
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
                        <Badge variant={
                          product.approval_status === "approved" ? "default" : 
                          product.approval_status === "rejected" ? "destructive" : 
                          "secondary"
                        }>
                          {product.approval_status || "pending"}
                        </Badge>
                        {(product.admin_markup_percentage > 0 || product.fixed_markup_amount > 0) && (
                          <Badge variant="outline">
                            {product.admin_markup_percentage > 0 ? `${product.admin_markup_percentage}%` : ""}
                            {product.admin_markup_percentage > 0 && product.fixed_markup_amount > 0 ? " + " : ""}
                            {product.fixed_markup_amount > 0 ? `₱${product.fixed_markup_amount}` : ""}
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
                        {product.bulk_enabled && (
                          <p>
                            <span className="text-muted-foreground">Bulk:</span>{" "}
                            <Badge variant="outline" className="ml-1">
                              ₱{product.bulk_price} (min {product.bulk_min_quantity} pcs)
                            </Badge>
                          </p>
                        )}
                        <p>
                          <span className="text-muted-foreground">Diamond Reward:</span>{" "}
                          {product.diamond_reward || 0} 💎
                        </p>
                        <p>
                          <span className="text-muted-foreground">Referral Diamonds:</span>{" "}
                          {product.referral_commission_diamonds || 0} 💎
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {product.approval_status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleApproveProduct(product, true)}
                            disabled={processing}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleApproveProduct(product, false)}
                            disabled={processing}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditProduct(product)}
                      >
                        <Edit2 className="h-4 w-4 mr-1" />
                        Set Markup
                      </Button>
                    </div>
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="markup">Markup % (0-500)</Label>
                <Input
                  id="markup"
                  type="number"
                  min="0"
                  max="500"
                  value={markup}
                  onChange={(e) => setMarkup(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="fixedMarkup">Fixed Markup (₱)</Label>
                <Input
                  id="fixedMarkup"
                  type="number"
                  min="0"
                  value={fixedMarkup}
                  onChange={(e) => setFixedMarkup(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Combined: Percentage + Fixed amount are both applied
            </p>

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

            <div>
              <Label htmlFor="diamondReward">Diamond Reward for Buyer 💎</Label>
              <div className="flex gap-2">
                <Input
                  id="diamondReward"
                  type="number"
                  min="0"
                  value={diamondReward}
                  onChange={(e) => setDiamondReward(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (selectedProduct) {
                      const maxDiamonds = Math.floor(selectedProduct.wholesale_price / diamondBasePrice);
                      setDiamondReward(maxDiamonds.toString());
                    }
                  }}
                >
                  Max (100%)
                </Button>
              </div>
              {selectedProduct && (
                <p className="text-xs text-muted-foreground mt-1">
                  Diamonds credited to buyer's account upon delivery. Max: {Math.floor(selectedProduct.wholesale_price / diamondBasePrice)} diamonds
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="referralCommission">Referral Commission 💎 (Affiliate Network)</Label>
              <Input
                id="referralCommission"
                type="number"
                min="0"
                value={referralCommission}
                onChange={(e) => setReferralCommission(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Diamonds × price per diamond (₱{diamondBasePrice}) distributed to affiliates via unilevel, stair-step & leadership bonuses
              </p>
            </div>

            {/* Commission Allocation Section */}
            <div className="border-t pt-4 mt-2">
              <p className="text-sm font-medium mb-3">Commission Allocation Percentages</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="stairstepPercentage" className="text-xs">Stairstep %</Label>
                  <Input
                    id="stairstepPercentage"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={stairstepPercentage}
                    onChange={(e) => setStairstepPercentage(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="leadershipPercentage" className="text-xs">Leadership %</Label>
                  <Input
                    id="leadershipPercentage"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={leadershipPercentage}
                    onChange={(e) => setLeadershipPercentage(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="adminNetProfitPercentage" className="text-xs">Admin Net Profit %</Label>
                  <Input
                    id="adminNetProfitPercentage"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={adminNetProfitPercentage}
                    onChange={(e) => setAdminNetProfitPercentage(e.target.value)}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                These percentages define how commission pool is distributed. Values synced to Sales Analytics on delivery.
              </p>
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
                      parseInt(markup) || 0,
                      parseFloat(fixedMarkup) || 0
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
