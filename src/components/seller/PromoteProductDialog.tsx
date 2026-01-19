import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Megaphone } from "lucide-react";

interface PromoteProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: any;
  onSuccess?: () => void;
}

const PLACEMENTS = [
  { id: "homepage", label: "Homepage Slider" },
  { id: "search_results", label: "Search Results" },
  { id: "category_page", label: "Category Pages" },
  { id: "product_detail", label: "You May Also Like" },
];

export default function PromoteProductDialog({ open, onOpenChange, product, onSuccess }: PromoteProductDialogProps) {
  const [loading, setLoading] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [bidAmount, setBidAmount] = useState("1.00");
  const [dailyBudget, setDailyBudget] = useState("50");
  const [totalBudget, setTotalBudget] = useState("500");
  const [selectedPlacements, setSelectedPlacements] = useState<string[]>(["homepage"]);

  const handlePromote = async () => {
    if (!product?.id || !product?.seller_id) {
      toast.error("Invalid product");
      return;
    }

    if (selectedPlacements.length === 0) {
      toast.error("Select at least one placement");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("promote_product", {
        p_product_id: product.id,
        p_seller_id: product.seller_id,
        p_campaign_name: campaignName || `Promo: ${product.name}`,
        p_bid_amount: parseFloat(bidAmount) || 1,
        p_daily_budget: parseFloat(dailyBudget) || 50,
        p_total_budget: parseFloat(totalBudget) || 500,
        p_placements: selectedPlacements,
      });

      if (error) throw error;

      toast.success("Product promotion submitted for approval!");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to promote product");
    } finally {
      setLoading(false);
    }
  };

  const togglePlacement = (id: string) => {
    setSelectedPlacements((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            Promote Product
          </DialogTitle>
          <DialogDescription>
            Boost "{product?.name}" visibility in sponsored placements
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label>Campaign Name</Label>
            <Input
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder={`Promo: ${product?.name || "Product"}`}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Bid Amount (₱)</Label>
              <Input
                type="number"
                step="0.10"
                min="0.10"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
              />
            </div>
            <div>
              <Label>Daily Budget (₱)</Label>
              <Input
                type="number"
                min="10"
                value={dailyBudget}
                onChange={(e) => setDailyBudget(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Total Budget (₱)</Label>
            <Input
              type="number"
              min="50"
              value={totalBudget}
              onChange={(e) => setTotalBudget(e.target.value)}
            />
          </div>

          <div>
            <Label className="mb-2 block">Placements</Label>
            <div className="space-y-2">
              {PLACEMENTS.map((p) => (
                <div key={p.id} className="flex items-center gap-2">
                  <Checkbox
                    id={p.id}
                    checked={selectedPlacements.includes(p.id)}
                    onCheckedChange={() => togglePlacement(p.id)}
                  />
                  <label htmlFor={p.id} className="text-sm cursor-pointer">
                    {p.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handlePromote} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit for Approval
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
