import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Save, X, ImagePlus, Trash2 } from "lucide-react";
import { uploadToStorage } from "@/lib/storage";

interface EditAuctionDialogProps {
  auction: {
    id: string;
    title: string;
    description?: string;
    images: string[];
    starting_bid: number;
    reserve_price?: number;
    buy_now_price?: number;
    ends_at: string;
    condition?: string;
    shipping_fee?: number;
    status: string;
    bid_count: number;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

const EditAuctionDialog = ({ auction, open, onOpenChange, onUpdate }: EditAuctionDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    starting_bid: 0,
    reserve_price: 0,
    buy_now_price: 0,
    condition: "used",
    shipping_fee: 0,
    ends_at: "",
    images: [] as string[],
  });

  useEffect(() => {
    if (auction) {
      setFormData({
        title: auction.title || "",
        description: auction.description || "",
        starting_bid: auction.starting_bid || 0,
        reserve_price: auction.reserve_price || 0,
        buy_now_price: auction.buy_now_price || 0,
        condition: auction.condition || "good",
        shipping_fee: auction.shipping_fee || 0,
        ends_at: auction.ends_at ? new Date(auction.ends_at).toISOString().slice(0, 16) : "",
        images: auction.images || [],
      });
    }
  }, [auction]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImages(true);
    try {
      const newImages: string[] = [];
      for (const file of Array.from(files)) {
        const fileName = `${Date.now()}-${file.name}`;
        const { data, error } = await uploadToStorage('auction-images', fileName, file);
        if (data?.publicUrl) {
          newImages.push(data.publicUrl);
        } else if (error) {
          console.error('Upload error:', error);
        }
      }
      if (newImages.length > 0) {
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, ...newImages]
        }));
        toast.success(`${newImages.length} image(s) uploaded`);
      }
    } catch (error) {
      toast.error("Failed to upload images");
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auction) return;

    setLoading(true);

    try {
      let updateData: any = {
        title: formData.title,
        description: formData.description,
        images: formData.images,
        shipping_fee: formData.shipping_fee || 0,
      };

      // Add additional fields only if no bids exist
      if (auction.bid_count === 0) {
        updateData = {
          ...updateData,
          starting_bid: formData.starting_bid,
          reserve_price: formData.reserve_price || null,
          buy_now_price: formData.buy_now_price || null,
          condition: formData.condition,
          ends_at: new Date(formData.ends_at).toISOString(),
        };
      }

      const { error } = await supabase
        .from("auctions")
        .update(updateData)
        .eq("id", auction.id);

      if (error) {
        console.error("Update error:", error);
        toast.error(`Failed to update auction: ${error.message}`);
        return;
      }

      toast.success("Auction updated successfully");
      onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Update error:", error);
      toast.error(`Failed to update auction: ${error.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const hasBids = auction?.bid_count && auction.bid_count > 0;
  const canEditPricing = !hasBids && (auction?.status === "active" || auction?.status === "pending_approval");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Auction</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {hasBids && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm text-amber-700 dark:text-amber-300">
              This auction has bids. Some fields cannot be edited.
            </div>
          )}

          {/* Images */}
          <div className="space-y-2">
            <Label>Images</Label>
            <div className="grid grid-cols-4 gap-2">
              {formData.images.map((img, idx) => (
                <div key={idx} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <label className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
                {uploadingImages ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  <ImagePlus className="h-6 w-6 text-muted-foreground" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploadingImages}
                />
              </label>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          {/* Starting Bid - only if no bids */}
          {canEditPricing && (
            <div className="space-y-2">
              <Label>Starting Bid (₱)</Label>
              <Input
                type="number"
                value={formData.starting_bid}
                onChange={(e) => setFormData({ ...formData, starting_bid: Number(e.target.value) })}
                min={1}
                required
              />
            </div>
          )}

          {/* Reserve Price - only if no bids */}
          {canEditPricing && (
            <div className="space-y-2">
              <Label>Reserve Price (₱) - Optional</Label>
              <Input
                type="number"
                value={formData.reserve_price || ""}
                onChange={(e) => setFormData({ ...formData, reserve_price: Number(e.target.value) })}
                min={0}
              />
            </div>
          )}

          {/* Buy Now Price - only if no bids */}
          {canEditPricing && (
            <div className="space-y-2">
              <Label>Buy Now Price (₱) - Optional</Label>
              <Input
                type="number"
                value={formData.buy_now_price || ""}
                onChange={(e) => setFormData({ ...formData, buy_now_price: Number(e.target.value) })}
                min={0}
              />
            </div>
          )}

          {/* Condition - only if no bids */}
          {canEditPricing && (
            <div className="space-y-2">
              <Label>Condition</Label>
              <Select
                value={formData.condition}
                onValueChange={(value) => setFormData({ ...formData, condition: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="like_new">Like New</SelectItem>
                  <SelectItem value="used">Used</SelectItem>
                  <SelectItem value="vintage">Vintage</SelectItem>
                  <SelectItem value="antique">Antique</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Shipping Fee */}
          <div className="space-y-2">
            <Label>Shipping Fee (₱)</Label>
            <Input
              type="number"
              value={formData.shipping_fee || ""}
              onChange={(e) => setFormData({ ...formData, shipping_fee: Number(e.target.value) })}
              min={0}
            />
          </div>

          {/* End Date - only if no bids */}
          {canEditPricing && (
            <div className="space-y-2">
              <Label>End Date & Time</Label>
              <Input
                type="datetime-local"
                value={formData.ends_at}
                onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })}
                min={new Date().toISOString().slice(0, 16)}
                required
              />
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-amber-500 hover:bg-amber-600"
              disabled={loading || uploadingImages}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditAuctionDialog;
