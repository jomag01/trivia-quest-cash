import { useMarketplaceEligibility } from '@/hooks/useMarketplaceEligibility';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Gem, Users, ShoppingCart, Lock, CheckCircle, XCircle } from 'lucide-react';

interface MarketplaceEligibilityGateProps {
  userId: string | undefined;
  children: React.ReactNode;
  featureLabel?: string;
  showDetails?: boolean;
}

export function MarketplaceEligibilityGate({
  userId,
  children,
  featureLabel = "this feature",
  showDetails = true,
}: MarketplaceEligibilityGateProps) {
  const eligibility = useMarketplaceEligibility(userId);

  if (eligibility.loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (eligibility.isEligible) {
    return <>{children}</>;
  }

  return (
    <Card className="border-amber-500/50 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/30">
            <Lock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <h3 className="font-semibold text-lg text-amber-800 dark:text-amber-200">
                Feature Locked
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                You need to meet the requirements to access {featureLabel}.
              </p>
            </div>

            {showDetails && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-amber-800 dark:text-amber-200">Requirements:</h4>
                
                <div className="space-y-2">
                  {/* Referrals Requirement */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-white/50 dark:bg-black/20">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">2+ Referrals</p>
                      <p className="text-xs text-muted-foreground">
                        You have {eligibility.referralCount} referral(s)
                      </p>
                    </div>
                    {eligibility.referralCount >= 2 ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-destructive" />
                    )}
                  </div>

                  {/* Diamonds or Purchase Requirement */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-white/50 dark:bg-black/20">
                    <Gem className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {eligibility.diamondThreshold}+ Diamonds OR AI Credit Purchase
                      </p>
                      <p className="text-xs text-muted-foreground">
                        You have {eligibility.diamonds} diamonds
                        {eligibility.hasPurchase && " • Has approved purchase ✓"}
                      </p>
                    </div>
                    {eligibility.diamonds >= eligibility.diamondThreshold || eligibility.hasPurchase ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-destructive" />
                    )}
                  </div>
                </div>

                <Alert className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                  <ShoppingCart className="h-4 w-4 text-blue-600" />
                  <AlertTitle className="text-blue-800 dark:text-blue-200 text-sm">
                    How to unlock?
                  </AlertTitle>
                  <AlertDescription className="text-blue-700 dark:text-blue-300 text-xs">
                    Refer 2 or more users AND either purchase AI credits or have {eligibility.diamondThreshold}+ diamonds from purchases.
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function useMarketplaceEligibilityCheck(userId: string | undefined) {
  return useMarketplaceEligibility(userId);
}
