import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Package, Crown, Rocket, Check, Globe, Palette, Code, Headphones, ShoppingBag, BarChart3, Users, Layers, Zap, Map, Star, ArrowRight, Clock, CheckCircle2, XCircle, Building2 } from "lucide-react";
import WhiteLabelSubscribeDialog from "./WhiteLabelSubscribeDialog";
import WhiteLabelMySubscription from "./WhiteLabelMySubscription";

interface WhiteLabelTier {
  id: string;
  tier_name: string;
  tier_key: string;
  description: string;
  price_php: number;
  billing_cycle: string;
  included_systems: string[];
  max_users: number | null;
  max_products: number | null;
  max_storage_gb: number | null;
  custom_domain: boolean;
  custom_branding: boolean;
  api_access: boolean;
  priority_support: boolean;
  display_order: number;
  is_active: boolean;
}

interface WhiteLabelSubscription {
  id: string;
  tier_id: string;
  status: string;
  starts_at: string | null;
  expires_at: string | null;
  company_name: string;
  custom_domain: string;
  created_at: string;
}

const systemIcons: Record<string, any> = {
  marketplace: ShoppingBag,
  basic_analytics: BarChart3,
  analytics: BarChart3,
  affiliate: Users,
  ads: Layers,
  ai_tools: Zap,
  auction: Crown,
  food_delivery: Map,
};

const systemLabels: Record<string, string> = {
  marketplace: 'Marketplace',
  basic_analytics: 'Basic Analytics',
  analytics: 'Advanced Analytics',
  affiliate: 'Affiliate System',
  ads: 'Advertising Platform',
  ai_tools: 'AI Tools',
  auction: 'Auction System',
  food_delivery: 'Food Delivery',
};

const tierGradients: Record<string, string> = {
  starter: 'from-blue-500 to-cyan-500',
  professional: 'from-purple-500 to-pink-500',
  enterprise: 'from-amber-500 to-orange-500',
};

const tierIcons: Record<string, any> = {
  starter: Rocket,
  professional: Crown,
  enterprise: Building2,
};

