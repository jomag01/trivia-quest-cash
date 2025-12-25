import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { 
  Users, 
  Plus, 
  ArrowLeft, 
  ArrowRight, 
  GitBranch, 
  Sparkles,
  Loader2,
  ChevronRight,
  Wallet
} from "lucide-react";

interface BinaryAccount {
  id: string;
  user_id: string;
  account_number: number;
  left_volume: number;
  right_volume: number;
  total_cycles: number;
  parent_id: string | null;
  placement_leg: 'left' | 'right' | null;
  created_at: string;
}

interface PlacementOption {
  leg: 'left' | 'right' | 'spillover';
  label: string;
  description: string;
}

export default function BinaryAccountsManager() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<BinaryAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [maxAccounts, setMaxAccounts] = useState(3);
  const [showPlacementDialog, setShowPlacementDialog] = useState(false);
  const [selectedPlacement, setSelectedPlacement] = useState<'left' | 'right' | 'spillover'>('spillover');
  const [pendingAccountNumber, setPendingAccountNumber] = useState<number | null>(null);
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchAccounts();
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "binary_max_accounts_per_user")
      .single();
    
    if (data?.value) {
      setMaxAccounts(parseInt(data.value));
    }
  };

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("binary_network")
        .select("*")
        .eq("user_id", user?.id)
        .order("account_number", { ascending: true });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error: any) {
      console.error("Error fetching binary accounts:", error);
      toast.error("Failed to load binary accounts");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = (accountNumber: number) => {
    setPendingAccountNumber(accountNumber);
    setSelectedPlacement('spillover');
    setShowPlacementDialog(true);
  };

  const confirmPlacement = async () => {
    if (!user || pendingAccountNumber === null) return;

    try {
      setPlacing(true);

      // Get the main account (account 1) to use as reference for placement
      const mainAccount = accounts.find(a => a.account_number === 1);
      
      if (!mainAccount) {
        toast.error("You need to have a main binary account first");
        return;
      }

      let parentId = mainAccount.id;
      let placementLeg: 'left' | 'right' = selectedPlacement === 'left' ? 'left' : 'right';

      // If spillover, find the deepest available spot using existing RPC
      if (selectedPlacement === 'spillover') {
        try {
          // Use the existing binary_find_leftmost_spot RPC
          const { data: spilloverData, error: spilloverError } = await supabase
            .rpc('binary_find_leftmost_spot', { 
              _network_id: mainAccount.id 
            });

          if (!spilloverError && spilloverData && Array.isArray(spilloverData) && spilloverData.length > 0) {
            const result = spilloverData[0] as { parent_id: string; leg: 'left' | 'right' };
            if (result.parent_id && result.leg) {
              parentId = result.parent_id;
              placementLeg = result.leg;
            }
          }
        } catch (err) {
          console.error("Spillover error:", err);
          // Fallback to left leg
          placementLeg = 'left';
        }
      }

      // Create the new account
      const { data: newAccount, error: createError } = await supabase
        .from("binary_network")
        .insert({
          user_id: user.id,
          account_number: pendingAccountNumber,
          account_slot: pendingAccountNumber,
          parent_id: parentId,
          placement_leg: placementLeg,
          left_volume: 0,
          right_volume: 0,
          total_cycles: 0
        })
        .select()
        .single();

      if (createError) throw createError;

      // Update parent's child reference
      const updateField = placementLeg === 'left' ? 'left_child_id' : 'right_child_id';
      const { error: updateError } = await supabase
        .from("binary_network")
        .update({ [updateField]: newAccount.id })
        .eq("id", parentId);

      if (updateError) {
        console.error("Failed to update parent:", updateError);
      }

      toast.success(`Account #${pendingAccountNumber} created successfully!`);
      setShowPlacementDialog(false);
      fetchAccounts();
    } catch (error: any) {
      console.error("Error creating account:", error);
      toast.error(error.message || "Failed to create account");
    } finally {
      setPlacing(false);
    }
  };

  const placementOptions: PlacementOption[] = [
    {
      leg: 'spillover',
      label: 'Auto Spillover',
      description: 'Automatically place in the next available position (recommended)'
    },
    {
      leg: 'left',
      label: 'Left Leg',
      description: 'Place directly under your main account\'s left leg'
    },
    {
      leg: 'right',
      label: 'Right Leg',
      description: 'Place directly under your main account\'s right leg'
    }
  ];

  const canCreateMoreAccounts = accounts.length < maxAccounts;
  const nextAccountNumber = accounts.length + 1;

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle>Binary Accounts</CardTitle>
            </div>
            <Badge variant="secondary">
              {accounts.length} / {maxAccounts} Accounts
            </Badge>
          </div>
          <CardDescription>
            Manage your multiple binary accounts to maximize earning potential. 
            Each account can earn up to ₱10,000 per day.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <div className="text-center py-8">
              <GitBranch className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Binary Accounts Yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Purchase AI credits or a binary product package to create your first binary account.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-gradient-to-r from-background to-muted/20"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                      <span className="text-lg font-bold text-primary">
                        #{account.account_number}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-semibold">
                        Account #{account.account_number}
                        {account.account_number === 1 && (
                          <Badge className="ml-2 text-xs" variant="default">Main</Badge>
                        )}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Created {new Date(account.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-blue-500">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="font-semibold">
                          ₱{account.left_volume?.toLocaleString() || 0}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">Left</span>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-green-500">
                        <span className="font-semibold">
                          ₱{account.right_volume?.toLocaleString() || 0}
                        </span>
                        <ArrowRight className="h-4 w-4" />
                      </div>
                      <span className="text-xs text-muted-foreground">Right</span>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-primary">
                        <Wallet className="h-4 w-4" />
                        <span className="font-semibold">{account.total_cycles || 0}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">Cycles</span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Create New Account Button */}
              {canCreateMoreAccounts && accounts.length > 0 && (
                <Button
                  variant="outline"
                  className="w-full h-20 border-dashed border-2 hover:border-primary/50 hover:bg-primary/5"
                  onClick={() => handleCreateAccount(nextAccountNumber)}
                >
                  <div className="flex items-center gap-3">
                    <Plus className="h-5 w-5" />
                    <div className="text-left">
                      <p className="font-semibold">Create Account #{nextAccountNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        Purchase AI credits or product package to unlock
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </Button>
              )}
            </div>
          )}

          {/* Info Card */}
          <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-amber-500 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm">Maximize Your Earnings</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Create up to {maxAccounts} binary accounts. Each account can earn ₱2,392 per cycle 
                  and up to ₱10,000 per day. Place additional accounts strategically to build 
                  volume on both legs!
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Placement Dialog */}
      <Dialog open={showPlacementDialog} onOpenChange={setShowPlacementDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose Account Placement</DialogTitle>
            <DialogDescription>
              Select where to place Account #{pendingAccountNumber} in your binary tree.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <RadioGroup
              value={selectedPlacement}
              onValueChange={(value) => setSelectedPlacement(value as 'left' | 'right' | 'spillover')}
              className="space-y-3"
            >
              {placementOptions.map((option) => (
                <div
                  key={option.leg}
                  className={`flex items-start space-x-3 p-4 rounded-lg border transition-colors ${
                    selectedPlacement === option.leg
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <RadioGroupItem value={option.leg} id={option.leg} className="mt-1" />
                  <Label htmlFor={option.leg} className="flex-1 cursor-pointer">
                    <div className="font-semibold">{option.label}</div>
                    <div className="text-sm text-muted-foreground">{option.description}</div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPlacementDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmPlacement} disabled={placing}>
              {placing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Placing...
                </>
              ) : (
                'Confirm Placement'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
