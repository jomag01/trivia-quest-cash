import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Trash2, Loader2, RefreshCw } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ResetOption {
  id: string;
  label: string;
  description: string;
  tables: string[];
  dangerous: boolean;
}

const resetOptions: ResetOption[] = [
  {
    id: "orders",
    label: "Orders & Sales",
    description: "Reset all product orders, order items, and sales records",
    tables: ["order_items", "orders"],
    dangerous: true,
  },
  {
    id: "food_orders",
    label: "Food Orders",
    description: "Reset all food orders, food order items, and delivery assignments",
    tables: ["food_order_items", "delivery_assignments", "food_orders"],
    dangerous: true,
  },
  {
    id: "wallets",
    label: "Wallets (Credits & Diamonds)",
    description: "Reset all user treasure wallets (diamonds, gems, credits) to zero",
    tables: ["treasure_wallet"],
    dangerous: true,
  },
  {
    id: "commissions",
    label: "Commissions & Earnings",
    description: "Reset all commission records (unilevel, stair-step, leadership)",
    tables: ["commissions", "leadership_commissions"],
    dangerous: true,
  },
  {
    id: "credit_purchases",
    label: "Credit Purchases",
    description: "Reset all credit purchase records and payment proofs",
    tables: ["credit_purchases"],
    dangerous: true,
  },
  {
    id: "payout_requests",
    label: "Payout Requests",
    description: "Reset all payout/withdrawal requests",
    tables: ["payout_requests"],
    dangerous: true,
  },
  {
    id: "affiliate_ranks",
    label: "Affiliate Rankings",
    description: "Reset affiliate rank history, monthly sales, and current ranks",
    tables: ["affiliate_rank_history", "affiliate_monthly_sales", "affiliate_current_rank"],
    dangerous: true,
  },
  {
    id: "diamond_marketplace",
    label: "Diamond Marketplace",
    description: "Reset all diamond listings and transactions",
    tables: ["diamond_transactions", "diamond_marketplace"],
    dangerous: true,
  },
  {
    id: "game_progress",
    label: "Game Progress",
    description: "Reset all game level completions, MOBA progress, and player heroes",
    tables: ["game_level_completions", "moba_level_completions", "moba_player_progress", "moba_player_heroes", "moba_purchases"],
    dangerous: true,
  },
  {
    id: "bookings",
    label: "Service Bookings",
    description: "Reset all service booking records",
    tables: ["service_bookings"],
    dangerous: true,
  },
  {
    id: "live_streams",
    label: "Live Streams",
    description: "Reset all live stream records, comments, and gifts",
    tables: ["live_stream_comments", "live_stream_gifts", "live_stream_products", "live_streams"],
    dangerous: true,
  },
  {
    id: "social_posts",
    label: "Social Media Posts",
    description: "Reset all posts, comments, reactions, and stories",
    tables: ["comment_reactions", "post_comments", "post_reactions", "posts", "stories"],
    dangerous: true,
  },
  {
    id: "notifications",
    label: "Notifications",
    description: "Clear all user notifications",
    tables: ["notifications"],
    dangerous: false,
  },
  {
    id: "cart_wishlist",
    label: "Cart & Wishlist",
    description: "Clear all shopping carts and wishlists",
    tables: ["cart", "wishlist"],
    dangerous: false,
  },
  {
    id: "link_tracking",
    label: "Link Tracking & Analytics",
    description: "Reset all link tracking data and ad impressions",
    tables: ["link_tracking", "ad_impressions", "user_interactions", "user_ad_preferences"],
    dangerous: false,
  },
];

