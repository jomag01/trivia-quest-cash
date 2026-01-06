import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, VideoIcon, ImageIcon, Save, DollarSign, Users, Crown, Loader2, Plus, Trash2, Bell, Settings, Music, Globe, BarChart3, Share2, TrendingUp, FileText, Eye, Gift, Mail } from 'lucide-react';
import AICostCalculator from './AICostCalculator';
import AIProviderStatus from './AIProviderStatus';
interface CreditTier {
  id: string;
  name: string;
  price: string;
  credits: string;
  images: string;
  videos: string;
  cost: string;
  maxVideoSeconds: string;
  maxAudioSeconds: string;
}

const generateTierId = () => `tier_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const AISettingsManagement = () => {
  const [freeImageLimit, setFreeImageLimit] = useState('3');
  const [videoCreditCost, setVideoCreditCost] = useState('10');
  const [creditToDiamondRate, setCreditToDiamondRate] = useState('10');
  const [creditsPerVideoMinute, setCreditsPerVideoMinute] = useState('20');
  const [creditsPerAudioMinute, setCreditsPerAudioMinute] = useState('5');
  const [creditsPerImage, setCreditsPerImage] = useState('1');
  const [scraperCreditCost, setScraperCreditCost] = useState('5');
  const [scraperAnalysisCost, setScraperAnalysisCost] = useState('10');
  const [analyticsCreditCost, setAnalyticsCreditCost] = useState('5');
  const [socialMediaCreditCost, setSocialMediaCreditCost] = useState('10');
  const [smmCommissionPercent, setSmmCommissionPercent] = useState('15');
  const [smmAdsCommissionPercent, setSmmAdsCommissionPercent] = useState('10');
  const [blogContentCreditCost, setBlogContentCreditCost] = useState('15');
  const [marketAnalysisCreditCost, setMarketAnalysisCreditCost] = useState('20');
  const [productDescriptionCreditCost, setProductDescriptionCreditCost] = useState('5');
  const [virtualTryonBuyerCredits, setVirtualTryonBuyerCredits] = useState('5');
  const [virtualTryonSellerCredits, setVirtualTryonSellerCredits] = useState('20');
  
  // Guest AI Trial Popup Settings
  const [guestPopupEnabled, setGuestPopupEnabled] = useState(true);
  const [guestPopupDelaySeconds, setGuestPopupDelaySeconds] = useState('30');
  const [guestPopupScrollPercent, setGuestPopupScrollPercent] = useState('50');
  const [guestPopupTitle, setGuestPopupTitle] = useState('Try Our AI Services Free!');
  const [guestPopupDescription, setGuestPopupDescription] = useState('Experience the power of AI image & video generation');
  const [guestPopupCtaText, setGuestPopupCtaText] = useState('Get Download Access');
  const [guestPopupShowOnScroll, setGuestPopupShowOnScroll] = useState(true);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [costMarkupPercent, setCostMarkupPercent] = useState('100');

  const [tiers, setTiers] = useState<CreditTier[]>([
    { id: generateTierId(), name: 'Starter', price: '100', credits: '50', images: '30', videos: '10', cost: '30', maxVideoSeconds: '10', maxAudioSeconds: '60' },
    { id: generateTierId(), name: 'Popular', price: '250', credits: '150', images: '100', videos: '30', cost: '75', maxVideoSeconds: '60', maxAudioSeconds: '300' },
    { id: generateTierId(), name: 'Pro', price: '500', credits: '400', images: '300', videos: '80', cost: '150', maxVideoSeconds: '900', maxAudioSeconds: '1800' }
  ]);

  const [adminEarningsPercent, setAdminEarningsPercent] = useState('35');
  const [unilevelPercent, setUnilevelPercent] = useState('40');
  const [stairstepPercent, setStairstepPercent] = useState('35');
  const [leadershipPercent, setLeadershipPercent] = useState('25');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .like('key', 'ai_%');

      if (error) throw error;

      // Check for tier count setting
      const tierCountSetting = data?.find(s => s.key === 'ai_tier_count');
      const tierCount = tierCountSetting ? parseInt(tierCountSetting.value || '3') : 3;

      // Initialize tiers array based on count
      const loadedTiers: CreditTier[] = [];
      for (let i = 0; i < tierCount; i++) {
        loadedTiers.push({
          id: generateTierId(),
          name: `Tier ${i + 1}`,
          price: '0',
          credits: '0',
          images: '0',
          videos: '0',
          cost: '0',
          maxVideoSeconds: '0',
          maxAudioSeconds: '0'
        });
      }

      data?.forEach(setting => {
        if (setting.key === 'ai_free_image_limit') {
          setFreeImageLimit(setting.value || '3');
        } else if (setting.key === 'ai_video_credit_cost') {
          setVideoCreditCost(setting.value || '10');
        } else if (setting.key === 'ai_credit_to_diamond_rate') {
          setCreditToDiamondRate(setting.value || '10');
        } else if (setting.key === 'ai_credits_per_video_minute') {
          setCreditsPerVideoMinute(setting.value || '20');
        } else if (setting.key === 'ai_credits_per_audio_minute') {
          setCreditsPerAudioMinute(setting.value || '5');
        } else if (setting.key === 'ai_credits_per_image') {
          setCreditsPerImage(setting.value || '1');
        } else if (setting.key === 'ai_admin_earnings_percent') {
          setAdminEarningsPercent(setting.value || '35');
        } else if (setting.key === 'ai_unilevel_percent') {
          setUnilevelPercent(setting.value || '40');
        } else if (setting.key === 'ai_stairstep_percent') {
          setStairstepPercent(setting.value || '35');
        } else if (setting.key === 'ai_leadership_percent') {
          setLeadershipPercent(setting.value || '25');
        } else if (setting.key === 'ai_cost_markup_percent') {
          setCostMarkupPercent(setting.value || '100');
        } else if (setting.key === 'ai_scraper_credit_cost') {
          setScraperCreditCost(setting.value || '5');
        } else if (setting.key === 'ai_scraper_analysis_cost') {
          setScraperAnalysisCost(setting.value || '10');
        } else if (setting.key === 'ai_analytics_credit_cost') {
          setAnalyticsCreditCost(setting.value || '5');
        } else if (setting.key === 'ai_social_media_credit_cost') {
          setSocialMediaCreditCost(setting.value || '10');
        } else if (setting.key === 'ai_smm_commission_percent') {
          setSmmCommissionPercent(setting.value || '15');
        } else if (setting.key === 'ai_smm_ads_commission_percent') {
          setSmmAdsCommissionPercent(setting.value || '10');
        } else if (setting.key === 'ai_blog_content_credit_cost') {
          setBlogContentCreditCost(setting.value || '15');
        } else if (setting.key === 'ai_market_analysis_credit_cost') {
          setMarketAnalysisCreditCost(setting.value || '20');
        } else if (setting.key === 'ai_product_description_cost') {
          setProductDescriptionCreditCost(setting.value || '5');
        } else if (setting.key === 'virtual_tryon_buyer_credits') {
          setVirtualTryonBuyerCredits(setting.value || '5');
        } else if (setting.key === 'virtual_tryon_seller_setup_credits') {
          setVirtualTryonSellerCredits(setting.value || '20');
        } else if (setting.key === 'ai_guest_popup_enabled') {
          setGuestPopupEnabled(setting.value === 'true');
        } else if (setting.key === 'ai_guest_popup_delay_seconds') {
          setGuestPopupDelaySeconds(setting.value || '30');
        } else if (setting.key === 'ai_guest_popup_scroll_percent') {
          setGuestPopupScrollPercent(setting.value || '50');
        } else if (setting.key === 'ai_guest_popup_title') {
          setGuestPopupTitle(setting.value || 'Try Our AI Services Free!');
        } else if (setting.key === 'ai_guest_popup_description') {
          setGuestPopupDescription(setting.value || 'Experience the power of AI image & video generation');
        } else if (setting.key === 'ai_guest_popup_cta_text') {
          setGuestPopupCtaText(setting.value || 'Get Download Access');
        } else if (setting.key === 'ai_guest_popup_show_on_scroll') {
          setGuestPopupShowOnScroll(setting.value === 'true');
        }

        // Parse tier settings
        const match = setting.key.match(/ai_credit_tier_(\d+)_(\w+)/);
        if (match) {
          const tierIndex = parseInt(match[1]) - 1;
          const field = match[2];
          if (tierIndex >= 0 && tierIndex < loadedTiers.length) {
            if (field === 'name') loadedTiers[tierIndex].name = setting.value || `Tier ${tierIndex + 1}`;
            if (field === 'price') loadedTiers[tierIndex].price = setting.value || '0';
            if (field === 'credits') loadedTiers[tierIndex].credits = setting.value || '0';
            if (field === 'image') loadedTiers[tierIndex].images = setting.value || '0';
            if (field === 'video') loadedTiers[tierIndex].videos = setting.value || '0';
            if (field === 'cost') loadedTiers[tierIndex].cost = setting.value || '0';
            if (field === 'videoseconds') loadedTiers[tierIndex].maxVideoSeconds = setting.value || '0';
            if (field === 'audioseconds') loadedTiers[tierIndex].maxAudioSeconds = setting.value || '0';
            // Legacy support for old animationminutes field - convert to seconds
            if (field === 'animationminutes') {
              const minutes = parseFloat(setting.value || '0');
              loadedTiers[tierIndex].maxVideoSeconds = Math.round(minutes * 60).toString();
            }
          }
        }
      });

      if (loadedTiers.length > 0 && loadedTiers.some(t => parseFloat(t.price) > 0)) {
        setTiers(loadedTiers);
      }
    } catch (error) {
      console.error('Error fetching AI settings:', error);
      toast.error('Failed to load AI settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: { key: string; value: string }[] = [
        { key: 'ai_free_image_limit', value: freeImageLimit },
        { key: 'ai_video_credit_cost', value: videoCreditCost },
        { key: 'ai_credit_to_diamond_rate', value: creditToDiamondRate },
        { key: 'ai_credits_per_video_minute', value: creditsPerVideoMinute },
        { key: 'ai_credits_per_audio_minute', value: creditsPerAudioMinute },
        { key: 'ai_credits_per_image', value: creditsPerImage },
        { key: 'ai_cost_markup_percent', value: costMarkupPercent },
        { key: 'ai_admin_earnings_percent', value: adminEarningsPercent },
        { key: 'ai_unilevel_percent', value: unilevelPercent },
        { key: 'ai_stairstep_percent', value: stairstepPercent },
        { key: 'ai_leadership_percent', value: leadershipPercent },
        { key: 'ai_tier_count', value: tiers.length.toString() },
        { key: 'ai_scraper_credit_cost', value: scraperCreditCost },
        { key: 'ai_scraper_analysis_cost', value: scraperAnalysisCost },
        { key: 'ai_analytics_credit_cost', value: analyticsCreditCost },
        { key: 'ai_social_media_credit_cost', value: socialMediaCreditCost },
        { key: 'ai_smm_commission_percent', value: smmCommissionPercent },
        { key: 'ai_smm_ads_commission_percent', value: smmAdsCommissionPercent },
        { key: 'ai_blog_content_credit_cost', value: blogContentCreditCost },
        { key: 'ai_market_analysis_credit_cost', value: marketAnalysisCreditCost },
        { key: 'ai_product_description_cost', value: productDescriptionCreditCost },
        { key: 'virtual_tryon_buyer_credits', value: virtualTryonBuyerCredits },
        { key: 'virtual_tryon_seller_setup_credits', value: virtualTryonSellerCredits },
        // Guest AI Trial Popup Settings
        { key: 'ai_guest_popup_enabled', value: guestPopupEnabled.toString() },
        { key: 'ai_guest_popup_delay_seconds', value: guestPopupDelaySeconds },
        { key: 'ai_guest_popup_scroll_percent', value: guestPopupScrollPercent },
        { key: 'ai_guest_popup_title', value: guestPopupTitle },
        { key: 'ai_guest_popup_description', value: guestPopupDescription },
        { key: 'ai_guest_popup_cta_text', value: guestPopupCtaText },
        { key: 'ai_guest_popup_show_on_scroll', value: guestPopupShowOnScroll.toString() },
      ];

      // Add all tier settings dynamically
      tiers.forEach((tier, index) => {
        const tierNum = index + 1;
        updates.push(
          { key: `ai_credit_tier_${tierNum}_name`, value: tier.name },
          { key: `ai_credit_tier_${tierNum}_price`, value: tier.price },
          { key: `ai_credit_tier_${tierNum}_credits`, value: tier.credits },
          { key: `ai_credit_tier_${tierNum}_image`, value: tier.images },
          { key: `ai_credit_tier_${tierNum}_video`, value: tier.videos },
          { key: `ai_credit_tier_${tierNum}_cost`, value: tier.cost },
          { key: `ai_credit_tier_${tierNum}_videoseconds`, value: tier.maxVideoSeconds },
          { key: `ai_credit_tier_${tierNum}_audioseconds`, value: tier.maxAudioSeconds }
        );
      });

      for (const update of updates) {
        const { error } = await supabase
          .from('app_settings')
          .upsert(update, { onConflict: 'key' });
        
        if (error) throw error;
      }

      toast.success('AI settings saved successfully');
    } catch (error) {
      console.error('Error saving AI settings:', error);
      toast.error('Failed to save AI settings');
    } finally {
      setSaving(false);
    }
  };

  const updateTier = (index: number, field: keyof CreditTier, value: string) => {
    setTiers(prev => {
      const newTiers = [...prev];
      newTiers[index] = { ...newTiers[index], [field]: value };
      return newTiers;
    });
  };

  const addTier = () => {
    const newTier: CreditTier = {
      id: generateTierId(),
      name: `Tier ${tiers.length + 1}`,
      price: '0',
      credits: '0',
      images: '0',
      videos: '0',
      cost: '0',
      maxVideoSeconds: '0',
      maxAudioSeconds: '0'
    };
    setTiers(prev => [...prev, newTier]);
  };

  // Helper to format seconds as mm:ss
  const formatSecondsDisplay = (seconds: string) => {
    const totalSeconds = parseInt(seconds) || 0;
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}m ${secs}s`;
  };

  const removeTier = (index: number) => {
    if (tiers.length <= 1) {
      toast.error('You must have at least one tier');
      return;
    }
    setTiers(prev => prev.filter((_, i) => i !== index));
  };

  const totalCommissionPercent = parseFloat(unilevelPercent) + parseFloat(stairstepPercent) + parseFloat(leadershipPercent);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="settings" className="space-y-6">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="settings" className="gap-2">
          <Settings className="h-4 w-4" />
          Settings
        </TabsTrigger>
        <TabsTrigger value="status" className="gap-2">
          <Bell className="h-4 w-4" />
          Provider Status & Alerts
        </TabsTrigger>
      </TabsList>

      <TabsContent value="status">
        <AIProviderStatus />
      </TabsContent>

      <TabsContent value="settings" className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AIhives Basic Settings
              </CardTitle>
              <CardDescription>
                Configure free limits and base credit costs
              </CardDescription>
            </div>
            <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-primary" />
                Free Image Generations
              </Label>
              <Input
                type="number"
                min="0"
                value={freeImageLimit}
                onChange={(e) => setFreeImageLimit(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Free images per user before credits required
              </p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <VideoIcon className="h-4 w-4 text-purple-500" />
                Video Generation Cost (Credits)
              </Label>
              <Input
                type="number"
                min="1"
                value={videoCreditCost}
                onChange={(e) => setVideoCreditCost(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Credits required per video generation
              </p>
            </div>
          </div>

          {/* Credit to Diamond Exchange Rate */}
          <div className="pt-4 border-t">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-yellow-500" />
                Credit to Diamond Exchange Rate
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  value={creditToDiamondRate}
                  onChange={(e) => setCreditToDiamondRate(e.target.value)}
                  className="max-w-[120px]"
                />
                <span className="text-sm text-muted-foreground">credits = 1 diamond</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Set how many AI credits equal 1 diamond for conversion (e.g., {creditToDiamondRate} credits = 1 💎)
              </p>
            </div>
          </div>

          {/* Cost Markup Percentage */}
          <div className="pt-4 border-t">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-500" />
                Cost Markup Percentage
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  value={costMarkupPercent}
                  onChange={(e) => setCostMarkupPercent(e.target.value)}
                  className="max-w-[120px]"
                />
                <span className="text-sm text-muted-foreground">% markup on cost</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {costMarkupPercent}% markup means: If cost is ₱100, selling price is ₱{(100 * (1 + parseFloat(costMarkupPercent) / 100)).toFixed(0)}
              </p>
            </div>
          </div>

          {/* Credits per Minute/Generation Rates */}
          <div className="pt-4 border-t">
            <h4 className="font-medium text-sm mb-4">Credit Consumption Rates</h4>
            <p className="text-xs text-muted-foreground mb-4">
              Define how many credits are required per minute/generation. Users see these rates when purchasing.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-xs">
                  <VideoIcon className="h-3 w-3 text-purple-500" />
                  Credits per Video Minute
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={creditsPerVideoMinute}
                  onChange={(e) => setCreditsPerVideoMinute(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  1 min = {creditsPerVideoMinute} cr | 1 sec ≈ {(parseFloat(creditsPerVideoMinute) / 60).toFixed(3)} cr
                </p>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-xs">
                  <Music className="h-3 w-3 text-blue-500" />
                  Credits per Audio Minute
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={creditsPerAudioMinute}
                  onChange={(e) => setCreditsPerAudioMinute(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  1 min = {creditsPerAudioMinute} cr | 1 sec ≈ {(parseFloat(creditsPerAudioMinute) / 60).toFixed(3)} cr
                </p>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-xs">
                  <ImageIcon className="h-3 w-3 text-green-500" />
                  Credits per Image
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={creditsPerImage}
                  onChange={(e) => setCreditsPerImage(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  1 image = {creditsPerImage} credits
                </p>
              </div>
            </div>
          </div>

          {/* Premium Services Pricing */}
          <div className="pt-4 border-t">
            <h4 className="font-medium text-sm mb-4 flex items-center gap-2">
              <Crown className="h-4 w-4 text-yellow-500" />
              Premium Services Pricing
            </h4>
            <p className="text-xs text-muted-foreground mb-4">
              Set credit costs for premium AI services available to users who purchased AI credits.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-xs">
                  <Globe className="h-3 w-3 text-blue-500" />
                  Website Scraper (per scrape)
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={scraperCreditCost}
                  onChange={(e) => setScraperCreditCost(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {scraperCreditCost} credits per website scrape
                </p>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-xs">
                  <Sparkles className="h-3 w-3 text-purple-500" />
                  AI Analysis (per analysis)
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={scraperAnalysisCost}
                  onChange={(e) => setScraperAnalysisCost(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {scraperAnalysisCost} credits per AI clone analysis
                </p>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-xs">
                  <BarChart3 className="h-3 w-3 text-green-500" />
                  Creator Analytics (per lookup)
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={analyticsCreditCost}
                  onChange={(e) => setAnalyticsCreditCost(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {analyticsCreditCost} credits per creator/website analysis
                </p>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-xs">
                  <Share2 className="h-3 w-3 text-pink-500" />
                  Social Media Management (per action)
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={socialMediaCreditCost}
                  onChange={(e) => setSocialMediaCreditCost(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {socialMediaCreditCost} credits per AI-generated post/action
                </p>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-xs">
                  <FileText className="h-3 w-3 text-indigo-500" />
                  Blog Content Maker (per blog)
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={blogContentCreditCost}
                  onChange={(e) => setBlogContentCreditCost(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {blogContentCreditCost} credits per blog content generation
                </p>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-xs">
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                  Market Analysis (per analysis)
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={marketAnalysisCreditCost}
                  onChange={(e) => setMarketAnalysisCreditCost(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {marketAnalysisCreditCost} credits per market analysis
                </p>
              </div>
              
              {/* AI Product Description */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-xs">
                  <FileText className="h-3 w-3 text-amber-500" />
                  AI Product Description (per generation)
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={productDescriptionCreditCost}
                  onChange={(e) => setProductDescriptionCreditCost(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {productDescriptionCreditCost} credits per AI product description
                </p>
              </div>
              
              {/* Virtual Try-On Settings */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-xs">
                  <Eye className="h-3 w-3 text-cyan-500" />
                  Virtual Try-On (Buyer Cost)
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={virtualTryonBuyerCredits}
                  onChange={(e) => setVirtualTryonBuyerCredits(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {virtualTryonBuyerCredits} credits per try-on (buyer pays)
                </p>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-xs">
                  <Eye className="h-3 w-3 text-orange-500" />
                  Virtual Try-On (Seller Setup)
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={virtualTryonSellerCredits}
                  onChange={(e) => setVirtualTryonSellerCredits(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {virtualTryonSellerCredits} credits for seller to enable on product
                </p>
              </div>
            </div>
            
            {/* SMM Commission Settings */}
            <div className="mt-6 pt-4 border-t">
              <h4 className="font-medium text-sm mb-4 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-500" />
                Social Media Management Commission
              </h4>
              <p className="text-xs text-muted-foreground mb-4">
                Set admin commission rates for social media management services. This is charged on user earnings from clients.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-xs">
                    <Users className="h-3 w-3 text-blue-500" />
                    SMM Service Commission (%)
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max="50"
                    value={smmCommissionPercent}
                    onChange={(e) => setSmmCommissionPercent(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Admin takes {smmCommissionPercent}% from user's client fees
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-xs">
                    <TrendingUp className="h-3 w-3 text-purple-500" />
                    Ads Management Commission (%)
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max="50"
                    value={smmAdsCommissionPercent}
                    onChange={(e) => setSmmAdsCommissionPercent(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Admin takes {smmAdsCommissionPercent}% from ad management services
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cost Calculator */}
      <AICostCalculator />

      {/* Credit Tiers */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                Credit Purchase Tiers
              </CardTitle>
              <CardDescription>
                Configure pricing tiers for credit purchases. Add or remove tiers as needed.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={addTier} size="sm" variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Tier
              </Button>
              <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2">
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {tiers.map((tier, index) => {
            const cost = parseFloat(tier.cost) || 0;
            const price = parseFloat(tier.price) || 0;
            const profit = price - cost;
            const profitMargin = price > 0 ? ((profit / price) * 100).toFixed(1) : '0';
            
            return (
              <div key={tier.id} className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-sm font-medium text-muted-foreground">Tier {index + 1}:</span>
                    <Input
                      value={tier.name}
                      onChange={(e) => updateTier(index, 'name', e.target.value)}
                      className="max-w-[150px] h-8"
                      placeholder="Tier name"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => removeTier(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-orange-600">Cost (₱)</Label>
                    <Input
                      type="number"
                      value={tier.cost}
                      onChange={(e) => updateTier(index, 'cost', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Price (₱)</Label>
                    <Input
                      type="number"
                      value={tier.price}
                      onChange={(e) => updateTier(index, 'price', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Credits</Label>
                    <Input
                      type="number"
                      value={tier.credits}
                      onChange={(e) => updateTier(index, 'credits', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">~Images</Label>
                    <Input
                      type="number"
                      value={tier.images}
                      onChange={(e) => updateTier(index, 'images', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">~Videos</Label>
                    <Input
                      type="number"
                      value={tier.videos}
                      onChange={(e) => updateTier(index, 'videos', e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div className="space-y-1 col-span-2">
                    <Label className="text-xs text-purple-500 flex items-center gap-1">
                      <VideoIcon className="h-3 w-3" />
                      Max Video Time ({formatSecondsDisplay(tier.maxVideoSeconds)})
                    </Label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input
                          type="number"
                          min="0"
                          value={Math.floor((parseInt(tier.maxVideoSeconds) || 0) / 60)}
                          onChange={(e) => {
                            const mins = parseInt(e.target.value) || 0;
                            const currentSecs = (parseInt(tier.maxVideoSeconds) || 0) % 60;
                            updateTier(index, 'maxVideoSeconds', (mins * 60 + currentSecs).toString());
                          }}
                          placeholder="min"
                        />
                        <span className="text-[10px] text-muted-foreground">min</span>
                      </div>
                      <div className="flex-1">
                        <Input
                          type="number"
                          min="0"
                          max="59"
                          value={(parseInt(tier.maxVideoSeconds) || 0) % 60}
                          onChange={(e) => {
                            const secs = Math.min(59, parseInt(e.target.value) || 0);
                            const currentMins = Math.floor((parseInt(tier.maxVideoSeconds) || 0) / 60);
                            updateTier(index, 'maxVideoSeconds', (currentMins * 60 + secs).toString());
                          }}
                          placeholder="sec"
                        />
                        <span className="text-[10px] text-muted-foreground">sec</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <Label className="text-xs text-blue-500 flex items-center gap-1">
                      <Music className="h-3 w-3" />
                      Max Audio Time ({formatSecondsDisplay(tier.maxAudioSeconds)})
                    </Label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input
                          type="number"
                          min="0"
                          value={Math.floor((parseInt(tier.maxAudioSeconds) || 0) / 60)}
                          onChange={(e) => {
                            const mins = parseInt(e.target.value) || 0;
                            const currentSecs = (parseInt(tier.maxAudioSeconds) || 0) % 60;
                            updateTier(index, 'maxAudioSeconds', (mins * 60 + currentSecs).toString());
                          }}
                          placeholder="min"
                        />
                        <span className="text-[10px] text-muted-foreground">min</span>
                      </div>
                      <div className="flex-1">
                        <Input
                          type="number"
                          min="0"
                          max="59"
                          value={(parseInt(tier.maxAudioSeconds) || 0) % 60}
                          onChange={(e) => {
                            const secs = Math.min(59, parseInt(e.target.value) || 0);
                            const currentMins = Math.floor((parseInt(tier.maxAudioSeconds) || 0) / 60);
                            updateTier(index, 'maxAudioSeconds', (currentMins * 60 + secs).toString());
                          }}
                          placeholder="sec"
                        />
                        <span className="text-[10px] text-muted-foreground">sec</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground flex gap-4">
                  <span>Profit: <strong className="text-green-600">₱{profit.toLocaleString()}</strong></span>
                  <span>Margin: <strong className={profit > 0 ? 'text-green-600' : 'text-destructive'}>{profitMargin}%</strong></span>
                </div>
              </div>
            );
          })}
          
          {tiers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No tiers configured. Click "Add Tier" to create your first pricing tier.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Commission Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-green-500" />
                Affiliate Commission Distribution
              </CardTitle>
              <CardDescription>
                Configure how credit purchase revenue is distributed
              </CardDescription>
            </div>
            <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              Admin Earnings (%)
            </Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={adminEarningsPercent}
              onChange={(e) => setAdminEarningsPercent(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Percentage admin earns from each credit purchase
            </p>
          </div>

          <Separator />

          <div>
            <p className="text-sm font-medium mb-4">
              Commission Pool Distribution (Remaining {100 - parseFloat(adminEarningsPercent)}% after admin earnings)
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Unilevel (%)</Label>
                <Input
                  type="number"
                  min="0"
                  value={unilevelPercent}
                  onChange={(e) => setUnilevelPercent(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Stair-Step (%)</Label>
                <Input
                  type="number"
                  min="0"
                  value={stairstepPercent}
                  onChange={(e) => setStairstepPercent(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Leadership (%)</Label>
                <Input
                  type="number"
                  min="0"
                  value={leadershipPercent}
                  onChange={(e) => setLeadershipPercent(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Total: {totalCommissionPercent}% (distributed proportionally from affiliate pool)
            </p>
          </div>

          {/* Cost-Based Commission Example */}
          <div className="p-4 rounded-lg bg-muted/50 border space-y-4">
            <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
              <p className="font-semibold text-primary text-sm mb-1">💡 Profitability Protection</p>
              <p className="text-xs text-muted-foreground">
                Commissions are calculated on <strong>PROFIT ONLY</strong> (Sale Price - Cost), not total sale amount.
                This ensures admin never loses money on commissions.
              </p>
            </div>
            
            <h4 className="font-medium text-sm">Example: Tier 2 (₱{tiers[1].price}) Purchase</h4>
            <div className="space-y-3 text-xs">
              <div className="grid gap-1">
                <p>• Your Cost: <strong className="text-orange-600">₱{tiers[1].cost}</strong></p>
                <p>• Sale Price: <strong>₱{tiers[1].price}</strong></p>
                <p>• Gross Profit: <strong className="text-green-600">₱{(parseFloat(tiers[1].price) - parseFloat(tiers[1].cost)).toLocaleString()}</strong></p>
              </div>
              
              <div className="border-t pt-2">
                <p className="font-medium mb-1">Commission Distribution (from ₱{(parseFloat(tiers[1].price) - parseFloat(tiers[1].cost)).toLocaleString()} profit):</p>
                {(() => {
                  const profit = parseFloat(tiers[1].price) - parseFloat(tiers[1].cost);
                  const adminShare = profit * parseFloat(adminEarningsPercent) / 100;
                  const affiliatePool = profit - adminShare;
                  const totalRatio = parseFloat(unilevelPercent) + parseFloat(stairstepPercent) + parseFloat(leadershipPercent);
                  const unilevelShare = affiliatePool * (parseFloat(unilevelPercent) / totalRatio);
                  const stairstepShare = affiliatePool * (parseFloat(stairstepPercent) / totalRatio);
                  const leadershipShare = affiliatePool * (parseFloat(leadershipPercent) / totalRatio);
                  
                  return (
                    <div className="ml-2 space-y-1">
                      <p>• Admin Earnings ({adminEarningsPercent}%): <strong className="text-green-600">₱{adminShare.toFixed(2)}</strong></p>
                      <p>• Affiliate Pool: <strong>₱{affiliatePool.toFixed(2)}</strong></p>
                      <div className="ml-4 text-muted-foreground">
                        <p>→ Unilevel ({unilevelPercent}%): ₱{unilevelShare.toFixed(2)}</p>
                        <p>→ Stair-Step ({stairstepPercent}%): ₱{stairstepShare.toFixed(2)}</p>
                        <p>→ Leadership ({leadershipPercent}%): ₱{leadershipShare.toFixed(2)}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Guest AI Trial Popup Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-pink-500" />
            Guest AI Trial Popup (Email Capture)
          </CardTitle>
          <CardDescription>
            Configure the popup that appears for unregistered users to capture emails
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border">
            <div className="space-y-1">
              <Label className="font-medium">Enable Guest Trial Popup</Label>
              <p className="text-xs text-muted-foreground">
                Show popup to unregistered users in AIhives
              </p>
            </div>
            <Switch
              checked={guestPopupEnabled}
              onCheckedChange={setGuestPopupEnabled}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Delay Before Showing (seconds)
              </Label>
              <Input
                type="number"
                min="5"
                max="300"
                value={guestPopupDelaySeconds}
                onChange={(e) => setGuestPopupDelaySeconds(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Time to wait before showing popup (5-300 seconds)
              </p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Scroll Trigger (%)
              </Label>
              <Input
                type="number"
                min="10"
                max="100"
                value={guestPopupScrollPercent}
                onChange={(e) => setGuestPopupScrollPercent(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Show popup after scrolling this % of page
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="space-y-1">
              <Label className="font-medium text-sm">Trigger on Scroll</Label>
              <p className="text-xs text-muted-foreground">
                Also trigger popup when user scrolls past threshold
              </p>
            </div>
            <Switch
              checked={guestPopupShowOnScroll}
              onCheckedChange={setGuestPopupShowOnScroll}
            />
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Popup Content
            </h4>
            
            <div className="space-y-2">
              <Label>Popup Title</Label>
              <Input
                value={guestPopupTitle}
                onChange={(e) => setGuestPopupTitle(e.target.value)}
                placeholder="Try Our AI Services Free!"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={guestPopupDescription}
                onChange={(e) => setGuestPopupDescription(e.target.value)}
                placeholder="Experience the power of AI image & video generation"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>CTA Button Text</Label>
              <Input
                value={guestPopupCtaText}
                onChange={(e) => setGuestPopupCtaText(e.target.value)}
                placeholder="Get Download Access"
              />
            </div>
          </div>

          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
              📧 Email Capture Strategy
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-300">
              Captured emails are stored in Newsletter Subscribers with source "ai_trial". 
              Use these leads for follow-up marketing campaigns in the Newsletter tab.
            </p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
        <Save className="h-4 w-4" />
        {saving ? 'Saving...' : 'Save All Settings'}
      </Button>
      </TabsContent>
    </Tabs>
  );
};

export default AISettingsManagement;
