import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  Search, 
  UserCheck, 
  Shield, 
  Loader2,
  CheckCircle,
  XCircle,
  Gem,
  Users,
  GitBranch,
  EyeOff,
  Settings2,
  Sparkles,
  Lock,
  Unlock,
  Store,
  Star,
  Calendar,
  Hexagon,
  Crown,
  Edit
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { TabVisibilityManager } from './TabVisibilityManager';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBeehiveTiers } from '@/hooks/useBeehiveTiers';

interface SearchResult {
  id: string;
  email: string;
  full_name: string;
  is_verified: boolean;
  is_paid_affiliate: boolean;
  ai_features_unlocked: boolean;
  marketplace_activated: boolean;
  is_on_hold: boolean;
  is_verified_user: boolean;
  diamonds: number;
  referral_code: string;
  referral_count: number;
  created_at: string;
  affiliate_status?: {
    current_step: number;
    is_fixed: boolean;
    admin_activated: boolean;
  } | null;
  binary_status?: {
    id: string;
    admin_activated: boolean;
    has_deferred_payment: boolean;
    deferred_amount: number;
    deferred_plan_type: string | null;
  } | null;
}

const PLAN_LABELS: Record<string, string> = {
  monthly: 'Monthly',
  biannual: '6-Month',
  yearly: 'Yearly'
};

const PLAN_ICONS: Record<string, React.ReactNode> = {
  monthly: <Calendar className="h-3 w-3 text-blue-500" />,
  biannual: <Hexagon className="h-3 w-3 text-purple-500" />,
  yearly: <Crown className="h-3 w-3 text-yellow-500" />
};