export default function SystemResetManagement() {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isResetting, setIsResetting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const handleToggleOption = (optionId: string) => {
    setSelectedOptions((prev) =>
      prev.includes(optionId)
        ? prev.filter((id) => id !== optionId)
        : [...prev, optionId]
    );
  };

  const handleSelectAll = () => {
    if (selectedOptions.length === resetOptions.length) {
      setSelectedOptions([]);
    } else {
      setSelectedOptions(resetOptions.map((opt) => opt.id));
    }
  };

  const handleReset = async () => {
    if (confirmText !== "RESET") {
      toast.error("Please type RESET to confirm");
      return;
    }

    setIsResetting(true);
    setShowConfirmDialog(false);

    try {
      const selectedTables = selectedOptions.flatMap(
        (optId) => resetOptions.find((opt) => opt.id === optId)?.tables || []
      );

      // Remove duplicates
      const uniqueTables = [...new Set(selectedTables)];

      let successCount = 0;
      let errorCount = 0;

      for (const table of uniqueTables) {
        try {
          // Special handling for treasure_wallet - reset values instead of deleting
          if (table === "treasure_wallet") {
            const { error } = await supabase
              .from("treasure_wallet")
              .update({ diamonds: 0, gems: 0, credits: 0, updated_at: new Date().toISOString() })
              .neq("user_id", "00000000-0000-0000-0000-000000000000"); // Update all rows
            
            if (error) {
              console.error(`Error resetting ${table}:`, error);
              errorCount++;
            } else {
              successCount++;
            }
          } else {
            // For other tables, delete all records
            const { error } = await supabase
              .from(table as any)
              .delete()
              .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all rows
            
            if (error) {
              console.error(`Error clearing ${table}:`, error);
              errorCount++;
            } else {
              successCount++;
            }
          }
        } catch (err) {
          console.error(`Exception clearing ${table}:`, err);
          errorCount++;
        }
      }

      if (errorCount === 0) {
        toast.success(`Successfully reset ${successCount} tables!`);
      } else {
        toast.warning(`Reset completed with ${errorCount} errors. ${successCount} tables cleared successfully.`);
      }

      setSelectedOptions([]);
      setConfirmText("");
    } catch (error) {
      console.error("Reset error:", error);
      toast.error("An error occurred during reset");
    } finally {
      setIsResetting(false);
    }
  };

  const dangerousSelected = selectedOptions.some(
    (optId) => resetOptions.find((opt) => opt.id === optId)?.dangerous
  );

  return (
    <div className="space-y-6">
      <Card className="border-destructive/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-destructive" />
            <div>
              <CardTitle className="text-destructive">System Reset</CardTitle>
              <CardDescription>
                Permanently delete selected data from the system. This action cannot be undone.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Select All Button */}
          <div className="flex items-center justify-between pb-4 border-b">
            <Label className="text-sm font-medium">Select data to reset:</Label>
            <Button variant="outline" size="sm" onClick={handleSelectAll}>
              {selectedOptions.length === resetOptions.length ? "Deselect All" : "Select All"}
            </Button>
          </div>

          {/* Reset Options Grid */}
          <div className="grid gap-4 md:grid-cols-2">
            {resetOptions.map((option) => (
              <div
                key={option.id}
                className={`flex items-start space-x-3 p-4 rounded-lg border transition-colors ${
                  selectedOptions.includes(option.id)
                    ? option.dangerous
                      ? "border-destructive bg-destructive/5"
                      : "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/50"
                }`}
              >
                <Checkbox
                  id={option.id}
                  checked={selectedOptions.includes(option.id)}
                  onCheckedChange={() => handleToggleOption(option.id)}
                />
                <div className="flex-1 space-y-1">
                  <Label
                    htmlFor={option.id}
                    className="font-medium cursor-pointer flex items-center gap-2"
                  >
                    {option.label}
                    {option.dangerous && (
                      <span className="text-xs px-1.5 py-0.5 bg-destructive/20 text-destructive rounded">
                        Critical
                      </span>
                    )}
                  </Label>
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Selected Summary */}
          {selectedOptions.length > 0 && (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <p className="text-sm font-medium">
                Selected: {selectedOptions.length} of {resetOptions.length} categories
              </p>
              <p className="text-xs text-muted-foreground">
                Tables to be cleared:{" "}
                {selectedOptions
                  .flatMap((optId) => resetOptions.find((opt) => opt.id === optId)?.tables || [])
                  .filter((v, i, a) => a.indexOf(v) === i)
                  .join(", ")}
              </p>
            </div>
          )}

          {/* Reset Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button
              variant="destructive"
              size="lg"
              disabled={selectedOptions.length === 0 || isResetting}
              onClick={() => setShowConfirmDialog(true)}
              className="gap-2"
            >
              {isResetting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Reset Selected Data
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Confirm System Reset
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                You are about to permanently delete data from{" "}
                <strong>{selectedOptions.length}</strong> categories. This action{" "}
                <strong>cannot be undone</strong>.
              </p>
              {dangerousSelected && (
                <p className="text-destructive font-medium">
                  ⚠️ You have selected critical data that may affect user balances, earnings, and transaction history.
                </p>
              )}
              <div className="pt-2">
                <Label htmlFor="confirm-reset" className="text-sm">
                  Type <strong>RESET</strong> to confirm:
                </Label>
                <Input
                  id="confirm-reset"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                  placeholder="Type RESET"
                  className="mt-2"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmText("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReset}
              disabled={confirmText !== "RESET"}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Reset Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
