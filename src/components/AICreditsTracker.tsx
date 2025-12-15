import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  ImageIcon, 
  VideoIcon, 
  Music, 
  Sparkles, 
  RefreshCw, 
  Loader2, 
  TrendingUp,
  Clock,
  ShoppingCart,
  Wallet
} from 'lucide-react';
import ReplenishCreditsDialog from './ReplenishCreditsDialog';

interface AICredits {
  images_available: number;
  video_minutes_available: number;
  audio_minutes_available: number;
  total_credits: number;
  images_used: number;
  video_minutes_used: number;
  audio_minutes_used: number;
}

interface PendingPurchase {
  id: string;
  amount: number;
  credits_received: number;
  images_allocated: number;
  video_minutes_allocated: number;
  audio_minutes_allocated: number;
  status: string;
  created_at: string;
}

export default function AICreditsTracker() {
  const { user } = useAuth();
  const [credits, setCredits] = useState<AICredits | null>(null);
  const [pendingPurchases, setPendingPurchases] = useState<PendingPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReplenish, setShowReplenish] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (user) {
      fetchCredits();
      fetchPendingPurchases();
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

      if (error && error.code !== 'PGRST116') throw error;

      if (!data) {
        // Create initial record
        const { data: newData, error: insertError } = await supabase
          .from('user_ai_credits')
          .insert({ user_id: user.id })
          .select()
          .single();
        
        if (insertError) throw insertError;
        setCredits(newData);
      } else {
        setCredits(data);
      }
    } catch (error) {
      console.error('Error fetching AI credits:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingPurchases = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('binary_ai_purchases')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingPurchases(data || []);
    } catch (error) {
      console.error('Error fetching pending purchases:', error);
    }
  };

  const getUsagePercentage = (used: number, available: number): number => {
    if (available === 0) return 0;
    return Math.min((used / available) * 100, 100);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Credits
              </CardTitle>
              <CardDescription>Track your AI generation allocations</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowReplenish(true)}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Replenish
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-2 w-full mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="pending">
                Pending
                {pendingPurchases.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 justify-center">
                    {pendingPurchases.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {/* Total Credits */}
              <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Total AI Credits</span>
                  <Badge variant="default">{credits?.total_credits || 0}</Badge>
                </div>
              </div>

              {/* Images */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-blue-500" />
                    <span>Images Available</span>
                  </div>
                  <span className="font-medium">
                    {credits?.images_available || 0} remaining
                  </span>
                </div>
                <Progress 
                  value={100 - getUsagePercentage(credits?.images_used || 0, (credits?.images_available || 0) + (credits?.images_used || 0))} 
                  className="h-2" 
                />
                <p className="text-xs text-muted-foreground">
                  Used: {credits?.images_used || 0} images
                </p>
              </div>

              {/* Video Minutes */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <VideoIcon className="h-4 w-4 text-purple-500" />
                    <span>Video Minutes</span>
                  </div>
                  <span className="font-medium">
                    {Number(credits?.video_minutes_available || 0).toFixed(1)} min
                  </span>
                </div>
                <Progress 
                  value={100 - getUsagePercentage(Number(credits?.video_minutes_used || 0), Number(credits?.video_minutes_available || 0) + Number(credits?.video_minutes_used || 0))} 
                  className="h-2" 
                />
                <p className="text-xs text-muted-foreground">
                  Used: {Number(credits?.video_minutes_used || 0).toFixed(1)} minutes
                </p>
              </div>

              {/* Audio Minutes */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Music className="h-4 w-4 text-green-500" />
                    <span>Audio Minutes</span>
                  </div>
                  <span className="font-medium">
                    {Number(credits?.audio_minutes_available || 0).toFixed(1)} min
                  </span>
                </div>
                <Progress 
                  value={100 - getUsagePercentage(Number(credits?.audio_minutes_used || 0), Number(credits?.audio_minutes_available || 0) + Number(credits?.audio_minutes_used || 0))} 
                  className="h-2" 
                />
                <p className="text-xs text-muted-foreground">
                  Used: {Number(credits?.audio_minutes_used || 0).toFixed(1)} minutes
                </p>
              </div>
            </TabsContent>

            <TabsContent value="pending" className="space-y-3">
              {pendingPurchases.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No pending purchases</p>
                </div>
              ) : (
                pendingPurchases.map((purchase) => (
                  <div key={purchase.id} className="p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">₱{purchase.amount}</span>
                      <Badge variant="outline" className="text-amber-500 border-amber-500">
                        Pending Approval
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>Credits: {purchase.credits_received}</p>
                      <p>Images: {purchase.images_allocated} • Video: {Number(purchase.video_minutes_allocated).toFixed(1)}min • Audio: {Number(purchase.audio_minutes_allocated).toFixed(1)}min</p>
                      <p>Submitted: {new Date(purchase.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <ReplenishCreditsDialog
        open={showReplenish}
        onOpenChange={setShowReplenish}
        onReplenishComplete={() => {
          fetchCredits();
          fetchPendingPurchases();
        }}
      />
    </>
  );
}
