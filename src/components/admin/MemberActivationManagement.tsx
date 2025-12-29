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
  Star,
  Gem,
  Users,
  GitBranch,
  EyeOff,
  Settings2,
  Sparkles,
  Lock,
  Unlock
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
      // Search profiles by email or name
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, is_verified, is_paid_affiliate, ai_features_unlocked, diamonds, referral_code, created_at')
        .or(`email.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%,referral_code.ilike.%${searchQuery}%`)
        .limit(20);

      if (error) throw error;

      if (!profiles || profiles.length === 0) {
        setResults([]);
        toast.info('No users found matching your search');
        return;
      }

      // Get referral counts for each user
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

      // Get affiliate ranks
      const { data: affiliateRanks } = await supabase
        .from('affiliate_current_rank')
        .select('user_id, current_step, is_fixed, admin_activated')
        .in('user_id', userIds);

      const affiliateMap = new Map(affiliateRanks?.map(a => [a.user_id, a]) || []);

      // Get binary network status
      const { data: binaryStatus } = await supabase
        .from('binary_network')
        .select('id, user_id, admin_activated, has_deferred_payment, deferred_amount')
        .in('user_id', userIds)
        .eq('account_number', 1);

      const binaryMap = new Map(binaryStatus?.map(b => [b.user_id, b]) || []);

      const resultsWithDetails: SearchResult[] = profiles.map(p => ({
        ...p,
        ai_features_unlocked: (p as any).ai_features_unlocked || false,
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
      // First, update profile is_paid_affiliate - this is critical
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

      // Check if affiliate_current_rank exists
      const { data: existing } = await supabase
        .from('affiliate_current_rank')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        // Update existing record
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
        // Create new record
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
      handleSearch(); // Refresh results
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
      // Check if user already in binary network
      const { data: existing } = await supabase
        .from('binary_network')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        // Update to admin activated with deferred payment
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
        // Create new binary network entry with deferred payment
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
      handleSearch(); // Refresh results
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
      handleSearch(); // Refresh results
    } catch (error) {
      console.error('AI features toggle error:', error);
      toast.error('Failed to toggle AI features');
    } finally {
      setActivating(null);
    }
  };

  const getAffiliateRequirements = (result: SearchResult) => {
    const hasDiamonds = result.diamonds >= 150;
    const hasReferrals = result.referral_count >= 2;
    return { hasDiamonds, hasReferrals, meetsRequirements: hasDiamonds && hasReferrals };
  };

  return (
    <div className="space-y-6">
      <Card className="border-primary/20">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10">
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            Member Activation Management
          </CardTitle>
          <CardDescription>
            Search and manually activate members as verified affiliates or add to binary network
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Search by email, name, or referral code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Search
            </Button>
          </div>

          {results.length > 0 && (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Requirements</TableHead>
                    <TableHead>AI Features</TableHead>
                    <TableHead>Affiliate Status</TableHead>
                    <TableHead>Binary Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((result) => {
                    const reqs = getAffiliateRequirements(result);
                    return (
                      <TableRow key={result.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{result.full_name || 'No Name'}</p>
                            <p className="text-sm text-muted-foreground">{result.email}</p>
                            <p className="text-xs text-muted-foreground">Code: {result.referral_code}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Gem className="h-3 w-3" />
                              <span className="text-sm">{result.diamonds} diamonds</span>
                              {reqs.hasDiamonds ? (
                                <CheckCircle className="h-3 w-3 text-green-500" />
                              ) : (
                                <XCircle className="h-3 w-3 text-destructive" />
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="h-3 w-3" />
                              <span className="text-sm">{result.referral_count} referrals</span>
                              {reqs.hasReferrals ? (
                                <CheckCircle className="h-3 w-3 text-green-500" />
                              ) : (
                                <XCircle className="h-3 w-3 text-destructive" />
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {result.ai_features_unlocked || result.is_paid_affiliate ? (
                              <Badge className="bg-gradient-to-r from-purple-500 to-pink-500">
                                <Sparkles className="h-3 w-3 mr-1" />
                                Unlocked
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">
                                <Lock className="h-3 w-3 mr-1" />
                                Locked
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {result.affiliate_status?.is_fixed || result.affiliate_status?.admin_activated ? (
                            <Badge className="bg-green-500">
                              <Star className="h-3 w-3 mr-1" />
                              Fixed Affiliate
                            </Badge>
                          ) : result.affiliate_status ? (
                            <Badge variant="secondary">Step {result.affiliate_status.current_step}</Badge>
                          ) : (
                            <Badge variant="outline">Not Started</Badge>
                          )}
                          {result.affiliate_status?.admin_activated && (
                            <Badge variant="outline" className="ml-1 text-xs">Admin</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {result.binary_status ? (
                            <div className="space-y-1">
                              <Badge className="bg-primary">
                                <GitBranch className="h-3 w-3 mr-1" />
                                In Network
                              </Badge>
                              {result.binary_status.has_deferred_payment && (
                                <div className="text-xs text-amber-600">
                                  Owes: ₱{(result.binary_status.deferred_amount || 0).toLocaleString()}
                                </div>
                              )}
                              {result.binary_status.admin_activated && (
                                <Badge variant="outline" className="text-xs">Admin Added</Badge>
                              )}
                            </div>
                          ) : (
                            <Badge variant="outline">Not in Binary</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-2">
                            {!(result.affiliate_status?.is_fixed || result.affiliate_status?.admin_activated) && (
                              <Button
                                size="sm"
                                onClick={() => handleActivateAffiliate(result.id)}
                                disabled={activating === result.id}
                                className="bg-gradient-to-r from-amber-500 to-orange-500"
                              >
                                {activating === result.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                ) : (
                                  <Shield className="h-3 w-3 mr-1" />
                                )}
                                Activate Affiliate
                              </Button>
                            )}
                            {!result.binary_status && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAddToBinaryWithDeferred(result.id)}
                                disabled={activating === result.id}
                              >
                                {activating === result.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                ) : (
                                  <GitBranch className="h-3 w-3 mr-1" />
                                )}
                                Add to Binary (Deferred)
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant={result.ai_features_unlocked ? "destructive" : "default"}
                              onClick={() => handleToggleAIFeatures(result.id, result.ai_features_unlocked)}
                              disabled={activating === result.id}
                              className={!result.ai_features_unlocked ? "bg-gradient-to-r from-purple-500 to-pink-500" : ""}
                            >
                              {activating === result.id ? (
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              ) : result.ai_features_unlocked ? (
                                <Lock className="h-3 w-3 mr-1" />
                              ) : (
                                <Unlock className="h-3 w-3 mr-1" />
                              )}
                              {result.ai_features_unlocked ? 'Lock AI' : 'Unlock AI'}
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setTabVisibilityUser({
                                id: result.id,
                                name: result.full_name || result.email
                              })}
                            >
                              <EyeOff className="h-3 w-3 mr-1" />
                              Manage Tabs
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}

          {results.length === 0 && !loading && (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Search for members by email, name, or referral code</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tab Visibility Dialog */}
      <Dialog 
        open={!!tabVisibilityUser} 
        onOpenChange={(open) => !open && setTabVisibilityUser(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Manage Tab Visibility
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