export default function UserWhiteLabelHub() {
  const { user, profile } = useAuth();
  const [tiers, setTiers] = useState<WhiteLabelTier[]>([]);
  const [mySubscription, setMySubscription] = useState<WhiteLabelSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState<WhiteLabelTier | null>(null);
  const [showSubscribeDialog, setShowSubscribeDialog] = useState(false);

  useEffect(() => {
    fetchData();
  }, [user?.id]);

  const fetchData = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      // Fetch active tiers
      const { data: tiersData } = await supabase
        .from('whitelabel_tiers')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      // Fetch user's subscription
      const { data: subData } = await supabase
        .from('whitelabel_subscriptions')
        .select('*')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (tiersData) setTiers(tiersData);
      if (subData) setMySubscription(subData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTier = (tier: WhiteLabelTier) => {
    setSelectedTier(tier);
    setShowSubscribeDialog(true);
  };

  const hasActiveSubscription = mySubscription?.status === 'active';
  const hasPendingSubscription = mySubscription?.status === 'pending';

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            White-Label Platform
          </h2>
          <p className="text-xs text-muted-foreground">
            Launch your own branded marketplace platform
          </p>
        </div>
        {mySubscription && (
          <Badge 
            className={`text-xs ${
              mySubscription.status === 'active' 
                ? 'bg-green-500' 
                : mySubscription.status === 'pending'
                ? 'bg-amber-500'
                : 'bg-red-500'
            } text-white`}
          >
            {mySubscription.status === 'active' && <CheckCircle2 className="h-3 w-3 mr-1" />}
            {mySubscription.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
            {mySubscription.status === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
            {mySubscription.status.charAt(0).toUpperCase() + mySubscription.status.slice(1)}
          </Badge>
        )}
      </div>

      {/* Main Content */}
      <Tabs defaultValue={hasActiveSubscription ? "my-platform" : "plans"} className="space-y-4">
        <TabsList className="h-9 p-1 w-full sm:w-auto">
          <TabsTrigger value="plans" className="text-xs px-3 flex-1 sm:flex-none">
            <Rocket className="h-3 w-3 mr-1" />
            Plans
          </TabsTrigger>
          <TabsTrigger value="my-platform" className="text-xs px-3 flex-1 sm:flex-none" disabled={!mySubscription}>
            <Crown className="h-3 w-3 mr-1" />
            My Platform
          </TabsTrigger>
        </TabsList>

        {/* Plans Tab */}
        <TabsContent value="plans" className="space-y-4 mt-0">
          {hasPendingSubscription && (
            <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
              <CardContent className="p-3 flex items-center gap-3">
                <Clock className="h-5 w-5 text-amber-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Application Pending</p>
                  <p className="text-xs text-muted-foreground">
                    Your white-label application is being reviewed. We'll notify you once approved.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pricing Cards Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tiers.map((tier) => {
              const TierIcon = tierIcons[tier.tier_key] || Package;
              const gradient = tierGradients[tier.tier_key] || 'from-gray-500 to-slate-500';
              const isPopular = tier.tier_key === 'professional';
              
              return (
                <Card 
                  key={tier.id} 
                  className={`relative overflow-hidden transition-all hover:shadow-lg ${
                    isPopular ? 'ring-2 ring-primary' : ''
                  }`}
                >
                  {isPopular && (
                    <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] px-2 py-0.5 rounded-bl-lg font-medium">
                      <Star className="h-3 w-3 inline mr-0.5" /> Popular
                    </div>
                  )}
                  
                  {/* Header */}
                  <div className={`bg-gradient-to-r ${gradient} p-3 text-white`}>
                    <div className="flex items-center gap-2">
                      <TierIcon className="h-5 w-5" />
                      <h3 className="font-bold">{tier.tier_name}</h3>
                    </div>
                    <p className="text-white/80 text-xs mt-1 line-clamp-2">{tier.description}</p>
                  </div>

                  <CardContent className="p-3 space-y-3">
                    {/* Price */}
                    <div className="text-center py-2">
                      <div className="text-2xl font-bold">₱{tier.price_php.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">/{tier.billing_cycle}</p>
                    </div>

                    {/* Limits */}
                    <div className="grid grid-cols-3 gap-1 text-center">
                      <div className="p-1.5 bg-muted rounded">
                        <Users className="h-3 w-3 mx-auto text-muted-foreground" />
                        <p className="text-xs font-medium">{tier.max_users || '∞'}</p>
                        <p className="text-[10px] text-muted-foreground">Users</p>
                      </div>
                      <div className="p-1.5 bg-muted rounded">
                        <Package className="h-3 w-3 mx-auto text-muted-foreground" />
                        <p className="text-xs font-medium">{tier.max_products || '∞'}</p>
                        <p className="text-[10px] text-muted-foreground">Products</p>
                      </div>
                      <div className="p-1.5 bg-muted rounded">
                        <Layers className="h-3 w-3 mx-auto text-muted-foreground" />
                        <p className="text-xs font-medium">{tier.max_storage_gb || '∞'}GB</p>
                        <p className="text-[10px] text-muted-foreground">Storage</p>
                      </div>
                    </div>

                    {/* Systems Included */}
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground">Systems Included:</p>
                      <div className="flex flex-wrap gap-1">
                        {tier.included_systems?.map((sys) => {
                          const SysIcon = systemIcons[sys] || Package;
                          return (
                            <Badge key={sys} variant="secondary" className="text-[10px] px-1.5 py-0.5">
                              <SysIcon className="h-2.5 w-2.5 mr-0.5" />
                              {systemLabels[sys] || sys}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>

                    {/* Features */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs">
                        {tier.custom_domain ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <XCircle className="h-3 w-3 text-muted-foreground" />
                        )}
                        <Globe className="h-3 w-3" />
                        <span>Custom Domain</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs">
                        {tier.custom_branding ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <XCircle className="h-3 w-3 text-muted-foreground" />
                        )}
                        <Palette className="h-3 w-3" />
                        <span>Custom Branding</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs">
                        {tier.api_access ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <XCircle className="h-3 w-3 text-muted-foreground" />
                        )}
                        <Code className="h-3 w-3" />
                        <span>API Access</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs">
                        {tier.priority_support ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <XCircle className="h-3 w-3 text-muted-foreground" />
                        )}
                        <Headphones className="h-3 w-3" />
                        <span>Priority Support</span>
                      </div>
                    </div>

                    {/* CTA Button */}
                    <Button 
                      className="w-full" 
                      size="sm"
                      disabled={hasPendingSubscription || hasActiveSubscription}
                      onClick={() => handleSelectTier(tier)}
                    >
                      {hasActiveSubscription ? 'Already Subscribed' : hasPendingSubscription ? 'Pending Approval' : 'Get Started'}
                      {!hasActiveSubscription && !hasPendingSubscription && <ArrowRight className="h-3 w-3 ml-1" />}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Journey Steps */}
          <Card className="p-4 bg-gradient-to-r from-primary/5 to-secondary/5">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Rocket className="h-4 w-4 text-primary" />
              Your White-Label Journey
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {[
                { step: 1, label: 'Choose Plan', icon: Package },
                { step: 2, label: 'Submit Payment', icon: Crown },
                { step: 3, label: 'Get Approved', icon: CheckCircle2 },
                { step: 4, label: 'Setup Systems', icon: Layers },
                { step: 5, label: 'Add Branding', icon: Palette },
                { step: 6, label: 'Connect Domain', icon: Globe },
                { step: 7, label: 'Go Live!', icon: Rocket },
              ].map((item) => (
                <div key={item.step} className="flex flex-col items-center text-center p-2 bg-background rounded-lg">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mb-1">
                    <item.icon className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <p className="text-[10px] text-muted-foreground">Step {item.step}</p>
                  <p className="text-xs font-medium">{item.label}</p>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* My Platform Tab */}
        <TabsContent value="my-platform" className="space-y-4 mt-0">
          {mySubscription && (
            <WhiteLabelMySubscription 
              subscription={mySubscription} 
              tier={tiers.find(t => t.id === mySubscription.tier_id)}
              onRefresh={fetchData}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Subscribe Dialog */}
      {selectedTier && (
        <WhiteLabelSubscribeDialog
          tier={selectedTier}
          open={showSubscribeDialog}
          onOpenChange={setShowSubscribeDialog}
          onSuccess={() => {
            setShowSubscribeDialog(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
