import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { 
  Crown, Globe, Palette, Settings, Users, Package, 
  BarChart3, ShoppingBag, Layers, Zap, Map, Code, 
  Headphones, CheckCircle2, Clock, ExternalLink, 
  Building2, Calendar, RefreshCw
} from "lucide-react";

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

interface Props {
  subscription: WhiteLabelSubscription;
  tier?: WhiteLabelTier;
  onRefresh: () => void;
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

export default function WhiteLabelMySubscription({ subscription, tier, onRefresh }: Props) {
  const isActive = subscription.status === 'active';
  const isPending = subscription.status === 'pending';

  // Mock usage stats (in real app, these would come from the backend)
  const usageStats = {
    users: 45,
    products: 128,
    storage: 2.3,
  };

  const getUsagePercent = (current: number, max: number | null) => {
    if (!max) return 0;
    return Math.min((current / max) * 100, 100);
  };

  if (isPending) {
    return (
      <Card className="border-amber-500/50">
        <CardContent className="p-6 text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
            <Clock className="h-8 w-8 text-amber-500" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Application Under Review</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Your white-label application for <strong>{subscription.company_name}</strong> is being reviewed.
            </p>
          </div>
          <div className="p-3 bg-muted rounded-lg text-left text-xs space-y-1">
            <p><strong>Submitted:</strong> {format(new Date(subscription.created_at), 'PPP')}</p>
            <p><strong>Plan:</strong> {tier?.tier_name || 'Loading...'}</p>
            <p><strong>Domain:</strong> {subscription.custom_domain || 'Not specified'}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            We typically review applications within 24-48 hours. You'll receive an email once approved.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!isActive) {
    return (
      <Card className="border-red-500/50">
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">
            Your subscription is {subscription.status}. Please contact support for assistance.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Platform Overview */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-primary to-purple-600 p-4 text-white">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {subscription.company_name}
              </h3>
              <p className="text-white/80 text-sm mt-0.5">{tier?.tier_name} Plan</p>
            </div>
            <Badge className="bg-white/20 text-white border-0">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Active
            </Badge>
          </div>
        </div>

        <CardContent className="p-4 space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-muted rounded-lg text-center">
              <Globe className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
              <p className="text-xs text-muted-foreground">Domain</p>
              <p className="text-sm font-medium truncate">{subscription.custom_domain || 'Not set'}</p>
            </div>
            <div className="p-3 bg-muted rounded-lg text-center">
              <Calendar className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
              <p className="text-xs text-muted-foreground">Expires</p>
              <p className="text-sm font-medium">
                {subscription.expires_at ? format(new Date(subscription.expires_at), 'MMM d, yyyy') : 'N/A'}
              </p>
            </div>
            <div className="p-3 bg-muted rounded-lg text-center">
              <Users className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
              <p className="text-xs text-muted-foreground">Users</p>
              <p className="text-sm font-medium">{usageStats.users} / {tier?.max_users || '∞'}</p>
            </div>
            <div className="p-3 bg-muted rounded-lg text-center">
              <Package className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
              <p className="text-xs text-muted-foreground">Products</p>
              <p className="text-sm font-medium">{usageStats.products} / {tier?.max_products || '∞'}</p>
            </div>
          </div>

          {/* Usage Progress */}
          {tier && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Resource Usage</h4>
              <div className="space-y-2">
                {tier.max_users && (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Users</span>
                      <span>{usageStats.users} / {tier.max_users}</span>
                    </div>
                    <Progress value={getUsagePercent(usageStats.users, tier.max_users)} className="h-1.5" />
                  </div>
                )}
                {tier.max_products && (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Products</span>
                      <span>{usageStats.products} / {tier.max_products}</span>
                    </div>
                    <Progress value={getUsagePercent(usageStats.products, tier.max_products)} className="h-1.5" />
                  </div>
                )}
                {tier.max_storage_gb && (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Storage</span>
                      <span>{usageStats.storage}GB / {tier.max_storage_gb}GB</span>
                    </div>
                    <Progress value={getUsagePercent(usageStats.storage, tier.max_storage_gb)} className="h-1.5" />
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Management Tabs */}
      <Tabs defaultValue="systems" className="space-y-3">
        <TabsList className="h-9 p-1 w-full grid grid-cols-4">
          <TabsTrigger value="systems" className="text-xs">Systems</TabsTrigger>
          <TabsTrigger value="branding" className="text-xs">Branding</TabsTrigger>
          <TabsTrigger value="domain" className="text-xs">Domain</TabsTrigger>
          <TabsTrigger value="settings" className="text-xs">Settings</TabsTrigger>
        </TabsList>

        {/* Systems Tab */}
        <TabsContent value="systems" className="mt-0">
          <Card>
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                Enabled Systems
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {tier?.included_systems?.map((sys) => {
                  const SysIcon = systemIcons[sys] || Package;
                  return (
                    <div key={sys} className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                      <SysIcon className="h-4 w-4 text-green-600" />
                      <span className="text-xs font-medium">{systemLabels[sys]}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                These systems are active on your white-label platform. Contact support to add more.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branding Tab */}
        <TabsContent value="branding" className="mt-0">
          <Card>
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" />
                Brand Customization
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-3">
              {tier?.custom_branding ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" className="h-9 text-xs">
                      <Palette className="h-3 w-3 mr-1" /> Edit Colors
                    </Button>
                    <Button variant="outline" size="sm" className="h-9 text-xs">
                      <Package className="h-3 w-3 mr-1" /> Upload Logo
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Customize your platform's appearance with your brand colors and logo.
                  </p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Custom branding is not available on your current plan. Upgrade to unlock this feature.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Domain Tab */}
        <TabsContent value="domain" className="mt-0">
          <Card>
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                Domain Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-3">
              {tier?.custom_domain ? (
                <>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Current Domain</p>
                    <p className="font-medium flex items-center gap-2">
                      {subscription.custom_domain || 'Not configured'}
                      {subscription.custom_domain && (
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      )}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="w-full text-xs">
                    <Settings className="h-3 w-3 mr-1" /> Configure Domain
                  </Button>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Custom domains are not available on your current plan. Upgrade to unlock this feature.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-0">
          <Card>
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings className="h-4 w-4 text-primary" />
                Platform Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start text-xs h-9">
                <Users className="h-3 w-3 mr-2" /> Manage Users
              </Button>
              {tier?.api_access && (
                <Button variant="outline" size="sm" className="w-full justify-start text-xs h-9">
                  <Code className="h-3 w-3 mr-2" /> API Keys
                </Button>
              )}
              {tier?.priority_support && (
                <Button variant="outline" size="sm" className="w-full justify-start text-xs h-9">
                  <Headphones className="h-3 w-3 mr-2" /> Priority Support
                </Button>
              )}
              <Button variant="outline" size="sm" className="w-full justify-start text-xs h-9">
                <RefreshCw className="h-3 w-3 mr-2" /> Renew Subscription
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
