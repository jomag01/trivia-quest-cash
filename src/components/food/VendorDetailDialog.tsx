import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Store, MapPin, Phone, Send, Check, X } from "lucide-react";

interface FoodVendor {
  id: string;
  name: string;
  logo_url: string | null;
  cover_image_url?: string | null;
  cuisine_type: string | null;
  address: string | null;
  phone?: string | null;
  approval_status: string;
  is_open: boolean;
  is_active?: boolean;
  delivery_fee?: number | null;
  minimum_order?: number | null;
  estimated_delivery_time?: string | null;
  admin_notes?: string | null;
  owner_id?: string;
  owner: { full_name: string | null; email: string | null } | null;
}

interface VendorDetailDialogProps {
  vendor: FoodVendor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const VendorDetailDialog = ({ vendor, open, onOpenChange }: VendorDetailDialogProps) => {
  const queryClient = useQueryClient();
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [adminNotes, setAdminNotes] = useState(vendor?.admin_notes || "");

  const updateVendorMutation = useMutation({
    mutationFn: async (updates: Partial<FoodVendor>) => {
      const { error } = await (supabase as any)
        .from("food_vendors")
        .update(updates)
        .eq("id", vendor?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-food-vendors"] });
      queryClient.invalidateQueries({ queryKey: ["pending-food-vendors"] });
      toast.success("Vendor updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update vendor");
    },
  });

  const sendFeedbackMutation = useMutation({
    mutationFn: async () => {
      if (!vendor?.owner_id || !feedbackMessage.trim()) return;

      // Create notification for vendor
      const { error } = await supabase.from("notifications").insert({
        user_id: vendor.owner_id,
        title: "Restaurant Update Required",
        message: feedbackMessage,
        type: "vendor_feedback",
      });

      if (error) throw error;

      // Also save to admin_notes
      await (supabase as any)
        .from("food_vendors")
        .update({ admin_notes: feedbackMessage })
        .eq("id", vendor.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-food-vendors"] });
      toast.success("Feedback sent to vendor!");
      setFeedbackMessage("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to send feedback");
    },
  });

  if (!vendor) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vendor Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Vendor Info */}
          <div className="flex items-start gap-4">
            {vendor.logo_url ? (
              <img
                src={vendor.logo_url}
                alt={vendor.name}
                className="w-20 h-20 rounded-lg object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center">
                <Store className="w-10 h-10 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{vendor.name}</h3>
              <p className="text-sm text-muted-foreground">{vendor.cuisine_type}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge
                  variant={
                    vendor.approval_status === "approved"
                      ? "default"
                      : vendor.approval_status === "rejected"
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {vendor.approval_status}
                </Badge>
                <Badge variant={vendor.is_open ? "default" : "outline"}>
                  {vendor.is_open ? "Open" : "Closed"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Contact & Location */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Contact & Location</h4>
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <p className="text-sm">
                <span className="font-medium">Owner:</span> {vendor.owner?.full_name || "N/A"}
              </p>
              <p className="text-sm">
                <span className="font-medium">Email:</span> {vendor.owner?.email || "N/A"}
              </p>
              {vendor.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4" />
                  {vendor.phone}
                </div>
              )}
              {vendor.address && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4" />
                  {vendor.address}
                </div>
              )}
            </div>
          </div>

          {/* Business Details */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Business Details</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Delivery Fee</p>
                <p className="font-medium">₱{vendor.delivery_fee || 0}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Min. Order</p>
                <p className="font-medium">₱{vendor.minimum_order || 0}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 col-span-2">
                <p className="text-xs text-muted-foreground">Est. Delivery Time</p>
                <p className="font-medium">{vendor.estimated_delivery_time || "Not set"}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Admin Controls */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Admin Controls</h4>

            {/* Open/Close Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <Label>Restaurant Status</Label>
                <p className="text-xs text-muted-foreground">Toggle restaurant open/closed</p>
              </div>
              <Switch
                checked={vendor.is_open}
                onCheckedChange={(checked) => updateVendorMutation.mutate({ is_open: checked })}
              />
            </div>

            {/* Approval Status */}
            {vendor.approval_status === "pending" && (
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => updateVendorMutation.mutate({ approval_status: "approved" })}
                >
                  <Check className="w-4 h-4 mr-1" />
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => updateVendorMutation.mutate({ approval_status: "rejected" })}
                >
                  <X className="w-4 h-4 mr-1" />
                  Reject
                </Button>
              </div>
            )}

            {vendor.approval_status === "approved" && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => updateVendorMutation.mutate({ approval_status: "suspended" })}
              >
                Suspend Vendor
              </Button>
            )}

            {(vendor.approval_status === "rejected" || vendor.approval_status === "suspended") && (
              <Button
                size="sm"
                onClick={() => updateVendorMutation.mutate({ approval_status: "approved" })}
              >
                Reactivate Vendor
              </Button>
            )}
          </div>

          <Separator />

          {/* Send Feedback to Vendor */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Send Feedback to Vendor</h4>
            <p className="text-xs text-muted-foreground">
              Send a message to the vendor about what needs to be updated (menu, photos, details, etc.)
            </p>
            <Textarea
              placeholder="E.g., Please update your menu photos, add more items, update delivery time..."
              value={feedbackMessage}
              onChange={(e) => setFeedbackMessage(e.target.value)}
              rows={3}
            />
            <Button
              onClick={() => sendFeedbackMutation.mutate()}
              disabled={!feedbackMessage.trim() || sendFeedbackMutation.isPending}
              className="w-full"
            >
              <Send className="w-4 h-4 mr-2" />
              {sendFeedbackMutation.isPending ? "Sending..." : "Send Feedback"}
            </Button>
          </div>

          {/* Previous Admin Notes */}
          {vendor.admin_notes && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Previous Admin Notes</h4>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm">{vendor.admin_notes}</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
