import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  Image, 
  Video, 
  Music, 
  Crown,
  CheckCircle,
  Calendar
} from 'lucide-react';

interface AICredits {
  total_credits: number;
  images_available: number;
  images_used: number;
  video_minutes_available: number;
  video_minutes_used: number;
  audio_minutes_available: number;
  audio_minutes_used: number;
}

interface Subscription {
  plan_type: string;
  credits_remaining: number;
  expires_at: string;
  status: string;
}

const AICreditsDisplay = () => {
  const { user, profile } = useAuth();
  const [credits, setCredits] = useState<AICredits | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const isPaidAffiliate = (profile as any)?.is_paid_affiliate;

  useEffect(() => {
    if (user) {
      fetchCredits();
    }
  }, [user]);

  const fetchCredits = async () => {
    if (!user) return;
    
    try {
      // Fetch legacy credits
      const { data, error } = await supabase
        .from('user_ai_credits')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setCredits(data);

      // Fetch active subscription
      const { data: subData } = await supabase
        .from('ai_subscriptions')
        .select('plan_type, credits_remaining, expires_at, status')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setSubscription(subData);
    } catch (error) {
      console.error('Error fetching AI credits:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysUntilExpiry = () => {
    if (!subscription) return 0;
    const expiresAt = new Date(subscription.expires_at);
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  // Calculate total credits (subscription + legacy)
  const totalCredits = (subscription?.credits_remaining || 0) + (credits?.total_credits || 0);

  if (loading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-8 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!credits && !subscription && !isPaidAffiliate) {
    return (
      <Card className="border-border/50 bg-gradient-to-br from-primary/10 to-purple-500/10">
        <CardContent className="p-4 text-center">
          <Crown className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
          <p className="text-sm font-medium">Subscribe to AI Hub</p>
          <p className="text-xs text-muted-foreground mt-1">
            Get AI credits for images, videos & more
          </p>
        </CardContent>
      </Card>
    );
  }

  const imagesUsedPercent = credits ? 
    Math.min(100, ((credits.images_used || 0) / Math.max(1, credits.images_available)) * 100) : 0;
  const videoUsedPercent = credits ? 
    Math.min(100, ((credits.video_minutes_used || 0) / Math.max(1, credits.video_minutes_available)) * 100) : 0;
  const audioUsedPercent = credits ? 
    Math.min(100, ((credits.audio_minutes_used || 0) / Math.max(1, credits.audio_minutes_available)) * 100) : 0;

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
      <CardContent className="p-4 space-y-4">
        {/* Header - Show subscription credits first */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm">AI Credits</p>
              <p className="text-2xl font-bold">{totalCredits.toLocaleString()}</p>
            </div>
          </div>
          {subscription ? (
            <Badge variant="secondary" className="gap-1 bg-purple-500/10 text-purple-500 border-purple-500/20">
              <Crown className="h-3 w-3" />
              {subscription.plan_type}
            </Badge>
          ) : isPaidAffiliate ? (
            <Badge variant="secondary" className="gap-1 bg-green-500/10 text-green-500 border-green-500/20">
              <CheckCircle className="h-3 w-3" />
              Affiliate
            </Badge>
          ) : null}
        </div>

        {/* Subscription Info */}
        {subscription && (
          <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3 w-3 text-purple-500" />
              <span className="text-purple-600 dark:text-purple-400">
                {subscription.credits_remaining.toLocaleString()} subscription credits
              </span>
            </div>
            <span className="text-muted-foreground">{getDaysUntilExpiry()}d left</span>
          </div>
        )}

        {/* Resource Breakdown (Legacy Credits) */}
        {credits && (credits.images_available > 0 || credits.video_minutes_available > 0 || credits.audio_minutes_available > 0) && (
          <div className="space-y-3">
            {/* Images */}
            {credits.images_available > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Image className="h-4 w-4 text-blue-500" />
                    <span>Images</span>
                  </div>
                  <span className="text-muted-foreground">
                    {credits.images_available - (credits.images_used || 0)} left
                  </span>
                </div>
                <Progress value={100 - imagesUsedPercent} className="h-2" />
              </div>
            )}

            {/* Video Minutes */}
            {credits.video_minutes_available > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-purple-500" />
                    <span>Video</span>
                  </div>
                  <span className="text-muted-foreground">
                    {((credits.video_minutes_available || 0) - (credits.video_minutes_used || 0)).toFixed(1)}m left
                  </span>
                </div>
                <Progress value={100 - videoUsedPercent} className="h-2" />
              </div>
            )}

            {/* Audio Minutes */}
            {credits.audio_minutes_available > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Music className="h-4 w-4 text-green-500" />
                    <span>Audio</span>
                  </div>
                  <span className="text-muted-foreground">
                    {((credits.audio_minutes_available || 0) - (credits.audio_minutes_used || 0)).toFixed(1)}m left
                  </span>
                </div>
                <Progress value={100 - audioUsedPercent} className="h-2" />
              </div>
            )}
          </div>
        )}

        {/* Available Features */}
        {(subscription || isPaidAffiliate) && (
          <div className="pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground mb-2">Features Unlocked:</p>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline" className="text-xs">Image Gen</Badge>
              <Badge variant="outline" className="text-xs">Video Gen</Badge>
              <Badge variant="outline" className="text-xs">AI Music</Badge>
              <Badge variant="outline" className="text-xs">Deep Research</Badge>
              <Badge variant="outline" className="text-xs">Content Creator</Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AICreditsDisplay;
