import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Calculator, Video, Music, Image, Mic, Loader2, Brain, MessageSquare } from 'lucide-react';

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

  // Calculator inputs
  const [videoMinutes, setVideoMinutes] = useState('15');
  const [audioMinutes, setAudioMinutes] = useState('15');
  const [imageCount, setImageCount] = useState('10');
  const [researchQueries, setResearchQueries] = useState('20');
  const [chatMessages, setChatMessages] = useState('50');
  const [selectedVideoProvider, setSelectedVideoProvider] = useState('');
  const [selectedAudioProvider, setSelectedAudioProvider] = useState('');
  const [selectedImageProvider, setSelectedImageProvider] = useState('');

  useEffect(() => {
    fetchPricing();
  }, []);

  const fetchPricing = async () => {
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
        
        if (videoProvider) setSelectedVideoProvider(videoProvider.id);
        if (audioProvider) setSelectedAudioProvider(audioProvider.id);
        if (imageProvider) setSelectedImageProvider(imageProvider.id);
      }
    } catch (error) {
      console.error('Error fetching pricing:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate costs
  const calculateVideoCost = () => {
    const provider = pricing.find(p => p.id === selectedVideoProvider);
    if (!provider || !provider.video_cost_per_second) return 0;
    const minutes = parseFloat(videoMinutes) || 0;
    return minutes * 60 * provider.video_cost_per_second;
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

  const videoProviders = pricing.filter(p => (p.video_cost_per_second || 0) > 0);
  const audioProviders = pricing.filter(p => (p.audio_cost_per_minute || 0) > 0);
  const imageProviders = pricing.filter(p => (p.image_cost || 0) > 0);

  const formatCost = (cost: number) => {
    if (cost === 0) return '$0.00';
    if (cost < 0.01) return `$${cost.toFixed(6)}`;
    if (cost < 1) return `$${cost.toFixed(4)}`;
    return `$${cost.toFixed(2)}`;
  };

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
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          AI Cost Calculator
        </CardTitle>
        <CardDescription>
          Enter duration/quantity to calculate estimated AI provider costs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Video Cost */}
        <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
          <div className="flex items-center gap-2">
            <Video className="h-4 w-4 text-purple-500" />
            <Label className="font-medium">Video Generation</Label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Duration (minutes)</Label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={videoMinutes}
                onChange={(e) => setVideoMinutes(e.target.value)}
                placeholder="e.g., 15"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Provider</Label>
              <Select value={selectedVideoProvider} onValueChange={setSelectedVideoProvider}>
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {videoProviders.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.provider_name} - {p.model_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="text-sm">
            Cost: <strong className="text-purple-500">{formatCost(calculateVideoCost())}</strong>
            {selectedVideoProvider && (
              <span className="text-xs text-muted-foreground ml-2">
                ({pricing.find(p => p.id === selectedVideoProvider)?.video_cost_per_second?.toFixed(4) || 0}/sec)
              </span>
            )}
          </div>
        </div>

        {/* Audio Cost */}
        <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
          <div className="flex items-center gap-2">
            <Mic className="h-4 w-4 text-orange-500" />
            <Label className="font-medium">Audio/Voice Generation</Label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Duration (minutes)</Label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={audioMinutes}
                onChange={(e) => setAudioMinutes(e.target.value)}
                placeholder="e.g., 15"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Provider</Label>
              <Select value={selectedAudioProvider} onValueChange={setSelectedAudioProvider}>
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {audioProviders.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.provider_name} - {p.model_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="text-sm">
            Cost: <strong className="text-orange-500">{formatCost(calculateAudioCost())}</strong>
            {selectedAudioProvider && (
              <span className="text-xs text-muted-foreground ml-2">
                ({pricing.find(p => p.id === selectedAudioProvider)?.audio_cost_per_minute?.toFixed(4) || 0}/min)
              </span>
            )}
          </div>
        </div>

        {/* Image Cost */}
        <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
          <div className="flex items-center gap-2">
            <Image className="h-4 w-4 text-green-500" />
            <Label className="font-medium">Image Generation</Label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Number of Images</Label>
              <Input
                type="number"
                min="0"
                value={imageCount}
                onChange={(e) => setImageCount(e.target.value)}
                placeholder="e.g., 10"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Provider</Label>
              <Select value={selectedImageProvider} onValueChange={setSelectedImageProvider}>
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {imageProviders.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.provider_name} - {p.model_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="text-sm">
            Cost: <strong className="text-green-500">{formatCost(calculateImageCost())}</strong>
            {selectedImageProvider && (
              <span className="text-xs text-muted-foreground ml-2">
                ({pricing.find(p => p.id === selectedImageProvider)?.image_cost?.toFixed(4) || 0}/image)
              </span>
            )}
          </div>
        </div>

        {/* Deep Research Cost */}
        <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-blue-500" />
            <Label className="font-medium">Deep Research (Gemini Pro)</Label>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Number of Research Queries</Label>
            <Input
              type="number"
              min="0"
              value={researchQueries}
              onChange={(e) => setResearchQueries(e.target.value)}
              placeholder="e.g., 20"
            />
          </div>
          <div className="text-sm">
            Cost: <strong className="text-blue-500">{formatCost(calculateResearchCost())}</strong>
            <span className="text-xs text-muted-foreground ml-2">
              (~$0.0125/query avg)
            </span>
          </div>
        </div>

        {/* GPT-5 Chat Cost */}
        <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-indigo-500" />
            <Label className="font-medium">GPT-5 Chat Assistant</Label>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Number of Chat Messages</Label>
            <Input
              type="number"
              min="0"
              value={chatMessages}
              onChange={(e) => setChatMessages(e.target.value)}
              placeholder="e.g., 50"
            />
          </div>
          <div className="text-sm">
            Cost: <strong className="text-indigo-500">{formatCost(calculateChatCost())}</strong>
            <span className="text-xs text-muted-foreground ml-2">
              (~$0.005/message avg)
            </span>
          </div>
        </div>

        {/* Total */}
        <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
          <div className="flex items-center justify-between">
            <span className="font-medium">Total Estimated Cost:</span>
            <span className="text-2xl font-bold text-primary">{formatCost(totalCost)}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            This is your estimated cost from AI providers. Add your markup to set user pricing.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default AICostCalculator;
