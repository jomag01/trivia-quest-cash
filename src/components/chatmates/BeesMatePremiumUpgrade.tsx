import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  Crown, Zap, Check, Star, Eye, Heart, MessageSquare, 
  BarChart3, Sparkles, Shield, Store, Link
} from "lucide-react";
import { motion } from "framer-motion";

interface PremiumTier {
  id: string;
  tier_name: string;
  tier_key: string;
  duration_days: number;
  price_php: number;
  visibility_multiplier: number;
  daily_likes: number | null;
  features: string[];
  can_showcase_shop: boolean;
  can_join_rewards_program: boolean;
  display_order: number;
}

interface BeesMatePremiumUpgradeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTierKey?: string;
  onUpgradeSuccess?: () => void;
}

const FEATURE_ICONS: Record<string, any> = {
  "visibility": Eye,
  "likes": Heart,
  "matching": Star,
  "icebreakers": MessageSquare,
  "coach": Sparkles,
  "badge": Shield,
  "analytics": BarChart3,
  "shop": Store,
};

export function BeesMatePremiumUpgrade({ open, onOpenChange, currentTierKey = 'free', onUpgradeSuccess }: BeesMatePremiumUpgradeProps) {
  const { user } = useAuth();
  const [tiers, setTiers] = useState<PremiumTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    fetchTiers();
  }, []);

  const fetchTiers = async () => {
    try {
      const { data, error } = await supabase
        .from('beesmate_premium_tiers')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      
      if (error) throw error;
      
      setTiers(data?.map(t => ({
        ...t,
        features: Array.isArray(t.features) ? t.features as string[] : JSON.parse(t.features as string || '[]')
      })) || []);
    } catch (error) {
      console.error('Error fetching tiers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (tier: PremiumTier) => {
    if (!user) {
      toast.error('Please sign in first');
      return;
    }

    if (tier.tier_key === 'free') return;

    setPurchasing(tier.id);
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + tier.duration_days);

      // Create subscription
      const { data: subData, error } = await supabase.from('beesmate_subscriptions').insert({
        user_id: user.id,
        tier_id: tier.id,
        status: 'active',
        expires_at: expiresAt.toISOString(),
        payment_method: 'credits'
      }).select().single();

      if (error) throw error;

      // Distribute commissions via universal commission RPC
      const { data: commissionResult, error: commissionError } = await supabase.rpc(
        'distribute_universal_commission',
        {
          p_buyer_id: user.id,
          p_amount: tier.price_php,
          p_source_type: 'beesmate',
          p_source_id: subData?.id || null,
          p_seller_id: null
        }
      );

      if (commissionError) {
        console.error('Commission distribution error:', commissionError);
      } else {
        console.log('Commission distributed:', commissionResult);
      }

      // Record payment for analytics
      await supabase.from('beesmate_subscription_payments').insert({
        user_id: user.id,
        subscription_id: subData?.id,
        tier_id: tier.id,
        amount_paid: tier.price_php,
        admin_profit: tier.price_php * 0.35,
        unilevel_pool: tier.price_php * 0.65 * 0.40,
        stairstep_pool: tier.price_php * 0.65 * 0.35,
        leadership_pool: tier.price_php * 0.65 * 0.25,
        status: 'completed'
      });

      toast.success(`Upgraded to ${tier.tier_name}!`);
      onOpenChange(false);
      onUpgradeSuccess?.();
    } catch (error) {
      console.error('Error purchasing tier:', error);
      toast.error('Failed to upgrade');
    } finally {
      setPurchasing(null);
    }
  };

  const getTierStyle = (tierKey: string, index: number) => {
    if (tierKey === 'pro') {
      return "bg-gradient-to-br from-rose-50 to-purple-50 dark:from-rose-950/30 dark:to-purple-950/30 border-rose-200 dark:border-rose-800";
    }
    if (tierKey === 'boost') {
      return "bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border-amber-200 dark:border-amber-800";
    }
    return "bg-card border-border";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Crown className="w-6 h-6 text-amber-500" />
            Upgrade Your Experience
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {tiers.filter(t => t.tier_key !== 'free').map((tier, index) => (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`relative overflow-hidden ${getTierStyle(tier.tier_key, index)}`}>
                  {tier.tier_key === 'pro' && (
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-rose-500 text-white">Most Popular</Badge>
                    </div>
                  )}
                  
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${tier.tier_key === 'pro' ? 'bg-rose-500' : 'bg-amber-500'} text-white`}>
                        {tier.tier_key === 'pro' ? <Crown className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{tier.tier_name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{tier.duration_days} days</p>
                      </div>
                    </div>
                    <div className="mt-2">
                      <span className="text-3xl font-bold">₱{tier.price_php.toLocaleString()}</span>
                      <span className="text-muted-foreground">/period</span>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    {tier.features.map((feature, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}

                    {tier.can_showcase_shop && (
                      <div className="flex items-start gap-2">
                        <Store className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                        <span className="text-sm">Showcase your shop/products</span>
                      </div>
                    )}

                    {tier.can_join_rewards_program && (
                      <div className="flex items-start gap-2">
                        <Link className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
                        <span className="text-sm">Access to rewards program</span>
                      </div>
                    )}

                    <Button
                      className={`w-full mt-4 ${
                        tier.tier_key === 'pro' 
                          ? 'bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-600 hover:to-purple-700' 
                          : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'
                      }`}
                      onClick={() => handlePurchase(tier)}
                      disabled={purchasing === tier.id || currentTierKey === tier.tier_key}
                    >
                      {purchasing === tier.id ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : currentTierKey === tier.tier_key ? (
                        'Current Plan'
                      ) : (
                        <>
                          <Crown className="w-4 h-4 mr-2" />
                          Upgrade to {tier.tier_name}
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}

            {/* Why Upgrade Section */}
            <Card className="bg-muted/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Why Upgrade?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-rose-500" />
                  <span><strong>More Visibility</strong> - Your profile appears first in searches</span>
                </div>
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-rose-500" />
                  <span><strong>Unlimited Likes</strong> - Connect with more people</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-rose-500" />
                  <span><strong>AI Coach</strong> - Get conversation suggestions</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}