export default function MemberActivationManagement() {
  const { user } = useAuth();
  const { tiers } = useBeehiveTiers();
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [activating, setActivating] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [tabVisibilityUser, setTabVisibilityUser] = useState<{ id: string; name: string } | null>(null);
  
  // Deferred plan editor state
  const [editingDeferredUser, setEditingDeferredUser] = useState<SearchResult | null>(null);
  const [selectedDeferredPlan, setSelectedDeferredPlan] = useState<string>('monthly');
  const [savingDeferred, setSavingDeferred] = useState(false);
  
  // Binary add with plan selection
  const [addingBinaryUser, setAddingBinaryUser] = useState<SearchResult | null>(null);
  const [selectedNewPlan, setSelectedNewPlan] = useState<string>('monthly');

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    setLoading(true);
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, is_verified, is_paid_affiliate, ai_features_unlocked, marketplace_activated, is_on_hold, is_verified_user, diamonds, referral_code, created_at')
        .or(`email.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%,referral_code.ilike.%${searchQuery}%`)
        .limit(20);

      if (error) throw error;

      if (!profiles || profiles.length === 0) {
        setResults([]);
        toast.info('No users found matching your search');
        return;
      }

      const userIds = profiles.map(p => p.id);
      
      const { data: referralCounts } = await supabase
        .from('profiles')
        .select('referred_by')
        .in('referred_by', userIds);

      const referralCountMap = new Map<string, number>();
      referralCounts?.forEach(r => {
        if (r.referred_by) {
          referralCountMap.set(r.referred_by, (referralCountMap.get(r.referred_by) || 0) + 1);
        }
      });

      const { data: affiliateRanks } = await supabase
        .from('affiliate_current_rank')
        .select('user_id, current_step, is_fixed, admin_activated')
        .in('user_id', userIds);

      const affiliateMap = new Map(affiliateRanks?.map(a => [a.user_id, a]) || []);

      const { data: binaryStatus } = await supabase
        .from('binary_network')
        .select('id, user_id, admin_activated, has_deferred_payment, deferred_amount, deferred_plan_type')
        .in('user_id', userIds)
        .eq('account_number', 1);

      const binaryData = binaryStatus as any[] | null;
      const binaryMap = new Map(binaryData?.map(b => [b.user_id, b]) || []);

      const resultsWithDetails: SearchResult[] = profiles.map(p => ({
        ...p,
        ai_features_unlocked: (p as any).ai_features_unlocked || false,
        marketplace_activated: (p as any).marketplace_activated || false,
        is_on_hold: (p as any).is_on_hold ?? true,
        is_verified_user: (p as any).is_verified_user || false,
        referral_count: referralCountMap.get(p.id) || 0,
        affiliate_status: affiliateMap.get(p.id) || null,
        binary_status: binaryMap.get(p.id) ? {
          id: binaryMap.get(p.id)!.id,
          admin_activated: binaryMap.get(p.id)!.admin_activated || false,
          has_deferred_payment: binaryMap.get(p.id)!.has_deferred_payment || false,
          deferred_amount: binaryMap.get(p.id)!.deferred_amount || 0,
          deferred_plan_type: binaryMap.get(p.id)!.deferred_plan_type || null
        } : null
      }));

      setResults(resultsWithDetails);
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search users');
    } finally {
      setLoading(false);
    }
  };

  const handleActivateAffiliate = async (userId: string) => {
    if (!user) return;
    
    setActivating(userId);
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ is_paid_affiliate: true })
        .eq('id', userId);

      if (profileError) {
        console.error('Profile update error:', profileError);
        toast.error('Failed to update profile. Please try again.');
        setActivating(null);
        return;
      }

      const { data: existing } = await supabase
        .from('affiliate_current_rank')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('affiliate_current_rank')
          .update({
            is_fixed: true,
            admin_activated: true,
            admin_activated_at: new Date().toISOString(),
            admin_activated_by: user.id
          })
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('affiliate_current_rank')
          .insert({
            user_id: userId,
            current_step: 1,
            qualification_count: 0,
            is_fixed: true,
            admin_activated: true,
            admin_activated_at: new Date().toISOString(),
            admin_activated_by: user.id
          });

        if (error) throw error;
      }

      toast.success('User activated as verified affiliate!');
      handleSearch();
    } catch (error) {
      console.error('Activation error:', error);
      toast.error('Failed to activate user');
    } finally {
      setActivating(null);
    }
  };

  const handleAddToBinaryWithDeferred = async (userId: string, planType: string, deferredAmount: number) => {
    if (!user) return;
    
    setActivating(userId);
    try {
      const { data: existing } = await supabase
        .from('binary_network')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('binary_network')
          .update({
            admin_activated: true,
            admin_activated_at: new Date().toISOString(),
            admin_activated_by: user.id,
            has_deferred_payment: true,
            deferred_amount: deferredAmount,
            deferred_paid_amount: 0,
            deferred_plan_type: planType
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('binary_network')
          .insert({
            user_id: userId,
            account_number: 1,
            account_slot: 1,
            left_volume: 0,
            right_volume: 0,
            total_cycles: 0,
            admin_activated: true,
            admin_activated_at: new Date().toISOString(),
            admin_activated_by: user.id,
            has_deferred_payment: true,
            deferred_amount: deferredAmount,
            deferred_paid_amount: 0,
            deferred_plan_type: planType
          });

        if (error) throw error;
      }

      toast.success(`User added to AI Beehives as ${PLAN_LABELS[planType]} (₱${deferredAmount.toLocaleString()} deferred)`);
      setAddingBinaryUser(null);
      handleSearch();
    } catch (error) {
      console.error('Binary activation error:', error);
      toast.error('Failed to add user to binary network');
    } finally {
      setActivating(null);
    }
  };

  const handleUpdateDeferredPlan = async () => {
    if (!user || !editingDeferredUser?.binary_status) return;
    
    setSavingDeferred(true);
    try {
      const selectedTier = tiers.find(t => t.plan_type === selectedDeferredPlan);
      const newAmount = selectedTier?.price || 1390;

      const { error } = await supabase
        .from('binary_network')
        .update({
          deferred_plan_type: selectedDeferredPlan,
          deferred_amount: newAmount
        })
        .eq('id', editingDeferredUser.binary_status.id);

      if (error) throw error;

      toast.success(`Deferred plan updated to ${PLAN_LABELS[selectedDeferredPlan]} (₱${newAmount.toLocaleString()})`);
      setEditingDeferredUser(null);
      handleSearch();
    } catch (error) {
      console.error('Update deferred plan error:', error);
      toast.error('Failed to update deferred plan');
    } finally {
      setSavingDeferred(false);
    }
  };

  const openEditDeferredPlan = (result: SearchResult) => {
    setEditingDeferredUser(result);
    setSelectedDeferredPlan(result.binary_status?.deferred_plan_type || 'monthly');
  };

  const openAddBinaryDialog = (result: SearchResult) => {
    setAddingBinaryUser(result);
    setSelectedNewPlan('monthly');
  };

  const handleConfirmAddBinary = () => {
    if (!addingBinaryUser) return;
    const selectedTier = tiers.find(t => t.plan_type === selectedNewPlan);
    const amount = selectedTier?.price || 1390;
    handleAddToBinaryWithDeferred(addingBinaryUser.id, selectedNewPlan, amount);
  };

  const handleToggleAIFeatures = async (userId: string, currentStatus: boolean) => {
    setActivating(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ ai_features_unlocked: !currentStatus })
        .eq('id', userId);

      if (error) throw error;

      toast.success(currentStatus ? 'AI features locked for user' : 'AI features unlocked for user');
      handleSearch();
    } catch (error) {
      console.error('AI features toggle error:', error);
      toast.error('Failed to toggle AI features');
    } finally {
      setActivating(null);
    }
  };

  const handleToggleMarketplace = async (userId: string, currentStatus: boolean) => {
    setActivating(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ marketplace_activated: !currentStatus })
        .eq('id', userId);

      if (error) throw error;

      toast.success(currentStatus ? 'Marketplace access revoked' : 'Marketplace access granted');
      handleSearch();
    } catch (error) {
      console.error('Marketplace toggle error:', error);
      toast.error('Failed to toggle marketplace access');
    } finally {
      setActivating(null);
    }
  };

  const handleToggleHold = async (userId: string, currentHoldStatus: boolean) => {
    setActivating(userId);
    try {
      const newStatus = !currentHoldStatus;
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_on_hold: newStatus,
          is_verified_user: !newStatus 
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success(newStatus ? 'User account put on hold' : 'User account activated (unhold)');
      handleSearch();
    } catch (error) {
      console.error('Hold toggle error:', error);
      toast.error('Failed to toggle hold status');
    } finally {
      setActivating(null);
    }
  };

  const getAffiliateRequirements = (result: SearchResult) => {
    const hasDiamonds = result.diamonds >= 150;
    const hasReferrals = result.referral_count >= 2;
    return { hasDiamonds, hasReferrals, meetsRequirements: hasDiamonds && hasReferrals };
  };

  const MemberCard = ({ result }: { result: SearchResult }) => {
    const reqs = getAffiliateRequirements(result);
    const isActivating = activating === result.id;
    
    return (
      <Card className="border border-border/50 bg-gradient-to-br from-card to-muted/20 overflow-hidden">
        {/* User Header */}
        <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10 p-3 border-b border-border/30">
          <p className="font-semibold text-sm truncate">{result.full_name || 'No Name'}</p>
          <p className="text-xs text-muted-foreground truncate">{result.email}</p>
          <p className="text-[10px] text-muted-foreground/70 font-mono">Code: {result.referral_code}</p>
        </div>
        
        {/* Status Grid */}
        <div className="p-3 space-y-3">
          {/* Requirements Row */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <Gem className="h-3 w-3 text-cyan-500" />
              <span>{result.diamonds}</span>
              {reqs.hasDiamonds ? (
                <CheckCircle className="h-3 w-3 text-green-500" />
              ) : (
                <XCircle className="h-3 w-3 text-destructive" />
              )}
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3 text-blue-500" />
              <span>{result.referral_count}</span>
              {reqs.hasReferrals ? (
                <CheckCircle className="h-3 w-3 text-green-500" />
              ) : (
                <XCircle className="h-3 w-3 text-destructive" />
              )}
            </div>
          </div>
          
          {/* Status Badges */}
          <div className="flex flex-wrap gap-1.5">
            {/* Hold Status Badge */}
            {result.is_on_hold ? (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5">
                On Hold
              </Badge>
            ) : (
              <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-[10px] px-1.5 py-0.5">
                Active
              </Badge>
            )}

            {/* Payment Status */}
            {result.binary_status?.has_deferred_payment && !result.binary_status?.admin_activated ? (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 text-amber-600 border-amber-400">
                Unpaid
              </Badge>
            ) : result.binary_status && !result.binary_status.has_deferred_payment ? (
              <Badge className="bg-gradient-to-r from-green-500 to-teal-500 text-white text-[10px] px-1.5 py-0.5">
                Paid
              </Badge>
            ) : null}

            {result.ai_features_unlocked || result.is_paid_affiliate ? (
              <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] px-1.5 py-0.5">
                <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                AI
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 text-muted-foreground">
                <Lock className="h-2.5 w-2.5 mr-0.5" />
                AI
              </Badge>
            )}
            
            {result.marketplace_activated || reqs.meetsRequirements ? (
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] px-1.5 py-0.5">
                <Store className="h-2.5 w-2.5 mr-0.5" />
                Market
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 text-muted-foreground">
                <Lock className="h-2.5 w-2.5 mr-0.5" />
                Market
              </Badge>
            )}
            
            {result.affiliate_status?.is_fixed || result.affiliate_status?.admin_activated ? (
              <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-[10px] px-1.5 py-0.5">
                <Star className="h-2.5 w-2.5 mr-0.5" />
                Affiliate
              </Badge>
            ) : result.affiliate_status ? (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                Step {result.affiliate_status.current_step}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 text-muted-foreground">
                No Affiliate
              </Badge>
            )}
            
            {result.binary_status ? (
              <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-[10px] px-1.5 py-0.5">
                <GitBranch className="h-2.5 w-2.5 mr-0.5" />
                Binary
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 text-muted-foreground">
                No Binary
              </Badge>
            )}
          </div>
          
          {result.binary_status?.has_deferred_payment && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {PLAN_ICONS[result.binary_status.deferred_plan_type || 'monthly']}
                <span className="text-[10px] text-amber-600 font-medium">
                  {PLAN_LABELS[result.binary_status.deferred_plan_type || 'monthly']} - Owes: ₱{(result.binary_status.deferred_amount || 0).toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>
        
        {/* Actions */}
        <div className="p-2 border-t border-border/30 bg-muted/20">
          <div className="grid grid-cols-2 gap-1.5">
            {/* Hold/Unhold Button */}
            <Button
              size="sm"
              variant={result.is_on_hold ? "default" : "secondary"}
              onClick={() => handleToggleHold(result.id, result.is_on_hold)}
              disabled={isActivating}
              className={`h-7 text-[10px] ${result.is_on_hold ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600' : ''}`}
            >
              {isActivating ? <Loader2 className="h-3 w-3 animate-spin" /> : result.is_on_hold ? <Unlock className="h-3 w-3 mr-1" /> : <Lock className="h-3 w-3 mr-1" />}
              {result.is_on_hold ? 'Unhold' : 'Hold'}
            </Button>
            
            {!(result.affiliate_status?.is_fixed || result.affiliate_status?.admin_activated) && (
              <Button
                size="sm"
                onClick={() => handleActivateAffiliate(result.id)}
                disabled={isActivating}
                className="h-7 text-[10px] bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              >
                {isActivating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Shield className="h-3 w-3 mr-1" />}
                Affiliate
              </Button>
            )}
            
            {!result.binary_status && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => openAddBinaryDialog(result)}
                disabled={isActivating}
                className="h-7 text-[10px] border-blue-400 text-blue-600 hover:bg-blue-50"
              >
                {isActivating ? <Loader2 className="h-3 w-3 animate-spin" /> : <GitBranch className="h-3 w-3 mr-1" />}
                Binary
              </Button>
            )}
            
            {result.binary_status?.has_deferred_payment && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => openEditDeferredPlan(result)}
                className="h-7 text-[10px] border-amber-400 text-amber-600 hover:bg-amber-50"
              >
                <Edit className="h-3 w-3 mr-1" />
                Edit Plan
              </Button>
            )}
            
            <Button
              size="sm"
              variant={result.ai_features_unlocked ? "destructive" : "default"}
              onClick={() => handleToggleAIFeatures(result.id, result.ai_features_unlocked)}
              disabled={isActivating}
              className={`h-7 text-[10px] ${!result.ai_features_unlocked ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600" : ""}`}
            >
              {isActivating ? <Loader2 className="h-3 w-3 animate-spin" /> : result.ai_features_unlocked ? <Lock className="h-3 w-3 mr-1" /> : <Unlock className="h-3 w-3 mr-1" />}
              {result.ai_features_unlocked ? 'Lock AI' : 'AI'}
            </Button>
            
            <Button
              size="sm"
              variant={result.marketplace_activated ? "destructive" : "outline"}
              onClick={() => handleToggleMarketplace(result.id, result.marketplace_activated)}
              disabled={isActivating}
              className={`h-7 text-[10px] ${!result.marketplace_activated ? "border-amber-400 text-amber-600 hover:bg-amber-50" : ""}`}
            >
              {isActivating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Store className="h-3 w-3 mr-1" />}
              {result.marketplace_activated ? 'Revoke' : 'Market'}
            </Button>
            
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setTabVisibilityUser({ id: result.id, name: result.full_name || result.email })}
              className="h-7 text-[10px] col-span-2"
            >
              <EyeOff className="h-3 w-3 mr-1" />
              Manage Tabs
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <Card className="border-primary/20 flex-1 flex flex-col overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10 py-3 px-4 shrink-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCheck className="h-4 w-4 text-primary" />
            Member Activation
          </CardTitle>
          <CardDescription className="text-xs">
            Activate members as affiliates or add to AI Beehives
          </CardDescription>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col overflow-hidden p-3">
          {/* Search Bar */}
          <div className="flex gap-2 mb-3 shrink-0">
            <Input
              placeholder="Email, name, or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="h-9 text-sm"
            />
            <Button onClick={handleSearch} disabled={loading} size="sm" className="h-9 px-3 shrink-0">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span className="ml-1 hidden sm:inline">Search</span>
            </Button>
          </div>

          {/* Results */}
          {results.length > 0 ? (
            <ScrollArea className="flex-1 -mx-1 px-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pb-2">
                {results.map((result) => (
                  <MemberCard key={result.id} result={result} />
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Search className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Search for members</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tab Visibility Dialog */}
      <Dialog 
        open={!!tabVisibilityUser} 
        onOpenChange={(open) => !open && setTabVisibilityUser(null)}
      >
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Settings2 className="h-4 w-4" />
              Manage Tabs
            </DialogTitle>
          </DialogHeader>
          {tabVisibilityUser && (
            <TabVisibilityManager
              userId={tabVisibilityUser.id}
              userName={tabVisibilityUser.name}
              onSaved={() => setTabVisibilityUser(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Deferred Plan Dialog */}
      <Dialog 
        open={!!editingDeferredUser} 
        onOpenChange={(open) => !open && setEditingDeferredUser(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Edit className="h-4 w-4" />
              Edit Deferred Plan
            </DialogTitle>
          </DialogHeader>
          {editingDeferredUser && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="font-medium text-sm">{editingDeferredUser.full_name || 'Unknown'}</p>
                <p className="text-xs text-muted-foreground">{editingDeferredUser.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs text-amber-600 border-amber-400">
                    Current: {PLAN_LABELS[editingDeferredUser.binary_status?.deferred_plan_type || 'monthly']}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    ₱{(editingDeferredUser.binary_status?.deferred_amount || 0).toLocaleString()}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Select New Plan</Label>
                <div className="grid grid-cols-3 gap-2">
                  {tiers.map(tier => (
                    <div
                      key={tier.id}
                      onClick={() => setSelectedDeferredPlan(tier.plan_type)}
                      className={`cursor-pointer p-3 rounded-lg border-2 text-center transition-all ${
                        selectedDeferredPlan === tier.plan_type
                          ? tier.plan_type === 'yearly'
                            ? 'border-yellow-500 bg-yellow-500/10'
                            : tier.plan_type === 'biannual'
                            ? 'border-purple-500 bg-purple-500/10'
                            : 'border-blue-500 bg-blue-500/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex justify-center mb-1">
                        {PLAN_ICONS[tier.plan_type]}
                      </div>
                      <p className="text-xs font-medium">{PLAN_LABELS[tier.plan_type]}</p>
                      <p className="text-sm font-bold">₱{tier.price.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDeferredUser(null)}>Cancel</Button>
            <Button onClick={handleUpdateDeferredPlan} disabled={savingDeferred}>
              {savingDeferred ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add to Binary Dialog */}
      <Dialog 
        open={!!addingBinaryUser} 
        onOpenChange={(open) => !open && setAddingBinaryUser(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <GitBranch className="h-4 w-4" />
              Add to AI Beehives
            </DialogTitle>
          </DialogHeader>
          {addingBinaryUser && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="font-medium text-sm">{addingBinaryUser.full_name || 'Unknown'}</p>
                <p className="text-xs text-muted-foreground">{addingBinaryUser.email}</p>
              </div>
              
              <div className="space-y-2">
                <Label>Select Deferred Plan</Label>
                <div className="grid grid-cols-3 gap-2">
                  {tiers.map(tier => (
                    <div
                      key={tier.id}
                      onClick={() => setSelectedNewPlan(tier.plan_type)}
                      className={`cursor-pointer p-3 rounded-lg border-2 text-center transition-all ${
                        selectedNewPlan === tier.plan_type
                          ? tier.plan_type === 'yearly'
                            ? 'border-yellow-500 bg-yellow-500/10'
                            : tier.plan_type === 'biannual'
                            ? 'border-purple-500 bg-purple-500/10'
                            : 'border-blue-500 bg-blue-500/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex justify-center mb-1">
                        {PLAN_ICONS[tier.plan_type]}
                      </div>
                      <p className="text-xs font-medium">{PLAN_LABELS[tier.plan_type]}</p>
                      <p className="text-sm font-bold">₱{tier.price.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddingBinaryUser(null)}>Cancel</Button>
            <Button onClick={handleConfirmAddBinary} disabled={activating === addingBinaryUser?.id}>
              {activating === addingBinaryUser?.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Add as Deferred
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}