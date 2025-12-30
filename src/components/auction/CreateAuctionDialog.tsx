import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import {
  Camera, Upload, CalendarIcon, Sparkles, Loader2, X, Plus
} from "lucide-react";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";

interface AuctionCategory {
  id: string;
  name: string;
  slug: string;
}

interface CreateAuctionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: AuctionCategory[];
}

const CONDITIONS = [
  { value: "new", label: "New" },
  { value: "like_new", label: "Like New" },
  { value: "used", label: "Used" },
  { value: "vintage", label: "Vintage" },
  { value: "antique", label: "Antique" },
];

const CreateAuctionDialog = ({ open, onOpenChange, categories }: CreateAuctionDialogProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category_id: "",
    condition: "used",
    starting_bid: "",
    reserve_price: "",
    buy_now_price: "",
    end_date: addDays(new Date(), 7),
    shipping_fee: "",
    enable_buy_now: false,
    enable_reserve: false,
  });

  const [aiSuggestedPrice, setAiSuggestedPrice] = useState<number | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;

    setUploading(true);
    const newImages: string[] = [];

    for (const file of Array.from(files)) {
      if (images.length + newImages.length >= 10) {
        toast.error("Maximum 10 images allowed");
        break;
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, file);

      if (uploadError) {
        toast.error("Failed to upload image");
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("product-images")
        .getPublicUrl(fileName);

      newImages.push(publicUrl);
    }

    setImages([...images, ...newImages]);
    setUploading(false);
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
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
    if (!user) return;

    if (!formData.title || !formData.starting_bid || !formData.category_id) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (images.length === 0) {
      toast.error("Please add at least one image");
      return;
    }

    setLoading(true);

    try {
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

      toast.success("Auction submitted for approval");
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
      condition: "used",
      starting_bid: "",
      reserve_price: "",
      buy_now_price: "",
      end_date: addDays(new Date(), 7),
      shipping_fee: "",
      enable_buy_now: false,
      enable_reserve: false,
    });
    setImages([]);
    setAiSuggestedPrice(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-amber-500" />
            Create New Auction
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Images */}
            <div className="space-y-2">
              <Label>Photos (up to 10)</Label>
              <div className="grid grid-cols-5 gap-2">
                {images.map((img, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden border">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={() => removeImage(i)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                {images.length < 10 && (
                  <label className="aspect-square rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer hover:bg-muted transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={uploading}
                    />
                    {uploading ? (
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    ) : (
                      <Plus className="h-6 w-6 text-muted-foreground" />
                    )}
                  </label>
                )}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="What are you selling?"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe your item in detail..."
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {/* Category & Condition */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category *</Label>
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
          </div>
        </ScrollArea>

        <div className="flex gap-3 pt-4 border-t">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="flex-1 bg-amber-500 hover:bg-amber-600"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Submit for Approval
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateAuctionDialog;
