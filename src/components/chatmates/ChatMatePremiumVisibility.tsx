import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { 
  Crown, Zap, Star, Rocket, Eye, Target, 
  Clock, CheckCircle, Sparkles
} from "lucide-react";

interface PremiumTier {
  id: string;
  name: string;
  icon: typeof Crown;
  color: string;
  bgColor: string;
  price: number;
  duration: string;
  duration_days: number;
  features: string[];
  boost_weight: number;
  priority_matching: boolean;
}

const TIER_ICONS: Record<string, typeof Crown> = {
  free: Star,
  boost: Zap,
  pro: Crown
};

const TIER_COLORS: Record<string, { color: string; bgColor: string }> = {
  free: { 
    color: "text-gray-500", 
    bgColor: "from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900" 
  },
  boost: { 
    color: "text-yellow-500", 
    bgColor: "from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30" 
  },
  pro: { 
    color: "text-purple-500", 
    bgColor: "from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30" 
  }
};

export function ChatMatePremiumVisibility() {
  const { user } = useAuth();
  const [currentTier, setCurrentTier] = useState<string>("free");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [premiumTiers, setPremiumTiers] = useState<PremiumTier[]>([]);

  useEffect(() => {
    fetchTiers();
    if (user) {
      fetchPremiumStatus();
    }
  }, [user]);

  const fetchTiers = async () => {
    try {
      const { data, error } = await supabase
        .from("beesmate_premium_tiers")
        .select("*")
        .eq("is_active", true)
        .order("display_order");

      if (data) {
        const mappedTiers: PremiumTier[] = data.map(tier => ({
          id: tier.tier_key,
          name: tier.tier_name,
          icon: TIER_ICONS[tier.tier_key] || Star,
          color: TIER_COLORS[tier.tier_key]?.color || "text-gray-500",
          bgColor: TIER_COLORS[tier.tier_key]?.bgColor || "from-gray-100 to-gray-200",
          price: tier.price_php || 0,
          duration: tier.duration_days === 0 ? "Forever" : `${tier.duration_days} days`,
          duration_days: tier.duration_days || 0,
          features: Array.isArray(tier.features) ? tier.features as string[] : [],
          boost_weight: tier.tier_key === "pro" ? 5.0 : tier.tier_key === "boost" ? 2.0 : 1.0,
          priority_matching: tier.tier_key === "pro"
        }));
        setPremiumTiers(mappedTiers);
      }
    } catch (error) {
      console.error("Error fetching tiers:", error);
    }
  };

  const fetchPremiumStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("chatmate_premium_visibility")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data) {
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          setCurrentTier("free");
        } else {
          setCurrentTier(data.tier);
          setExpiresAt(data.expires_at);
        }
      }
    } catch (error) {
      // No premium record exists
    } finally {
      setLoading(false);
    }
  };

  const upgradeTier = async (tierId: string) => {
    if (!user || tierId === "free") return;

    setUpgrading(true);
    try {
      const tier = premiumTiers.find(t => t.id === tierId);
      if (!tier) return;

      const days = tier.duration_days || 7;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + days);

      const { error } = await supabase
        .from("chatmate_premium_visibility")
        .upsert({
          user_id: user.id,
          tier: tierId,
          boost_weight: tier.boost_weight,
          priority_matching: tier.priority_matching,
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: "user_id" });

      if (error) throw error;

      setCurrentTier(tierId);
      setExpiresAt(expiresAt.toISOString());
      
      toast.success(`Upgraded to ${tier.name}!`, {
        description: "Your profile visibility has been boosted!"
      });
    } catch (error) {
      console.error("Error upgrading tier:", error);
      toast.error("Failed to upgrade. Please try again.");
    } finally {
      setUpgrading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const currentTierData = premiumTiers.find(t => t.id === currentTier);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
          <Crown className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold">Premium Visibility</h2>
        <p className="text-muted-foreground">
          Boost your profile to get more matches
        </p>
      </div>

      {/* Current Status */}
      {currentTierData && currentTier !== "free" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className={`bg-gradient-to-r ${currentTierData.bgColor} border-2 border-${currentTierData.color.replace('text-', '')}/30`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl bg-white/80 dark:bg-black/30 ${currentTierData.color}`}>
                    <currentTierData.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      {currentTierData.name}
                      <Badge className="bg-green-500 text-white">Active</Badge>
                    </h3>
                    {expiresAt && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Expires: {new Date(expiresAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-bold ${currentTierData.color}`}>
                    {currentTierData.boost_weight}x
                  </p>
                  <p className="text-xs text-muted-foreground">Visibility Boost</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Tier Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {premiumTiers.map((tier, index) => {
          const Icon = tier.icon;
          const isCurrentTier = currentTier === tier.id;
          const canUpgrade = tier.id !== "free" && !isCurrentTier;

          return (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`relative overflow-hidden h-full ${
                isCurrentTier ? "ring-2 ring-primary" : ""
              } ${tier.id === "pro" ? "border-purple-400 dark:border-purple-600" : ""}`}>
                {tier.id === "pro" && (
                  <div className="absolute top-0 right-0">
                    <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-none rounded-bl-lg">
                      Most Popular
                    </Badge>
                  </div>
                )}
                
                <CardHeader className={`bg-gradient-to-br ${tier.bgColor} pb-4`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-white/80 dark:bg-black/30 ${tier.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{tier.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">{tier.duration}</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    {tier.price === 0 ? (
                      <span className="text-2xl font-bold">Free</span>
                    ) : (
                      <>
                        <span className="text-2xl font-bold">₱{tier.price}</span>
                        <span className="text-muted-foreground"> /period</span>
                      </>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pt-4 flex flex-col h-full">
                  <ul className="space-y-2 flex-1">
                    {tier.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle className={`w-4 h-4 mt-0.5 shrink-0 ${tier.color}`} />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-4 pt-4 border-t">
                    {isCurrentTier ? (
                      <Button disabled className="w-full" variant="outline">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Current Plan
                      </Button>
                    ) : canUpgrade ? (
                      <Button 
                        onClick={() => upgradeTier(tier.id)}
                        disabled={upgrading}
                        className={`w-full ${
                          tier.id === "pro" 
                            ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600" 
                            : "bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                        }`}
                      >
                        {upgrading ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <Rocket className="w-4 h-4 mr-2" />
                            Upgrade Now
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button disabled className="w-full" variant="secondary">
                        Free Forever
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Features Comparison */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="bg-gradient-to-r from-rose-50 to-purple-50 dark:from-rose-950/20 dark:to-purple-950/20 border-rose-200/50 dark:border-rose-800/30">
          <CardContent className="p-4">
            <h4 className="font-semibold flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-primary" />
              Why Upgrade?
            </h4>
            <div className="grid sm:grid-cols-3 gap-4 text-sm">
              <div className="flex items-start gap-2">
                <Eye className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">More Visibility</p>
                  <p className="text-muted-foreground">Your profile appears first in searches</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Target className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Better Matches</p>
                  <p className="text-muted-foreground">AI prioritizes quality connections</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Zap className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Faster Results</p>
                  <p className="text-muted-foreground">Get matches 5x faster with Pro</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}