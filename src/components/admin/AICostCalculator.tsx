import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Calculator, Video, Music, Image, Mic, Loader2, Brain, MessageSquare, Diamond, ArrowRight, Save, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';

interface ProviderPricing {
  id: string;
  provider_name: string;
  model_name: string;
  input_cost_per_1k: number | null;
  output_cost_per_1k: number | null;
  image_cost: number | null;
  video_cost_per_second: number | null;
  audio_cost_per_minute: number | null;
}

const AICostCalculator = () => {
  const [pricing, setPricing] = useState<ProviderPricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Diamond to PHP converter
  const [diamondToPhp, setDiamondToPhp] = useState('1'); // 1 diamond = X PHP
  const [markupPercent, setMarkupPercent] = useState('50'); // Markup percentage

  // Calculator inputs
  const [videoSeconds, setVideoSeconds] = useState('60'); // Default 60 seconds
  const [audioMinutes, setAudioMinutes] = useState('15');
  const [imageCount, setImageCount] = useState('10');
  const [researchQueries, setResearchQueries] = useState('20');
  const [chatMessages, setChatMessages] = useState('50');
  const [selectedVideoProvider, setSelectedVideoProvider] = useState('');
  const [selectedAudioProvider, setSelectedAudioProvider] = useState('');
  const [selectedImageProvider, setSelectedImageProvider] = useState('');

  // USD to PHP rate (approximate)
  const usdToPhp = 56;

  useEffect(() => {
    fetchPricing();
  }, []);

  const fetchPricing = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from('ai_provider_pricing')
        .select('*')
        .order('provider_name', { ascending: true });

      if (error) throw error;
      setPricing(data || []);

      // Set default providers
      if (data && data.length > 0) {
        const videoProvider = data.find(p => (p.video_cost_per_second || 0) > 0);
        const audioProvider = data.find(p => (p.audio_cost_per_minute || 0) > 0);
        const imageProvider = data.find(p => (p.image_cost || 0) > 0);
        
        if (videoProvider && !selectedVideoProvider) setSelectedVideoProvider(videoProvider.id);
        if (audioProvider && !selectedAudioProvider) setSelectedAudioProvider(audioProvider.id);
        if (imageProvider && !selectedImageProvider) setSelectedImageProvider(imageProvider.id);
      }
      
      if (isRefresh) toast.success('Pricing updated from database');
    } catch (error) {
      console.error('Error fetching pricing:', error);
      if (isRefresh) toast.error('Failed to refresh pricing');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Calculate costs
  const calculateVideoCost = () => {
    const provider = pricing.find(p => p.id === selectedVideoProvider);
    if (!provider || !provider.video_cost_per_second) return 0;
    const seconds = parseFloat(videoSeconds) || 0;
    return seconds * provider.video_cost_per_second;
  };

  const getVideoCostPerSecond = () => {
    const provider = pricing.find(p => p.id === selectedVideoProvider);
    return provider?.video_cost_per_second || 0;
  };

  const calculateAudioCost = () => {
    const provider = pricing.find(p => p.id === selectedAudioProvider);
    if (!provider || !provider.audio_cost_per_minute) return 0;
    const minutes = parseFloat(audioMinutes) || 0;
    return minutes * provider.audio_cost_per_minute;
  };

  const calculateImageCost = () => {
    const provider = pricing.find(p => p.id === selectedImageProvider);
    if (!provider || !provider.image_cost) return 0;
    const count = parseInt(imageCount) || 0;
    return count * provider.image_cost;
  };

  // Estimate research cost (based on Gemini Pro tokens)
  const calculateResearchCost = () => {
    const queries = parseInt(researchQueries) || 0;
    // Average ~2000 tokens per research query at Gemini Pro rates (~$0.00125/1K input + $0.005/1K output)
    const avgCostPerQuery = 0.0125; // Estimated $0.0125 per research query
    return queries * avgCostPerQuery;
  };

  // Estimate chat cost (based on GPT-5 tokens)
  const calculateChatCost = () => {
    const messages = parseInt(chatMessages) || 0;
    // Average ~500 tokens per chat exchange at GPT-5 rates
    const avgCostPerMessage = 0.005; // Estimated $0.005 per chat message
    return messages * avgCostPerMessage;
  };

  const totalCost = calculateVideoCost() + calculateAudioCost() + calculateImageCost() + calculateResearchCost() + calculateChatCost();

  // Convert USD to PHP
  const totalCostPhp = totalCost * usdToPhp;
  
  // Apply markup
  const markup = parseFloat(markupPercent) || 0;
  const totalWithMarkup = totalCostPhp * (1 + markup / 100);
  
  // Convert to diamonds
  const phpPerDiamond = parseFloat(diamondToPhp) || 1;
  const totalDiamonds = Math.ceil(totalWithMarkup / phpPerDiamond);

  // Calculate per-second and per-minute pricing for user-friendly display
  const videoSecondsNum = parseFloat(videoSeconds) || 1;
  const audioMinutesNum = parseFloat(audioMinutes) || 1;
  
  // Video cost per second with markup
  const videoCostPerSecondUsd = getVideoCostPerSecond();
  const videoCostPerSecondPhp = videoCostPerSecondUsd * usdToPhp * (1 + markup / 100);
  const videoCostPerMinutePhp = videoCostPerSecondPhp * 60;
  
  const audioCostPerMinutePhp = (calculateAudioCost() * usdToPhp * (1 + markup / 100)) / audioMinutesNum;
  
  const diamondsPerVideoSecond = Math.ceil(videoCostPerSecondPhp / phpPerDiamond * 10) / 10; // Allow decimals
  const diamondsPerVideoMinute = Math.ceil(videoCostPerMinutePhp / phpPerDiamond);
  const diamondsPerAudioMinute = Math.ceil(audioCostPerMinutePhp / phpPerDiamond);

  const videoProviders = pricing.filter(p => (p.video_cost_per_second || 0) > 0);
  const audioProviders = pricing.filter(p => (p.audio_cost_per_minute || 0) > 0);
  const imageProviders = pricing.filter(p => (p.image_cost || 0) > 0);

  const formatCost = (cost: number) => {
    if (cost === 0) return '$0.00';
    if (cost < 0.01) return `$${cost.toFixed(6)}`;
    if (cost < 1) return `$${cost.toFixed(4)}`;
    return `$${cost.toFixed(2)}`;
  };

  const formatPhp = (cost: number) => {
    return `₱${cost.toFixed(2)}`;
  };

  const savePricingSettings = async () => {
    try {
      // Save diamond rate and markup to app_settings
      const settings = [
        { key: 'diamond_to_php_rate', value: diamondToPhp },
        { key: 'ai_markup_percent', value: markupPercent },
        { key: 'diamonds_per_video_second', value: diamondsPerVideoSecond.toString() },
        { key: 'diamonds_per_video_minute', value: diamondsPerVideoMinute.toString() },
        { key: 'diamonds_per_audio_minute', value: diamondsPerAudioMinute.toString() },
      ];

      for (const setting of settings) {
        await supabase
          .from('app_settings')
          .upsert({ key: setting.key, value: setting.value }, { onConflict: 'key' });
      }

      toast.success('Pricing settings saved!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    }
  };

  // Load saved settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data } = await supabase
          .from('app_settings')
          .select('key, value')
          .in('key', ['diamond_to_php_rate', 'ai_markup_percent']);

        if (data) {
          data.forEach(setting => {
            if (setting.key === 'diamond_to_php_rate' && setting.value) {
              setDiamondToPhp(setting.value);
            }
            if (setting.key === 'ai_markup_percent' && setting.value) {
              setMarkupPercent(setting.value);
            }
          });
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    loadSettings();
  }, []);

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
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            AI Cost Calculator
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => fetchPricing(true)}
            disabled={refreshing}
            className="h-8"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Updating...' : 'Refresh'}
          </Button>
        </div>
        <CardDescription>
          Auto-synced with AI provider pricing • Convert to diamonds for user pricing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Diamond to PHP Converter */}
        <div className="p-3 rounded-lg border-2 border-primary/30 bg-primary/5 space-y-3">
          <div className="flex items-center gap-2">
            <Diamond className="h-4 w-4 text-yellow-500" />
            <Label className="font-semibold text-sm">Diamond to PHP Rate & Markup</Label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">1 Diamond = ₱</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={diamondToPhp}
                onChange={(e) => setDiamondToPhp(e.target.value)}
                placeholder="1.00"
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Markup %</Label>
              <Input
                type="number"
                min="0"
                step="5"
                value={markupPercent}
                onChange={(e) => setMarkupPercent(e.target.value)}
                placeholder="50"
                className="h-8"
              />
            </div>
          </div>
          <Button onClick={savePricingSettings} size="sm" className="w-full h-8">
            <Save className="h-3 w-3 mr-1" />
            Save Rate Settings
          </Button>
        </div>

        {/* Quick Price Reference */}
        <div className="p-3 rounded-lg bg-muted/50 border space-y-2">
          <Label className="font-semibold text-sm flex items-center gap-1">
            <ArrowRight className="h-3 w-3" />
            Suggested User Pricing (with {markupPercent}% markup)
          </Label>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="p-2 bg-purple-500/10 rounded border border-purple-500/20">
              <div className="text-purple-400 font-medium">Video/sec</div>
              <div className="text-lg font-bold">{diamondsPerVideoSecond} 💎</div>
              <div className="text-muted-foreground">{formatPhp(videoCostPerSecondPhp)}</div>
            </div>
            <div className="p-2 bg-purple-500/10 rounded border border-purple-500/20">
              <div className="text-purple-400 font-medium">Video/min</div>
              <div className="text-lg font-bold">{diamondsPerVideoMinute} 💎</div>
              <div className="text-muted-foreground">{formatPhp(videoCostPerMinutePhp)}</div>
            </div>
            <div className="p-2 bg-orange-500/10 rounded border border-orange-500/20">
              <div className="text-orange-400 font-medium">Audio/min</div>
              <div className="text-lg font-bold">{diamondsPerAudioMinute} 💎</div>
              <div className="text-muted-foreground">{formatPhp(audioCostPerMinutePhp)}</div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Video Cost */}
        <div className="p-3 rounded-lg border bg-muted/30 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 text-purple-500" />
              <Label className="font-medium text-sm">Video Generation (fal.ai)</Label>
            </div>
            <span className="text-xs text-muted-foreground">
              ${getVideoCostPerSecond().toFixed(4)}/sec
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Seconds</Label>
              <Input
                type="number"
                min="0"
                step="5"
                value={videoSeconds}
                onChange={(e) => setVideoSeconds(e.target.value)}
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Provider</Label>
              <Select value={selectedVideoProvider} onValueChange={setSelectedVideoProvider}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {videoProviders.map(p => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.provider_name} - {p.model_name} (${p.video_cost_per_second?.toFixed(4)}/s)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span>Cost for {videoSeconds}s:</span>
              <span><strong className="text-purple-500">{formatCost(calculateVideoCost())}</strong> / {formatPhp(calculateVideoCost() * usdToPhp)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>With {markupPercent}% markup:</span>
              <span className="font-medium">{Math.ceil(calculateVideoCost() * usdToPhp * (1 + markup / 100) / phpPerDiamond)} 💎</span>
            </div>
          </div>
        </div>

        {/* Audio Cost */}
        <div className="p-3 rounded-lg border bg-muted/30 space-y-2">
          <div className="flex items-center gap-2">
            <Mic className="h-4 w-4 text-orange-500" />
            <Label className="font-medium text-sm">Audio/Voice</Label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Minutes</Label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={audioMinutes}
                onChange={(e) => setAudioMinutes(e.target.value)}
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Provider</Label>
              <Select value={selectedAudioProvider} onValueChange={setSelectedAudioProvider}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {audioProviders.map(p => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.provider_name} - {p.model_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="text-xs flex justify-between">
            <span>Cost: <strong className="text-orange-500">{formatCost(calculateAudioCost())}</strong></span>
            <span className="text-muted-foreground">{formatPhp(calculateAudioCost() * usdToPhp)}</span>
          </div>
        </div>

        {/* Image Cost */}
        <div className="p-3 rounded-lg border bg-muted/30 space-y-2">
          <div className="flex items-center gap-2">
            <Image className="h-4 w-4 text-green-500" />
            <Label className="font-medium text-sm">Images</Label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Count</Label>
              <Input
                type="number"
                min="0"
                value={imageCount}
                onChange={(e) => setImageCount(e.target.value)}
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Provider</Label>
              <Select value={selectedImageProvider} onValueChange={setSelectedImageProvider}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {imageProviders.map(p => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.provider_name} - {p.model_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="text-xs flex justify-between">
            <span>Cost: <strong className="text-green-500">{formatCost(calculateImageCost())}</strong></span>
            <span className="text-muted-foreground">{formatPhp(calculateImageCost() * usdToPhp)}</span>
          </div>
        </div>

        {/* Research Cost */}
        <div className="p-3 rounded-lg border bg-muted/30 space-y-2">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-blue-500" />
            <Label className="font-medium text-sm">Research Queries</Label>
          </div>
          <div className="space-y-1">
            <Input
              type="number"
              min="0"
              value={researchQueries}
              onChange={(e) => setResearchQueries(e.target.value)}
              className="h-8"
            />
          </div>
          <div className="text-xs flex justify-between">
            <span>Cost: <strong className="text-blue-500">{formatCost(calculateResearchCost())}</strong></span>
            <span className="text-muted-foreground">{formatPhp(calculateResearchCost() * usdToPhp)}</span>
          </div>
        </div>

        {/* Chat Cost */}
        <div className="p-3 rounded-lg border bg-muted/30 space-y-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-indigo-500" />
            <Label className="font-medium text-sm">Chat Messages</Label>
          </div>
          <div className="space-y-1">
            <Input
              type="number"
              min="0"
              value={chatMessages}
              onChange={(e) => setChatMessages(e.target.value)}
              className="h-8"
            />
          </div>
          <div className="text-xs flex justify-between">
            <span>Cost: <strong className="text-indigo-500">{formatCost(calculateChatCost())}</strong></span>
            <span className="text-muted-foreground">{formatPhp(calculateChatCost() * usdToPhp)}</span>
          </div>
        </div>

        {/* Total Summary */}
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Provider Cost:</span>
            <span className="font-medium">{formatCost(totalCost)} ({formatPhp(totalCostPhp)})</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>With {markupPercent}% Markup:</span>
            <span className="font-medium">{formatPhp(totalWithMarkup)}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="font-semibold">User Price:</span>
            <div className="text-right">
              <div className="text-xl font-bold text-primary flex items-center gap-1">
                {totalDiamonds} <Diamond className="h-4 w-4 text-yellow-500" />
              </div>
              <div className="text-xs text-muted-foreground">{formatPhp(totalWithMarkup)}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AICostCalculator;
