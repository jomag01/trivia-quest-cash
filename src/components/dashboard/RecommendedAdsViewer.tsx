import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Eye, CheckCircle, Clock, Megaphone, Play, ExternalLink, Loader2 } from "lucide-react";

interface Ad {
  id: string;
  product_id: string | null;
  seller_id: string;
  campaign_name: string;
  total_budget: number;
  impressions: number;
  clicks: number;
  status: string;
  image_url?: string;
  link_url?: string;
  title?: string;
  description?: string;
}

interface ViewStatus {
  required: number;
  completed: number;
  is_complete: boolean;
  remaining: number;
}

export default function RecommendedAdsViewer() {
  const { user } = useAuth();
  const [ads, setAds] = useState<Ad[]>([]);
  const [viewStatus, setViewStatus] = useState<ViewStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewingAdId, setViewingAdId] = useState<string | null>(null);
  const [viewTimer, setViewTimer] = useState(0);
  const [minDuration, setMinDuration] = useState(10);
  const [viewedToday, setViewedToday] = useState<Set<string>>(new Set());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // Fetch view status, ads, min duration, and today's views in parallel
      const [statusRes, adsRes, settingRes, viewedRes] = await Promise.all([
        supabase.rpc('check_daily_ad_views_completed', { p_user_id: user.id }),
        supabase
          .from('sponsored_products')
          .select('id, product_id, seller_id, campaign_name, total_budget, impressions, clicks, status')
          .eq('status', 'active')
          .gt('impressions_remaining', 0)
          .order('quality_score', { ascending: false })
          .limit(20),
        supabase.from('app_settings').select('value').eq('key', 'ad_view_min_duration_seconds').single(),
        supabase
          .from('user_ad_views')
          .select('sponsored_product_id')
          .eq('user_id', user.id)
          .eq('view_date', new Date().toISOString().split('T')[0])
          .eq('is_valid_view', true),
      ]);

      if (statusRes.data) setViewStatus(statusRes.data as unknown as ViewStatus);
      
      // Enrich ads with product/user_ads data
      const rawAds = (adsRes.data || []) as any[];
      const productIds = rawAds.filter(a => a.product_id).map(a => a.product_id);
      const nonProductIds = rawAds.filter(a => !a.product_id).map(a => a.id);

      const [productsRes, userAdsRes] = await Promise.all([
        productIds.length ? supabase.from('products').select('id, name, image_url, description').in('id', productIds) : { data: [] },
        nonProductIds.length ? supabase.from('user_ads').select('id, title, description, image_url, link_url').in('id', nonProductIds) : { data: [] },
      ]);

      const productsMap = new Map((productsRes.data || []).map((p: any) => [p.id, p]));
      const userAdsMap = new Map((userAdsRes.data || []).map((u: any) => [u.id, u]));

      const enriched = rawAds.map(ad => {
        const product = ad.product_id ? productsMap.get(ad.product_id) : null;
        const userAd = !ad.product_id ? userAdsMap.get(ad.id) : null;
        return {
          ...ad,
          title: product?.name || userAd?.title || ad.campaign_name,
          description: product?.description || userAd?.description || '',
          image_url: product?.image_url || userAd?.image_url || '',
          link_url: userAd?.link_url || '',
        };
      }).filter((ad: Ad) => ad.image_url);

      setAds(enriched);
      if (settingRes.data?.value) setMinDuration(parseInt(settingRes.data.value) || 10);
      setViewedToday(new Set((viewedRes.data || []).map((v: any) => v.sponsored_product_id)));
    } catch (error) {
      console.error('Error fetching recommended ads:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Timer for viewing ad
  useEffect(() => {
    if (viewingAdId) {
      timerRef.current = setInterval(() => {
        setViewTimer(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setViewTimer(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [viewingAdId]);

  const handleStartViewing = (adId: string) => {
    if (viewedToday.has(adId)) {
      toast.info("You've already viewed this ad today");
      return;
    }
    setViewingAdId(adId);
    setViewTimer(0);
  };

  const handleCompleteView = async () => {
    if (!user?.id || !viewingAdId || viewTimer < minDuration) return;

    try {
      const { error } = await supabase.from('user_ad_views').insert({
        user_id: user.id,
        ad_id: viewingAdId,
        sponsored_product_id: viewingAdId,
        view_duration_seconds: viewTimer,
        is_valid_view: true,
      });

      if (error) throw error;

      // Record impression for the ad
      const { data: current } = await supabase
        .from('sponsored_products')
        .select('impressions, impressions_remaining, cost_per_impression')
        .eq('id', viewingAdId)
        .single();

      if (current) {
        const newImpressions = (current.impressions || 0) + 1;
        const newRemaining = Math.max((current.impressions_remaining || 0) - 1, 0);
        const newSpent = newImpressions * (current.cost_per_impression || 0);

        await supabase.from('sponsored_products').update({
          impressions: newImpressions,
          impressions_remaining: newRemaining,
          spent_amount: newSpent,
          delivery_status: newRemaining <= 0 ? 'exhausted' : 'delivering',
          status: newRemaining <= 0 ? 'completed' : 'active',
        }).eq('id', viewingAdId);
      }

      setViewedToday(prev => new Set(prev).add(viewingAdId));
      setViewingAdId(null);
      toast.success("Ad view recorded! Your affiliate status is being maintained.");
      fetchData();
    } catch (error: any) {
      toast.error("Failed to record view: " + error.message);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const progressPercent = viewStatus ? (viewStatus.completed / Math.max(viewStatus.required, 1)) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Status Card */}
      <Card className={viewStatus?.is_complete 
        ? "border-emerald-500/40 bg-gradient-to-br from-emerald-500/5 to-green-500/5" 
        : "border-amber-500/40 bg-gradient-to-br from-amber-500/5 to-orange-500/5"
      }>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-lg">
            <span className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Daily Ad Views
            </span>
            {viewStatus?.is_complete ? (
              <Badge className="bg-emerald-500">
                <CheckCircle className="h-3 w-3 mr-1" />
                Complete
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-amber-500/20 text-amber-500 border-amber-500/30">
                <Clock className="h-3 w-3 mr-1" />
                {viewStatus?.remaining || 0} remaining
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{viewStatus?.completed || 0} / {viewStatus?.required || 5}</span>
            </div>
            <Progress value={Math.min(progressPercent, 100)} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {viewStatus?.is_complete 
                ? "✅ You've completed your daily ad views. Your affiliate status remains active!"
                : `View ${viewStatus?.remaining || 0} more ads (${minDuration}s each) to keep your affiliate status active.`
              }
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Viewing Ad Modal */}
      {viewingAdId && (
        <Card className="border-primary/40 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-4">
            {(() => {
              const ad = ads.find(a => a.id === viewingAdId);
              if (!ad) return null;
              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">{ad.title}</h4>
                    <Badge variant="outline">
                      <Clock className="h-3 w-3 mr-1" />
                      {viewTimer}s / {minDuration}s
                    </Badge>
                  </div>
                  {ad.image_url && (
                    <img 
                      src={ad.image_url} 
                      alt={ad.title} 
                      className="w-full max-h-64 object-cover rounded-lg"
                    />
                  )}
                  {ad.description && (
                    <p className="text-sm text-muted-foreground">{ad.description}</p>
                  )}
                  <Progress value={(viewTimer / minDuration) * 100} className="h-2" />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewingAdId(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      disabled={viewTimer < minDuration}
                      onClick={handleCompleteView}
                      className={viewTimer >= minDuration ? "bg-emerald-500 hover:bg-emerald-600" : ""}
                    >
                      {viewTimer < minDuration ? `Wait ${minDuration - viewTimer}s...` : "✓ Complete View"}
                    </Button>
                    {ad.link_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(ad.link_url, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Visit
                      </Button>
                    )}
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Ads Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ads.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Megaphone className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No recommended ads available right now.</p>
              <p className="text-xs text-muted-foreground mt-1">Check back later for new ads to view.</p>
            </CardContent>
          </Card>
        ) : (
          ads.map(ad => {
            const isViewed = viewedToday.has(ad.id);
            const isCurrentlyViewing = viewingAdId === ad.id;
            return (
              <Card 
                key={ad.id} 
                className={`overflow-hidden transition-all ${
                  isViewed ? "opacity-60 border-emerald-500/30" : "hover:border-primary/40"
                } ${isCurrentlyViewing ? "ring-2 ring-primary" : ""}`}
              >
                {ad.image_url && (
                  <div className="relative aspect-video">
                    <img 
                      src={ad.image_url} 
                      alt={ad.title || 'Ad'} 
                      className="w-full h-full object-cover"
                    />
                    {isViewed && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Badge className="bg-emerald-500">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Viewed
                        </Badge>
                      </div>
                    )}
                  </div>
                )}
                <CardContent className="p-3">
                  <h4 className="font-medium text-sm line-clamp-1">{ad.title}</h4>
                  {ad.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{ad.description}</p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Eye className="h-3 w-3" /> {ad.impressions || 0}
                    </div>
                    {!isViewed && !viewingAdId && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => handleStartViewing(ad.id)}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        View Ad
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
