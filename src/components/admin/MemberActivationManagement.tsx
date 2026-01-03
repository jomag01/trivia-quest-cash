import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  Star
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TabVisibilityManager } from './TabVisibilityManager';

interface SearchResult {
  id: string;
  email: string;
  full_name: string;
  is_verified: boolean;
  is_paid_affiliate: boolean;
  ai_features_unlocked: boolean;
  marketplace_activated: boolean;
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
  } | null;
}

export default function MemberActivationManagement() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [activating, setActivating] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [tabVisibilityUser, setTabVisibilityUser] = useState<{ id: string; name: string } | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    setLoading(true);
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, is_verified, is_paid_affiliate, ai_features_unlocked, marketplace_activated, diamonds, referral_code, created_at')
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
        .select('id, user_id, admin_activated, has_deferred_payment, deferred_amount')
        .in('user_id', userIds)
        .eq('account_number', 1);

      const binaryMap = new Map(binaryStatus?.map(b => [b.user_id, b]) || []);

      const resultsWithDetails: SearchResult[] = profiles.map(p => ({
        ...p,
        ai_features_unlocked: (p as any).ai_features_unlocked || false,
        marketplace_activated: (p as any).marketplace_activated || false,
        referral_count: referralCountMap.get(p.id) || 0,
        affiliate_status: affiliateMap.get(p.id) || null,
        binary_status: binaryMap.get(p.id) ? {
          id: binaryMap.get(p.id)!.id,
          admin_activated: binaryMap.get(p.id)!.admin_activated || false,
          has_deferred_payment: binaryMap.get(p.id)!.has_deferred_payment || false,
          deferred_amount: binaryMap.get(p.id)!.deferred_amount || 0
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

  const handleAddToBinaryWithDeferred = async (userId: string, deferredAmount: number = 2990) => {
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
            deferred_paid_amount: 0
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
            deferred_paid_amount: 0
          });

        if (error) throw error;
      }

      toast.success(`User added to binary network with ₱${deferredAmount.toLocaleString()} deferred payment`);
      handleSearch();
    } catch (error) {
      console.error('Binary activation error:', error);
      toast.error('Failed to add user to binary network');
    } finally {
      setActivating(null);
    }
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
            <p className="text-[10px] text-amber-600 font-medium">
              Owes: ₱{(result.binary_status.deferred_amount || 0).toLocaleString()}
            </p>
          )}
        </div>
        
        {/* Actions */}
        <div className="p-2 border-t border-border/30 bg-muted/20">
          <div className="grid grid-cols-2 gap-1.5">
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
                onClick={() => handleAddToBinaryWithDeferred(result.id)}
                disabled={isActivating}
                className="h-7 text-[10px] border-blue-400 text-blue-600 hover:bg-blue-50"
              >
                {isActivating ? <Loader2 className="h-3 w-3 animate-spin" /> : <GitBranch className="h-3 w-3 mr-1" />}
                Binary
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
            Activate members as affiliates or add to binary network
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
    </div>
  );
}