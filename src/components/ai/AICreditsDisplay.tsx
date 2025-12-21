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
  CheckCircle
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

const AICreditsDisplay = () => {
  const { user, profile } = useAuth();
  const [credits, setCredits] = useState<AICredits | null>(null);
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
      const { data, error } = await supabase
        .from('user_ai_credits')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setCredits(data);
    } catch (error) {
      console.error('Error fetching AI credits:', error);
    } finally {
      setLoading(false);
    }
  };

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

  if (!credits && !isPaidAffiliate) {
    return (
      <Card className="border-border/50 bg-gradient-to-br from-primary/10 to-purple-500/10">
        <CardContent className="p-4 text-center">
          <Crown className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
          <p className="text-sm font-medium">Upgrade to Paid Affiliate</p>
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm">AI Credits</p>
              <p className="text-2xl font-bold">{credits?.total_credits || 0}</p>
            </div>
          </div>
          {isPaidAffiliate && (
            <Badge variant="secondary" className="gap-1 bg-green-500/10 text-green-500 border-green-500/20">
              <CheckCircle className="h-3 w-3" />
              Paid Affiliate
            </Badge>
          )}
        </div>

        {/* Resource Breakdown */}
        <div className="space-y-3">
          {/* Images */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Image className="h-4 w-4 text-blue-500" />
                <span>Images</span>
              </div>
              <span className="text-muted-foreground">
                {credits?.images_used || 0} / {credits?.images_available || 0}
              </span>
            </div>
            <Progress value={100 - imagesUsedPercent} className="h-2" />
          </div>

          {/* Video Minutes */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-purple-500" />
                <span>Video Minutes</span>
              </div>
              <span className="text-muted-foreground">
                {(credits?.video_minutes_used || 0).toFixed(1)} / {(credits?.video_minutes_available || 0).toFixed(1)}
              </span>
            </div>
            <Progress value={100 - videoUsedPercent} className="h-2" />
          </div>

          {/* Audio Minutes */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Music className="h-4 w-4 text-green-500" />
                <span>Audio Minutes</span>
              </div>
              <span className="text-muted-foreground">
                {(credits?.audio_minutes_used || 0).toFixed(1)} / {(credits?.audio_minutes_available || 0).toFixed(1)}
              </span>
            </div>
            <Progress value={100 - audioUsedPercent} className="h-2" />
          </div>
        </div>

        {/* Available Features */}
        {isPaidAffiliate && (
          <div className="pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground mb-2">Premium Features Unlocked:</p>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline" className="text-xs">Text to Image</Badge>
              <Badge variant="outline" className="text-xs">Text to Video</Badge>
              <Badge variant="outline" className="text-xs">AI Music</Badge>
              <Badge variant="outline" className="text-xs">Deep Research</Badge>
              <Badge variant="outline" className="text-xs">GPT-5 Chat</Badge>
              <Badge variant="outline" className="text-xs">Marketplace</Badge>
              <Badge variant="outline" className="text-xs">Content Creator</Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AICreditsDisplay;
