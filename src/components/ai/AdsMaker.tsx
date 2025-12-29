import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Globe, Loader2, Sparkles, Copy, Download, Edit, Send, 
  Facebook, Instagram, Twitter, Linkedin, Youtube, Music2,
  Image, RefreshCw, Trash2, CheckCircle, Megaphone, Palette
} from 'lucide-react';

interface AdsMakerProps {
  userCredits: number;
  onCreditsChange: () => void;
}

interface BrandData {
  url: string;
  title: string;
  description: string;
  markdown: string;
  branding?: {
    name?: string;
    logo?: string;
    colors?: string[];
    tagline?: string;
  };
  images: string[];
}

interface GeneratedAd {
  id: string;
  platform: string;
  headline: string;
  primaryText: string;
  description: string;
  callToAction: string;
  hashtags: string[];
  imagePrompt: string;
  generatedImageUrl?: string;
}

const PLATFORMS = [
  { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'bg-blue-600' },
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500' },
  { id: 'twitter', name: 'Twitter/X', icon: Twitter, color: 'bg-black' },
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: 'bg-blue-700' },
  { id: 'youtube', name: 'YouTube', icon: Youtube, color: 'bg-red-600' },
  { id: 'tiktok', name: 'TikTok', icon: Music2, color: 'bg-black' },
];

const AD_CREDIT_COST = 3;

