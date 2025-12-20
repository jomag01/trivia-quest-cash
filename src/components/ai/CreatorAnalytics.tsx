import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Youtube, 
  Facebook,
  Globe,
  Loader2, 
  Search, 
  DollarSign,
  TrendingUp,
  Users,
  Eye,
  Video,
  BarChart3,
  Info,
  Lock,
  Crown
} from 'lucide-react';

interface YouTubeStats {
  channelName: string;
  subscribers: number;
  totalViews: number;
  videoCount: number;
  averageViews: number;
  estimatedMonthlyEarnings: { low: number; high: number };
  estimatedYearlyEarnings: { low: number; high: number };
  cpm: { low: number; high: number };
  grade: string;
  category: string;
}

interface FacebookStats {
  pageName: string;
  followers: number;
  estimatedReach: number;
  engagementRate: number;
  estimatedMonthlyEarnings: { low: number; high: number };
  estimatedPerPost: { low: number; high: number };
  grade: string;
}

interface AdSenseStats {
  websiteUrl: string;
  estimatedMonthlyVisitors: number;
  estimatedPageViews: number;
  estimatedCTR: number;
  estimatedCPC: number;
  estimatedMonthlyEarnings: { low: number; high: number };
  estimatedYearlyEarnings: { low: number; high: number };
  niche: string;
  grade: string;
}

interface CreatorAnalyticsProps {
  userCredits: number;
  onCreditsChange: () => void;
}

const ANALYSIS_CREDIT_COST = 5;

