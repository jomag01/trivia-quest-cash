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
      <CardContent className="p-2 space-y-2">
        {/* Compact Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="p-1.5 rounded-md bg-gradient-to-br from-yellow-400 to-orange-500">
              <Sparkles className="h-3 w-3 text-white" />
            </div>
            <div>
              <p className="font-semibold text-xs">AI Credits</p>
              <p className="text-lg font-bold leading-tight">{totalCredits.toLocaleString()}</p>
            </div>
          </div>
          {subscription ? (
            <Badge variant="secondary" className="gap-0.5 bg-purple-500/10 text-purple-500 border-purple-500/20 text-[10px] px-1.5 py-0.5">
              <Crown className="h-2.5 w-2.5" />
              {subscription.plan_type}
            </Badge>
          ) : isPaidAffiliate ? (
            <Badge variant="secondary" className="gap-0.5 bg-green-500/10 text-green-500 border-green-500/20 text-[10px] px-1.5 py-0.5">
              <CheckCircle className="h-2.5 w-2.5" />
              Affiliate
            </Badge>
          ) : null}
        </div>

        {/* Subscription Info - Compact */}
        {subscription && (
          <div className="flex items-center justify-between text-[10px] px-1.5 py-1 rounded bg-purple-500/10 border border-purple-500/20">
            <div className="flex items-center gap-1">
              <Calendar className="h-2.5 w-2.5 text-purple-500" />
              <span className="text-purple-600 dark:text-purple-400">
                {subscription.credits_remaining.toLocaleString()} sub credits
              </span>
            </div>
            <span className="text-muted-foreground">{getDaysUntilExpiry()}d</span>
          </div>
        )}

        {/* Compact Resource Stats - Inline */}
        {credits && (credits.images_available > 0 || credits.video_minutes_available > 0 || credits.audio_minutes_available > 0) && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px]">
            {credits.images_available > 0 && (
              <div className="flex items-center gap-1">
                <Image className="h-3 w-3 text-blue-500" />
                <span className="text-muted-foreground">{credits.images_available - (credits.images_used || 0)} img</span>
              </div>
            )}
            {credits.video_minutes_available > 0 && (
              <div className="flex items-center gap-1">
                <Video className="h-3 w-3 text-purple-500" />
                <span className="text-muted-foreground">{((credits.video_minutes_available || 0) - (credits.video_minutes_used || 0)).toFixed(0)}m vid</span>
              </div>
            )}
            {credits.audio_minutes_available > 0 && (
              <div className="flex items-center gap-1">
                <Music className="h-3 w-3 text-green-500" />
                <span className="text-muted-foreground">{((credits.audio_minutes_available || 0) - (credits.audio_minutes_used || 0)).toFixed(0)}m aud</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AICreditsDisplay;