const AdsMaker: React.FC<AdsMakerProps> = ({ userCredits, onCreditsChange }) => {
  const { user } = useAuth();
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isScrapingWebsite, setIsScrapingWebsite] = useState(false);
  const [brandData, setBrandData] = useState<BrandData | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['facebook', 'instagram']);
  const [isGeneratingAds, setIsGeneratingAds] = useState(false);
  const [generatedAds, setGeneratedAds] = useState<GeneratedAd[]>([]);
  const [editingAd, setEditingAd] = useState<GeneratedAd | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState<string | null>(null);

  const handleScrapeWebsite = async () => {
    if (!websiteUrl.trim()) {
      toast.error('Please enter a website URL');
      return;
    }

    setIsScrapingWebsite(true);
    try {
      const { data, error } = await supabase.functions.invoke('scrape-website', {
        body: { url: websiteUrl.trim() }
      });

      if (error) throw error;

      if (data?.success) {
        setBrandData(data.data);
        toast.success('Website analyzed successfully! TriviaBees AI now knows your brand.');
      } else {
        throw new Error(data?.error || 'Failed to analyze website');
      }
    } catch (error: any) {
      console.error('Scrape error:', error);
      toast.error(error.message || 'Failed to analyze website');
    } finally {
      setIsScrapingWebsite(false);
    }
  };

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platformId) 
        ? prev.filter(p => p !== platformId)
        : [...prev, platformId]
    );
  };

  const handleGenerateAds = async () => {
    if (!brandData) {
      toast.error('Please analyze your website first');
      return;
    }

    if (selectedPlatforms.length === 0) {
      toast.error('Please select at least one platform');
      return;
    }

    const totalCost = selectedPlatforms.length * AD_CREDIT_COST;
    if (userCredits < totalCost) {
      toast.error(`Insufficient credits. Need ${totalCost} credits for ${selectedPlatforms.length} platforms.`);
      return;
    }

    setIsGeneratingAds(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-ads', {
        body: {
          brandData: {
            url: brandData.url,
            title: brandData.title,
            description: brandData.description,
            content: brandData.markdown?.substring(0, 5000),
            branding: brandData.branding,
          },
          platforms: selectedPlatforms,
        }
      });

      if (error) throw error;

      if (data?.ads) {
        setGeneratedAds(data.ads);
        toast.success(`Generated ${data.ads.length} unique ad ideas!`);
        onCreditsChange();
      } else {
        throw new Error(data?.error || 'Failed to generate ads');
      }
    } catch (error: any) {
      console.error('Generate ads error:', error);
      toast.error(error.message || 'Failed to generate ads');
    } finally {
      setIsGeneratingAds(false);
    }
  };

  const handleGenerateImage = async (ad: GeneratedAd) => {
    if (userCredits < 1) {
      toast.error('Insufficient credits for image generation');
      return;
    }

    setIsGeneratingImage(ad.id);
    try {
      const { data, error } = await supabase.functions.invoke('ai-generate', {
        body: {
          type: 'text-to-image',
          prompt: ad.imagePrompt,
        }
      });

      if (error) throw error;

      if (data?.imageUrl) {
        setGeneratedAds(prev => prev.map(a => 
          a.id === ad.id ? { ...a, generatedImageUrl: data.imageUrl } : a
        ));
        toast.success('Ad image generated!');
        onCreditsChange();
      }
    } catch (error: any) {
      console.error('Generate image error:', error);
      toast.error(error.message || 'Failed to generate image');
    } finally {
      setIsGeneratingImage(null);
    }
  };

  const handleEditAd = (ad: GeneratedAd) => {
    setEditingAd({ ...ad });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (editingAd) {
      setGeneratedAds(prev => prev.map(a => 
        a.id === editingAd.id ? editingAd : a
      ));
      setIsEditDialogOpen(false);
      toast.success('Ad updated!');
    }
  };

  const handleCopyAd = (ad: GeneratedAd) => {
    const adText = `${ad.headline}\n\n${ad.primaryText}\n\n${ad.description}\n\n${ad.callToAction}\n\n${ad.hashtags.join(' ')}`;
    navigator.clipboard.writeText(adText);
    toast.success('Ad copied to clipboard!');
  };

  const handleDeleteAd = (adId: string) => {
    setGeneratedAds(prev => prev.filter(a => a.id !== adId));
    toast.success('Ad removed');
  };

  const getPlatformInfo = (platformId: string) => {
    return PLATFORMS.find(p => p.id === platformId) || PLATFORMS[0];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <div className="p-3 rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500">
            <Megaphone className="h-8 w-8 text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 bg-clip-text text-transparent">
          TriviaBees AI Ads Maker
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Drop your website link and let TriviaBees AI get to know your brand. 
          Our AI ad creator delivers unlimited, unique ad ideas daily for all social media platforms.
        </p>
      </div>

      {/* Step 1: Website Input */}
      <Card className="border-2 border-dashed border-purple-200 dark:border-purple-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-purple-500" />
            Step 1: Enter Your Website
          </CardTitle>
          <CardDescription>
            Drop your website link and TriviaBees AI will analyze your brand
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="https://yourwebsite.com"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={handleScrapeWebsite}
              disabled={isScrapingWebsite || !websiteUrl.trim()}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {isScrapingWebsite ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Analyze Brand
                </>
              )}
            </Button>
          </div>

          {brandData && (
            <div className="mt-4 p-4 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-semibold text-green-700 dark:text-green-400">Brand Analyzed!</span>
              </div>
              <div className="space-y-1 text-sm">
                <p><strong>Brand:</strong> {brandData.title || 'Unknown'}</p>
                <p><strong>Description:</strong> {brandData.description?.substring(0, 150) || 'No description found'}...</p>
                {brandData.branding?.colors && (
                  <div className="flex items-center gap-2">
                    <strong>Brand Colors:</strong>
                    <div className="flex gap-1">
                      {brandData.branding.colors.slice(0, 5).map((color, i) => (
                        <div 
                          key={i} 
                          className="w-6 h-6 rounded border"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Platform Selection */}
      {brandData && (
        <Card className="border-2 border-dashed border-pink-200 dark:border-pink-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-pink-500" />
              Step 2: Select Platforms
            </CardTitle>
            <CardDescription>
              Choose which social media platforms you want to create ads for
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {PLATFORMS.map(platform => {
                const isSelected = selectedPlatforms.includes(platform.id);
                const Icon = platform.icon;
                return (
                  <button
                    key={platform.id}
                    onClick={() => togglePlatform(platform.id)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      isSelected 
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30' 
                        : 'border-muted hover:border-purple-300'
                    }`}
                  >
                    <div className={`w-10 h-10 mx-auto rounded-lg ${platform.color} flex items-center justify-center mb-2`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <p className="text-sm font-medium text-center">{platform.name}</p>
                    {isSelected && (
                      <CheckCircle className="h-4 w-4 text-purple-500 mx-auto mt-1" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Cost: {selectedPlatforms.length * AD_CREDIT_COST} credits ({AD_CREDIT_COST} per platform)
              </p>
              <Button
                onClick={handleGenerateAds}
                disabled={isGeneratingAds || selectedPlatforms.length === 0}
                className="bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600"
              >
                {isGeneratingAds ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating Ads...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Ads
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Generated Ads */}
      {generatedAds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-orange-500" />
              Step 3: Edit & Launch
            </CardTitle>
            <CardDescription>
              Customize the ads to your liking, generate images, and publish when ready
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {generatedAds.map(ad => {
                const platform = getPlatformInfo(ad.platform);
                const Icon = platform.icon;
                return (
                  <Card key={ad.id} className="overflow-hidden">
                    <div className={`p-3 ${platform.color} text-white flex items-center gap-2`}>
                      <Icon className="h-5 w-5" />
                      <span className="font-semibold">{platform.name}</span>
                    </div>
                    <CardContent className="p-4 space-y-3">
                      <div>
                        <p className="font-bold text-lg">{ad.headline}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{ad.primaryText}</p>
                      </div>
                      <div>
                        <p className="text-sm">{ad.description}</p>
                      </div>
                      <div>
                        <Badge variant="secondary">{ad.callToAction}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {ad.hashtags.map((tag, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      {/* Generated Image */}
                      {ad.generatedImageUrl && (
                        <div className="relative">
                          <img 
                            src={ad.generatedImageUrl} 
                            alt="Generated ad" 
                            className="w-full rounded-lg"
                          />
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-2 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditAd(ad)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleGenerateImage(ad)}
                          disabled={isGeneratingImage === ad.id}
                        >
                          {isGeneratingImage === ad.id ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Image className="h-4 w-4 mr-1" />
                          )}
                          Image
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopyAd(ad)}
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Copy
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteAd(ad.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Regenerate Button */}
            <div className="mt-4 text-center">
              <Button
                onClick={handleGenerateAds}
                variant="outline"
                disabled={isGeneratingAds}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isGeneratingAds ? 'animate-spin' : ''}`} />
                Generate More Ideas
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Ad</DialogTitle>
            <DialogDescription>
              Customize this ad to perfectly match your brand voice
            </DialogDescription>
          </DialogHeader>
          {editingAd && (
            <div className="space-y-4">
              <div>
                <Label>Headline</Label>
                <Input
                  value={editingAd.headline}
                  onChange={(e) => setEditingAd({ ...editingAd, headline: e.target.value })}
                />
              </div>
              <div>
                <Label>Primary Text</Label>
                <Textarea
                  value={editingAd.primaryText}
                  onChange={(e) => setEditingAd({ ...editingAd, primaryText: e.target.value })}
                  rows={3}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={editingAd.description}
                  onChange={(e) => setEditingAd({ ...editingAd, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div>
                <Label>Call to Action</Label>
                <Input
                  value={editingAd.callToAction}
                  onChange={(e) => setEditingAd({ ...editingAd, callToAction: e.target.value })}
                />
              </div>
              <div>
                <Label>Image Prompt (for AI generation)</Label>
                <Textarea
                  value={editingAd.imagePrompt}
                  onChange={(e) => setEditingAd({ ...editingAd, imagePrompt: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdsMaker;
