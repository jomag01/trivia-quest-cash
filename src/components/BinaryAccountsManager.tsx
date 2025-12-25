import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Wallet,
  UserPlus
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

interface DownlineAccount {
  id: string;
  user_id: string;
  account_number: number;
  left_child_id: string | null;
  right_child_id: string | null;
  profile?: {
    full_name: string | null;
    email: string | null;
  };
}

type PlacementMode = 'own' | 'downline';

export default function BinaryAccountsManager() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<BinaryAccount[]>([]);
  const [downlines, setDownlines] = useState<DownlineAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDownlines, setLoadingDownlines] = useState(false);
  const [maxAccounts, setMaxAccounts] = useState(3);
  const [showPlacementDialog, setShowPlacementDialog] = useState(false);
  const [placementMode, setPlacementMode] = useState<PlacementMode>('own');
  const [selectedPlacement, setSelectedPlacement] = useState<'left' | 'right' | 'spillover'>('spillover');
  const [selectedDownline, setSelectedDownline] = useState<string | null>(null);
  const [selectedDownlineLeg, setSelectedDownlineLeg] = useState<'left' | 'right'>('left');
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

  const fetchDownlines = async () => {
    if (!user) return;
    
    try {
      setLoadingDownlines(true);
      
      // Get all downlines in the user's network (users sponsored by the current user)
      const { data, error } = await supabase
        .from("binary_network")
        .select(`
          id,
          user_id,
          account_number,
          left_child_id,
          right_child_id
        `)
        .eq("sponsor_id", accounts[0]?.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      
      // Fetch profile info for each downline
      const downlinesWithProfiles: DownlineAccount[] = [];
      for (const downline of data || []) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", downline.user_id)
          .single();
        
        downlinesWithProfiles.push({
          ...downline,
          profile: profile || undefined
        });
      }
      
      setDownlines(downlinesWithProfiles);
    } catch (error: any) {
      console.error("Error fetching downlines:", error);
    } finally {
      setLoadingDownlines(false);
    }
  };

  const handleCreateAccount = (accountNumber: number) => {
    setPendingAccountNumber(accountNumber);
    setSelectedPlacement('spillover');
    setPlacementMode('own');
    setSelectedDownline(null);
    setSelectedDownlineLeg('left');
    setShowPlacementDialog(true);
    fetchDownlines();
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

      if (placementMode === 'downline' && selectedDownline) {
        // Place under selected downline
        const downline = downlines.find(d => d.id === selectedDownline);
        if (!downline) {
          toast.error("Selected downline not found");
          return;
        }
        
        // Check if the selected leg is available
        if (selectedDownlineLeg === 'left' && downline.left_child_id) {
          toast.error("Left leg is already occupied");
          return;
        }
        if (selectedDownlineLeg === 'right' && downline.right_child_id) {
          toast.error("Right leg is already occupied");
          return;
        }
        
        parentId = selectedDownline;
        placementLeg = selectedDownlineLeg;
      } else if (placementMode === 'own') {
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

  const getAvailableLegs = (downline: DownlineAccount) => {
    const available: ('left' | 'right')[] = [];
    if (!downline.left_child_id) available.push('left');
    if (!downline.right_child_id) available.push('right');
    return available;
  };

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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Choose Account Placement</DialogTitle>
            <DialogDescription>
              Select where to place Account #{pendingAccountNumber} in your binary tree.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {/* Placement Mode Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Placement Type</Label>
              <RadioGroup
                value={placementMode}
                onValueChange={(value) => {
                  setPlacementMode(value as PlacementMode);
                  if (value === 'own') {
                    setSelectedDownline(null);
                  }
                }}
                className="grid grid-cols-2 gap-3"
              >
                <div
                  className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                    placementMode === 'own'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <RadioGroupItem value="own" id="placement-own" />
                  <Label htmlFor="placement-own" className="cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span className="font-medium">Under My Account</span>
                    </div>
                  </Label>
                </div>
                <div
                  className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                    placementMode === 'downline'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <RadioGroupItem value="downline" id="placement-downline" />
                  <Label htmlFor="placement-downline" className="cursor-pointer">
                    <div className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      <span className="font-medium">Under Downline</span>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Own Account Placement Options */}
            {placementMode === 'own' && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Select Position</Label>
                <RadioGroup
                  value={selectedPlacement}
                  onValueChange={(value) => setSelectedPlacement(value as 'left' | 'right' | 'spillover')}
                  className="space-y-2"
                >
                  <div
                    className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors ${
                      selectedPlacement === 'spillover'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <RadioGroupItem value="spillover" id="spillover" className="mt-1" />
                    <Label htmlFor="spillover" className="flex-1 cursor-pointer">
                      <div className="font-medium">Auto Spillover</div>
                      <div className="text-xs text-muted-foreground">
                        Automatically place in the next available position (recommended)
                      </div>
                    </Label>
                  </div>
                  <div
                    className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors ${
                      selectedPlacement === 'left'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <RadioGroupItem value="left" id="left" className="mt-1" />
                    <Label htmlFor="left" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2 font-medium">
                        <ArrowLeft className="h-4 w-4 text-blue-500" />
                        Left Leg
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Place directly under your main account's left leg
                      </div>
                    </Label>
                  </div>
                  <div
                    className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors ${
                      selectedPlacement === 'right'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <RadioGroupItem value="right" id="right" className="mt-1" />
                    <Label htmlFor="right" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2 font-medium">
                        <ArrowRight className="h-4 w-4 text-green-500" />
                        Right Leg
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Place directly under your main account's right leg
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Downline Placement Options */}
            {placementMode === 'downline' && (
              <div className="space-y-4">
                {loadingDownlines ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">Loading downlines...</span>
                  </div>
                ) : downlines.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No downlines available for placement.</p>
                    <p className="text-xs mt-1">Refer new members to your binary network first.</p>
                  </div>
                ) : (
                  <>
                    {/* Select Downline */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Select Downline Account</Label>
                      <Select
                        value={selectedDownline || ''}
                        onValueChange={(value) => {
                          setSelectedDownline(value);
                          const downline = downlines.find(d => d.id === value);
                          if (downline) {
                            const available = getAvailableLegs(downline);
                            if (available.length > 0 && !available.includes(selectedDownlineLeg)) {
                              setSelectedDownlineLeg(available[0]);
                            }
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a downline..." />
                        </SelectTrigger>
                        <SelectContent>
                          <ScrollArea className="max-h-[200px]">
                            {downlines.map((downline) => {
                              const availableLegs = getAvailableLegs(downline);
                              const isDisabled = availableLegs.length === 0;
                              return (
                                <SelectItem 
                                  key={downline.id} 
                                  value={downline.id}
                                  disabled={isDisabled}
                                >
                                  <div className="flex items-center gap-2">
                                    <span>
                                      {downline.profile?.full_name || downline.profile?.email || 'Unknown'}
                                    </span>
                                    {downline.account_number && (
                                      <Badge variant="outline" className="text-xs">
                                        #{downline.account_number}
                                      </Badge>
                                    )}
                                    {isDisabled && (
                                      <Badge variant="secondary" className="text-xs">
                                        Full
                                      </Badge>
                                    )}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </ScrollArea>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Select Leg for Downline */}
                    {selectedDownline && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Select Leg</Label>
                        {(() => {
                          const downline = downlines.find(d => d.id === selectedDownline);
                          const availableLegs = downline ? getAvailableLegs(downline) : [];
                          
                          return (
                            <RadioGroup
                              value={selectedDownlineLeg}
                              onValueChange={(value) => setSelectedDownlineLeg(value as 'left' | 'right')}
                              className="grid grid-cols-2 gap-3"
                            >
                              <div
                                className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
                                  !availableLegs.includes('left') 
                                    ? 'opacity-50 cursor-not-allowed bg-muted'
                                    : selectedDownlineLeg === 'left'
                                      ? 'border-primary bg-primary/5 cursor-pointer'
                                      : 'border-border hover:border-primary/50 cursor-pointer'
                                }`}
                              >
                                <RadioGroupItem 
                                  value="left" 
                                  id="downline-left" 
                                  disabled={!availableLegs.includes('left')}
                                />
                                <Label htmlFor="downline-left" className="cursor-pointer">
                                  <div className="flex items-center gap-2">
                                    <ArrowLeft className="h-4 w-4 text-blue-500" />
                                    <span className="font-medium">Left Leg</span>
                                    {!availableLegs.includes('left') && (
                                      <Badge variant="secondary" className="text-xs">Occupied</Badge>
                                    )}
                                  </div>
                                </Label>
                              </div>
                              <div
                                className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
                                  !availableLegs.includes('right') 
                                    ? 'opacity-50 cursor-not-allowed bg-muted'
                                    : selectedDownlineLeg === 'right'
                                      ? 'border-primary bg-primary/5 cursor-pointer'
                                      : 'border-border hover:border-primary/50 cursor-pointer'
                                }`}
                              >
                                <RadioGroupItem 
                                  value="right" 
                                  id="downline-right" 
                                  disabled={!availableLegs.includes('right')}
                                />
                                <Label htmlFor="downline-right" className="cursor-pointer">
                                  <div className="flex items-center gap-2">
                                    <ArrowRight className="h-4 w-4 text-green-500" />
                                    <span className="font-medium">Right Leg</span>
                                    {!availableLegs.includes('right') && (
                                      <Badge variant="secondary" className="text-xs">Occupied</Badge>
                                    )}
                                  </div>
                                </Label>
                              </div>
                            </RadioGroup>
                          );
                        })()}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPlacementDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={confirmPlacement} 
              disabled={placing || (placementMode === 'downline' && !selectedDownline)}
            >
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
