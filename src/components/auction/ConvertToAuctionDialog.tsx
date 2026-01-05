import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Gavel, CalendarIcon, Sparkles, Loader2, AlertTriangle, ArrowRightLeft
} from "lucide-react";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface Product {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  wholesale_price?: number;
  base_price?: number;
  category_id?: string;
  shipping_fee?: number;
}

interface AuctionCategory {
  id: string;
  name: string;
  slug: string;
}

interface ConvertToAuctionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
}

const CONDITIONS = [
  { value: "new", label: "New" },
  { value: "like_new", label: "Like New" },
  { value: "used", label: "Used" },
  { value: "vintage", label: "Vintage" },
  { value: "antique", label: "Antique" },
];

export const ConvertToAuctionDialog = ({ open, onOpenChange, product }: ConvertToAuctionDialogProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [categories, setCategories] = useState<AuctionCategory[]>([]);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [auctionTerms, setAuctionTerms] = useState<string>("");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category_id: "",
    condition: "new",
    starting_bid: "",
    reserve_price: "",
    buy_now_price: "",
    end_date: addDays(new Date(), 7),
    shipping_fee: "",
    enable_buy_now: false,
    enable_reserve: false,
  });

  const [aiSuggestedPrice, setAiSuggestedPrice] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      fetchCategories();
      fetchAuctionTerms();
    }
  }, [open]);

  // Pre-fill form when product changes
  useEffect(() => {
    if (product && open) {
      const price = product.wholesale_price || product.base_price || 0;
      setFormData(prev => ({
        ...prev,
        title: product.name || "",
        description: product.description || "",
        starting_bid: price.toString(),
        buy_now_price: (price * 1.5).toFixed(0), // Suggest 1.5x as buy now
        shipping_fee: product.shipping_fee?.toString() || "0",
      }));
    }
  }, [product, open]);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("auction_categories")
      .select("id, name, slug")
      .eq("is_active", true)
      .order("display_order");
    if (data) setCategories(data);
  };

  const fetchAuctionTerms = async () => {
    try {
      const { data, error } = await supabase
        .from("legal_terms")
        .select("content")
        .eq("term_type", "auction_terms")
        .eq("is_active", true)
        .single();

      if (!error && data) {
        setAuctionTerms(data.content);
      }
    } catch (error) {
      console.error("Failed to fetch auction terms");
    }
  };

  const getAiPriceSuggestion = async () => {
    if (!formData.title || !formData.condition) {
      toast.error("Please fill in title and condition first");
      return;
    }

    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-generate", {
        body: {
          type: "text",
          prompt: `Suggest a fair starting auction price in Philippine Pesos for the following item. Only respond with a number, no text or currency symbol.

Item: ${formData.title}
Description: ${formData.description || "Not provided"}
Condition: ${formData.condition}
Category: ${categories.find(c => c.id === formData.category_id)?.name || "General"}

Consider Philippine market prices. Respond with just the number.`,
        },
      });

      if (data?.text) {
        const price = parseFloat(data.text.replace(/[^\d.]/g, ""));
        if (!isNaN(price)) {
          setAiSuggestedPrice(price);
          setFormData({ ...formData, starting_bid: price.toString() });
          toast.success(`AI suggests ₱${price.toLocaleString()}`);
        }
      }
    } catch (error) {
      toast.error("Failed to get AI suggestion");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user || !product) return;

    if (!formData.title || !formData.starting_bid || !formData.category_id) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!agreedToTerms) {
      toast.error("Please agree to the auction terms and conditions");
      return;
    }

    setLoading(true);

    try {
      // Get product images if available
      const { data: productImages } = await supabase
        .from("product_images")
        .select("image_url")
        .eq("product_id", product.id)
        .order("display_order");

      const images = productImages?.map(img => img.image_url) || [];
      // If no gallery images, use the main product image
      if (images.length === 0 && product.image_url) {
        images.push(product.image_url);
      }

      if (images.length === 0) {
        toast.error("Product has no images. Please add at least one image to your product first.");
        setLoading(false);
        return;
      }

      const auctionData = {
        seller_id: user.id,
        title: formData.title,
        description: formData.description,
        category_id: formData.category_id,
        condition: formData.condition,
        starting_bid: Number(formData.starting_bid),
        reserve_price: formData.enable_reserve && formData.reserve_price
          ? Number(formData.reserve_price)
          : null,
        buy_now_price: formData.enable_buy_now && formData.buy_now_price
          ? Number(formData.buy_now_price)
          : null,
        ends_at: formData.end_date.toISOString(),
        original_end_time: formData.end_date.toISOString(),
        shipping_fee: formData.shipping_fee ? Number(formData.shipping_fee) : 0,
        images,
        ai_suggested_price: aiSuggestedPrice,
        status: "pending_approval",
      };

      const { error } = await supabase.from("auctions").insert(auctionData);

      if (error) throw error;

      toast.success("Product converted to auction! Awaiting approval.");
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.message || "Failed to create auction");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      category_id: "",
      condition: "new",
      starting_bid: "",
      reserve_price: "",
      buy_now_price: "",
      end_date: addDays(new Date(), 7),
      shipping_fee: "",
      enable_buy_now: false,
      enable_reserve: false,
    });
    setAiSuggestedPrice(null);
    setAgreedToTerms(false);
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-amber-500" />
            Convert to Auction
          </DialogTitle>
          <DialogDescription>
            Turn your product into an auction listing without re-uploading
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Product Preview */}
            <Card className="p-4 bg-muted/30">
              <div className="flex gap-4">
                {product.image_url && (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold">{product.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {product.description || "No description"}
                  </p>
                  <p className="text-sm font-medium mt-1">
                    Original Price: ₱{(product.wholesale_price || product.base_price || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </Card>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Auction Title *</Label>
              <Input
                id="title"
                placeholder="Auction title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe your item for auction..."
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {/* Category & Condition */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Auction Category *</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(v) => setFormData({ ...formData, category_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Condition *</Label>
                <Select
                  value={formData.condition}
                  onValueChange={(v) => setFormData({ ...formData, condition: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITIONS.map((cond) => (
                      <SelectItem key={cond.value} value={cond.value}>
                        {cond.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Starting Bid with AI */}
            <div className="space-y-2">
              <Label htmlFor="starting_bid">Starting Bid *</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₱</span>
                  <Input
                    id="starting_bid"
                    type="number"
                    placeholder="0.00"
                    className="pl-7"
                    value={formData.starting_bid}
                    onChange={(e) => setFormData({ ...formData, starting_bid: e.target.value })}
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={getAiPriceSuggestion}
                  disabled={aiLoading}
                >
                  {aiLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2 text-amber-500" />
                      AI Suggest
                    </>
                  )}
                </Button>
              </div>
              {aiSuggestedPrice && (
                <p className="text-xs text-amber-500">
                  AI suggested: ₱{aiSuggestedPrice.toLocaleString()}
                </p>
              )}
            </div>

            {/* Reserve Price */}
            <div className="space-y-3 p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <Label>Enable Reserve Price</Label>
                <Switch
                  checked={formData.enable_reserve}
                  onCheckedChange={(v) => setFormData({ ...formData, enable_reserve: v })}
                />
              </div>
              {formData.enable_reserve && (
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₱</span>
                  <Input
                    type="number"
                    placeholder="Minimum price to sell"
                    className="pl-7"
                    value={formData.reserve_price}
                    onChange={(e) => setFormData({ ...formData, reserve_price: e.target.value })}
                  />
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Reserve price is hidden. Auction only completes if this price is met.
              </p>
            </div>

            {/* Buy Now Price */}
            <div className="space-y-3 p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <Label>Enable Buy Now</Label>
                <Switch
                  checked={formData.enable_buy_now}
                  onCheckedChange={(v) => setFormData({ ...formData, enable_buy_now: v })}
                />
              </div>
              {formData.enable_buy_now && (
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₱</span>
                  <Input
                    type="number"
                    placeholder="Instant purchase price"
                    className="pl-7"
                    value={formData.buy_now_price}
                    onChange={(e) => setFormData({ ...formData, buy_now_price: e.target.value })}
                  />
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Allow buyers to instantly purchase at this price.
              </p>
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label>Auction End Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(formData.end_date, "PPP 'at' p")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.end_date}
                    onSelect={(date) => date && setFormData({ ...formData, end_date: date })}
                    disabled={(date) => date < new Date() || date > addDays(new Date(), 30)}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Shipping Fee */}
            <div className="space-y-2">
              <Label htmlFor="shipping_fee">Shipping Fee</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₱</span>
                <Input
                  id="shipping_fee"
                  type="number"
                  placeholder="0 for free shipping"
                  className="pl-7"
                  value={formData.shipping_fee}
                  onChange={(e) => setFormData({ ...formData, shipping_fee: e.target.value })}
                />
              </div>
            </div>

            {/* Terms Agreement */}
            <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="terms"
                  checked={agreedToTerms}
                  onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                />
                <div className="space-y-1">
                  <label htmlFor="terms" className="text-sm font-medium cursor-pointer">
                    I agree to the auction terms and conditions
                  </label>
                  <p className="text-xs text-muted-foreground">
                    By converting to auction, you agree to our{" "}
                    <button
                      type="button"
                      className="text-primary underline"
                      onClick={() => setShowTerms(!showTerms)}
                    >
                      auction policies
                    </button>
                  </p>
                </div>
              </div>

              {showTerms && auctionTerms && (
                <div className="mt-3 p-3 bg-background rounded border text-xs max-h-40 overflow-y-auto whitespace-pre-wrap">
                  {auctionTerms}
                </div>
              )}

              <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Your original product listing will remain active. The auction is a separate listing using the same images.
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              className="w-full gap-2"
              onClick={handleSubmit}
              disabled={loading || !agreedToTerms}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Gavel className="h-4 w-4" />
              )}
              Convert to Auction
            </Button>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default ConvertToAuctionDialog;