const CreatorAnalytics: React.FC<CreatorAnalyticsProps> = ({ userCredits, onCreditsChange }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('youtube');
  
  // YouTube state
  const [youtubeInput, setYoutubeInput] = useState('');
  const [youtubeLoading, setYoutubeLoading] = useState(false);
  const [youtubeStats, setYoutubeStats] = useState<YouTubeStats | null>(null);
  
  // Facebook state
  const [facebookInput, setFacebookInput] = useState('');
  const [facebookFollowers, setFacebookFollowers] = useState('');
  const [facebookLoading, setFacebookLoading] = useState(false);
  const [facebookStats, setFacebookStats] = useState<FacebookStats | null>(null);
  
  // AdSense state
  const [adsenseUrl, setAdsenseUrl] = useState('');
  const [monthlyVisitors, setMonthlyVisitors] = useState('');
  const [websiteNiche, setWebsiteNiche] = useState('general');
  const [adsenseLoading, setAdsenseLoading] = useState(false);
  const [adsenseStats, setAdsenseStats] = useState<AdSenseStats | null>(null);

  const formatNumber = (num: number): string => {
    if (num >= 1000000000) return (num / 1000000000).toFixed(2) + 'B';
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
    return num.toString();
  };

  const formatCurrency = (num: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  const getGradeColor = (grade: string): string => {
    const colors: { [key: string]: string } = {
      'A++': 'bg-green-500',
      'A+': 'bg-green-500',
      'A': 'bg-green-400',
      'A-': 'bg-green-300',
      'B+': 'bg-blue-500',
      'B': 'bg-blue-400',
      'B-': 'bg-blue-300',
      'C+': 'bg-yellow-500',
      'C': 'bg-yellow-400',
      'C-': 'bg-yellow-300',
      'D': 'bg-orange-500',
      'F': 'bg-red-500'
    };
    return colors[grade] || 'bg-gray-500';
  };

  const deductCredits = async (): Promise<boolean> => {
    if (!user) return false;
    if (userCredits < ANALYSIS_CREDIT_COST) {
      toast.error(`Insufficient credits. You need ${ANALYSIS_CREDIT_COST} credits.`);
      return false;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ credits: userCredits - ANALYSIS_CREDIT_COST })
        .eq('id', user.id);

      if (error) throw error;
      onCreditsChange();
      return true;
    } catch (error) {
      console.error('Error deducting credits:', error);
      toast.error('Failed to deduct credits');
      return false;
    }
  };

  const canAnalyze = userCredits >= ANALYSIS_CREDIT_COST;

  const handleYouTubeAnalyze = async () => {
    if (!youtubeInput.trim()) {
      toast.error('Please enter a YouTube channel URL or username');
      return;
    }

    if (!canAnalyze) {
      toast.error(`You need ${ANALYSIS_CREDIT_COST} credits to analyze`);
      return;
    }

    const deducted = await deductCredits();
    if (!deducted) return;

    setYoutubeLoading(true);
    setYoutubeStats(null);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-creator', {
        body: { 
          platform: 'youtube',
          input: youtubeInput.trim()
        }
      });

      if (error) throw error;

      if (data?.stats) {
        setYoutubeStats(data.stats);
        toast.success('YouTube analytics loaded!');
      } else {
        throw new Error(data?.error || 'Failed to analyze channel');
      }
    } catch (error: any) {
      console.error('YouTube analysis error:', error);
      toast.error(error.message || 'Failed to analyze YouTube channel');
    } finally {
      setYoutubeLoading(false);
    }
  };

  const handleFacebookAnalyze = async () => {
    if (!facebookInput.trim() || !facebookFollowers.trim()) {
      toast.error('Please enter page name and follower count');
      return;
    }

    if (!canAnalyze) {
      toast.error(`You need ${ANALYSIS_CREDIT_COST} credits to analyze`);
      return;
    }

    const deducted = await deductCredits();
    if (!deducted) return;

    setFacebookLoading(true);
    setFacebookStats(null);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-creator', {
        body: { 
          platform: 'facebook',
          input: facebookInput.trim(),
          followers: parseInt(facebookFollowers)
        }
      });

      if (error) throw error;

      if (data?.stats) {
        setFacebookStats(data.stats);
        toast.success('Facebook analytics loaded!');
      } else {
        throw new Error(data?.error || 'Failed to analyze page');
      }
    } catch (error: any) {
      console.error('Facebook analysis error:', error);
      toast.error(error.message || 'Failed to analyze Facebook page');
    } finally {
      setFacebookLoading(false);
    }
  };

  const handleAdSenseAnalyze = async () => {
    if (!adsenseUrl.trim() || !monthlyVisitors.trim()) {
      toast.error('Please enter website URL and monthly visitors');
      return;
    }

    if (!canAnalyze) {
      toast.error(`You need ${ANALYSIS_CREDIT_COST} credits to analyze`);
      return;
    }

    const deducted = await deductCredits();
    if (!deducted) return;

    setAdsenseLoading(true);
    setAdsenseStats(null);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-creator', {
        body: { 
          platform: 'adsense',
          url: adsenseUrl.trim(),
          monthlyVisitors: parseInt(monthlyVisitors),
          niche: websiteNiche
        }
      });

      if (error) throw error;

      if (data?.stats) {
        setAdsenseStats(data.stats);
        toast.success('AdSense analytics loaded!');
      } else {
        throw new Error(data?.error || 'Failed to analyze website');
      }
    } catch (error: any) {
      console.error('AdSense analysis error:', error);
      toast.error(error.message || 'Failed to analyze website');
    } finally {
      setAdsenseLoading(false);
    }
  };

  if (!canAnalyze) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-primary" />
            Creator Analytics (Social Blade Style)
            <Badge variant="secondary" className="ml-2 gap-1">
              <Crown className="h-3 w-3" />
              Premium
            </Badge>
          </CardTitle>
          <CardDescription>
            Estimate how much creators earn on YouTube, Facebook, and websites with AdSense
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-4">
            <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">You need at least {ANALYSIS_CREDIT_COST} credits to use this feature</p>
            <p className="text-sm text-muted-foreground">Current balance: {userCredits} credits</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-primary" />
            Creator Analytics (Social Blade Style)
            <Badge variant="secondary" className="ml-2 gap-1">
              <Crown className="h-3 w-3" />
              Premium
            </Badge>
          </CardTitle>
          <CardDescription>
            Estimate how much creators earn on YouTube, Facebook, and websites with AdSense
          </CardDescription>
          <Badge variant="outline" className="w-fit mt-2">{ANALYSIS_CREDIT_COST} credits/analysis</Badge>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="youtube" className="flex items-center gap-1">
                <Youtube className="h-4 w-4" />
                YouTube
              </TabsTrigger>
              <TabsTrigger value="facebook" className="flex items-center gap-1">
                <Facebook className="h-4 w-4" />
                Facebook
              </TabsTrigger>
              <TabsTrigger value="adsense" className="flex items-center gap-1">
                <Globe className="h-4 w-4" />
                AdSense
              </TabsTrigger>
            </TabsList>

            {/* YouTube Tab */}
            <TabsContent value="youtube" className="mt-4 space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="YouTube channel URL or @username"
                  value={youtubeInput}
                  onChange={(e) => setYoutubeInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleYouTubeAnalyze()}
                />
                <Button onClick={handleYouTubeAnalyze} disabled={youtubeLoading}>
                  {youtubeLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {youtubeStats && (
                <Card className="bg-muted/30">
                  <CardContent className="pt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-lg">{youtubeStats.channelName}</h3>
                        <Badge variant="secondary">{youtubeStats.category}</Badge>
                      </div>
                      <Badge className={`${getGradeColor(youtubeStats.grade)} text-white text-lg px-3 py-1`}>
                        {youtubeStats.grade}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-background rounded-lg p-3 text-center">
                        <Users className="h-5 w-5 mx-auto mb-1 text-red-500" />
                        <p className="text-xs text-muted-foreground">Subscribers</p>
                        <p className="font-bold">{formatNumber(youtubeStats.subscribers)}</p>
                      </div>
                      <div className="bg-background rounded-lg p-3 text-center">
                        <Eye className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                        <p className="text-xs text-muted-foreground">Total Views</p>
                        <p className="font-bold">{formatNumber(youtubeStats.totalViews)}</p>
                      </div>
                      <div className="bg-background rounded-lg p-3 text-center">
                        <Video className="h-5 w-5 mx-auto mb-1 text-purple-500" />
                        <p className="text-xs text-muted-foreground">Videos</p>
                        <p className="font-bold">{formatNumber(youtubeStats.videoCount)}</p>
                      </div>
                      <div className="bg-background rounded-lg p-3 text-center">
                        <TrendingUp className="h-5 w-5 mx-auto mb-1 text-green-500" />
                        <p className="text-xs text-muted-foreground">Avg Views</p>
                        <p className="font-bold">{formatNumber(youtubeStats.averageViews)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign className="h-5 w-5 text-green-500" />
                          <span className="font-medium">Est. Monthly Earnings</span>
                        </div>
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(youtubeStats.estimatedMonthlyEarnings.low)} - {formatCurrency(youtubeStats.estimatedMonthlyEarnings.high)}
                        </p>
                      </div>
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign className="h-5 w-5 text-blue-500" />
                          <span className="font-medium">Est. Yearly Earnings</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-600">
                          {formatCurrency(youtubeStats.estimatedYearlyEarnings.low)} - {formatCurrency(youtubeStats.estimatedYearlyEarnings.high)}
                        </p>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Estimated CPM: ${youtubeStats.cpm.low} - ${youtubeStats.cpm.high}. These are estimates based on public data and industry averages.
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Facebook Tab */}
            <TabsContent value="facebook" className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Input
                  placeholder="Facebook page name"
                  value={facebookInput}
                  onChange={(e) => setFacebookInput(e.target.value)}
                />
                <div className="flex gap-2">
                  <Input
                    placeholder="Follower count"
                    type="number"
                    value={facebookFollowers}
                    onChange={(e) => setFacebookFollowers(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleFacebookAnalyze()}
                  />
                  <Button onClick={handleFacebookAnalyze} disabled={facebookLoading}>
                    {facebookLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {facebookStats && (
                <Card className="bg-muted/30">
                  <CardContent className="pt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-lg">{facebookStats.pageName}</h3>
                      <Badge className={`${getGradeColor(facebookStats.grade)} text-white text-lg px-3 py-1`}>
                        {facebookStats.grade}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-background rounded-lg p-3 text-center">
                        <Users className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                        <p className="text-xs text-muted-foreground">Followers</p>
                        <p className="font-bold">{formatNumber(facebookStats.followers)}</p>
                      </div>
                      <div className="bg-background rounded-lg p-3 text-center">
                        <Eye className="h-5 w-5 mx-auto mb-1 text-purple-500" />
                        <p className="text-xs text-muted-foreground">Est. Reach</p>
                        <p className="font-bold">{formatNumber(facebookStats.estimatedReach)}</p>
                      </div>
                      <div className="bg-background rounded-lg p-3 text-center">
                        <TrendingUp className="h-5 w-5 mx-auto mb-1 text-green-500" />
                        <p className="text-xs text-muted-foreground">Engagement</p>
                        <p className="font-bold">{facebookStats.engagementRate}%</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign className="h-5 w-5 text-green-500" />
                          <span className="font-medium">Est. Monthly (Ads/Sponsorships)</span>
                        </div>
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(facebookStats.estimatedMonthlyEarnings.low)} - {formatCurrency(facebookStats.estimatedMonthlyEarnings.high)}
                        </p>
                      </div>
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign className="h-5 w-5 text-blue-500" />
                          <span className="font-medium">Est. Per Sponsored Post</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-600">
                          {formatCurrency(facebookStats.estimatedPerPost.low)} - {formatCurrency(facebookStats.estimatedPerPost.high)}
                        </p>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Estimates based on follower count, typical engagement rates, and industry sponsorship standards.
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* AdSense Tab */}
            <TabsContent value="adsense" className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <Input
                  placeholder="Website URL"
                  value={adsenseUrl}
                  onChange={(e) => setAdsenseUrl(e.target.value)}
                />
                <Input
                  placeholder="Monthly visitors"
                  type="number"
                  value={monthlyVisitors}
                  onChange={(e) => setMonthlyVisitors(e.target.value)}
                />
                <div className="flex gap-2">
                  <Select value={websiteNiche} onValueChange={setWebsiteNiche}>
                    <SelectTrigger>
                      <SelectValue placeholder="Niche" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="tech">Technology</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="health">Health</SelectItem>
                      <SelectItem value="travel">Travel</SelectItem>
                      <SelectItem value="food">Food</SelectItem>
                      <SelectItem value="lifestyle">Lifestyle</SelectItem>
                      <SelectItem value="gaming">Gaming</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                      <SelectItem value="news">News</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAdSenseAnalyze} disabled={adsenseLoading}>
                    {adsenseLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {adsenseStats && (
                <Card className="bg-muted/30">
                  <CardContent className="pt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-lg">{adsenseStats.websiteUrl}</h3>
                        <Badge variant="secondary">{adsenseStats.niche}</Badge>
                      </div>
                      <Badge className={`${getGradeColor(adsenseStats.grade)} text-white text-lg px-3 py-1`}>
                        {adsenseStats.grade}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-background rounded-lg p-3 text-center">
                        <Users className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                        <p className="text-xs text-muted-foreground">Monthly Visitors</p>
                        <p className="font-bold">{formatNumber(adsenseStats.estimatedMonthlyVisitors)}</p>
                      </div>
                      <div className="bg-background rounded-lg p-3 text-center">
                        <Eye className="h-5 w-5 mx-auto mb-1 text-purple-500" />
                        <p className="text-xs text-muted-foreground">Page Views</p>
                        <p className="font-bold">{formatNumber(adsenseStats.estimatedPageViews)}</p>
                      </div>
                      <div className="bg-background rounded-lg p-3 text-center">
                        <TrendingUp className="h-5 w-5 mx-auto mb-1 text-green-500" />
                        <p className="text-xs text-muted-foreground">Est. CTR</p>
                        <p className="font-bold">{adsenseStats.estimatedCTR}%</p>
                      </div>
                      <div className="bg-background rounded-lg p-3 text-center">
                        <DollarSign className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
                        <p className="text-xs text-muted-foreground">Est. CPC</p>
                        <p className="font-bold">${adsenseStats.estimatedCPC.toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign className="h-5 w-5 text-green-500" />
                          <span className="font-medium">Est. Monthly AdSense</span>
                        </div>
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(adsenseStats.estimatedMonthlyEarnings.low)} - {formatCurrency(adsenseStats.estimatedMonthlyEarnings.high)}
                        </p>
                      </div>
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign className="h-5 w-5 text-blue-500" />
                          <span className="font-medium">Est. Yearly AdSense</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-600">
                          {formatCurrency(adsenseStats.estimatedYearlyEarnings.low)} - {formatCurrency(adsenseStats.estimatedYearlyEarnings.high)}
                        </p>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Estimates based on traffic, niche CPC/CTR averages. Actual earnings vary by ad placement, audience location, and content quality.
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreatorAnalytics;