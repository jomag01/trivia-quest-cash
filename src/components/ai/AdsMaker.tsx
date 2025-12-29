import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAICredits } from '@/hooks/useAICredits';
import { 
  Globe, Loader2, Sparkles, Copy, Download, Edit, Send, 
  Facebook, Instagram, Twitter, Linkedin, Youtube, Music2,
  Image, RefreshCw, Trash2, CheckCircle, Megaphone, Palette,
  Video, Upload, Wand2, Share2, ExternalLink, Play, ImagePlus,
  FileImage, Film, Smartphone, Monitor, Tablet
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
  generatedVideoUrl?: string;
  adType: 'image' | 'video';
}

const PLATFORMS = [
  { id: 'facebook', name: 'Facebook', icon: Facebook, gradient: 'from-blue-500 to-blue-700' },
  { id: 'instagram', name: 'Instagram', icon: Instagram, gradient: 'from-purple-500 via-pink-500 to-orange-500' },
  { id: 'twitter', name: 'Twitter/X', icon: Twitter, gradient: 'from-gray-800 to-black' },
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, gradient: 'from-blue-600 to-blue-800' },
  { id: 'youtube', name: 'YouTube', icon: Youtube, gradient: 'from-red-500 to-red-700' },
  { id: 'tiktok', name: 'TikTok', icon: Music2, gradient: 'from-pink-500 via-purple-500 to-cyan-500' },
];

const AD_CREDIT_COST = 3;
const VIDEO_CREDIT_COST = 5;

const AdsMaker: React.FC<AdsMakerProps> = ({ userCredits, onCreditsChange }) => {
  const { user } = useAuth();
  const { 
    credits: aiCredits, 
    loading: aiCreditsLoading, 
    refetch: refetchAICredits,
    deductImageCredit
  } = useAICredits();
  
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isScrapingWebsite, setIsScrapingWebsite] = useState(false);
  const [brandData, setBrandData] = useState<BrandData | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['facebook', 'instagram']);
  const [isGeneratingAds, setIsGeneratingAds] = useState(false);
  const [generatedAds, setGeneratedAds] = useState<GeneratedAd[]>([]);
  const [editingAd, setEditingAd] = useState<GeneratedAd | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState<string | null>(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState<string | null>(null);
  const [adType, setAdType] = useState<'image' | 'video'>('image');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [selectedAdForPublish, setSelectedAdForPublish] = useState<GeneratedAd | null>(null);
  const [aiSuggestedImages, setAiSuggestedImages] = useState<string[]>([]);
  const [isGeneratingAISuggestions, setIsGeneratingAISuggestions] = useState(false);
  const [selectedProductImage, setSelectedProductImage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const totalAvailableCredits = (aiCredits?.total_credits || 0) + userCredits;
  const videoMinutesAvailable = aiCredits?.video_minutes_available || 0;

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
        toast.success('Website analyzed successfully!');
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingImage(true);
    try {
      const newImages: string[] = [];
      
      for (const file of Array.from(files)) {
        const reader = new FileReader();
        const imageUrl = await new Promise<string>((resolve) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });
        newImages.push(imageUrl);
      }
      
      setUploadedImages(prev => [...prev, ...newImages]);
      toast.success(`${newImages.length} image(s) uploaded!`);
    } catch (error) {
      toast.error('Failed to upload images');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleGenerateAISuggestions = async () => {
    if (!brandData) {
      toast.error('Please analyze your website first');
      return;
    }

    const hasImageCredits = aiCredits && aiCredits.images_available > 0;
    if (!hasImageCredits && userCredits < 3) {
      toast.error('Insufficient credits for AI image suggestions (3 credits needed)');
      return;
    }

    setIsGeneratingAISuggestions(true);
    try {
      const suggestions: string[] = [];
      
      // Generate 3 AI image suggestions
      for (let i = 0; i < 3; i++) {
        const prompts = [
          `Professional product showcase for ${brandData.title}, modern e-commerce style, clean white background, studio lighting`,
          `Lifestyle advertisement for ${brandData.title}, people using product, warm natural lighting, authentic moment`,
          `Bold promotional banner for ${brandData.title}, vibrant colors, dynamic composition, call to action style`
        ];
        
        const { data, error } = await supabase.functions.invoke('ai-generate', {
          body: {
            type: 'text-to-image',
            prompt: prompts[i],
          }
        });

        if (data?.imageUrl) {
          suggestions.push(data.imageUrl);
        }
      }
      
      setAiSuggestedImages(suggestions);
      if (hasImageCredits) {
        await deductImageCredit(3);
        refetchAICredits();
      }
      onCreditsChange();
      toast.success('AI image suggestions generated!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate suggestions');
    } finally {
      setIsGeneratingAISuggestions(false);
    }
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
    
    if (totalAvailableCredits < totalCost) {
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
        const adsWithType = data.ads.map((ad: any) => ({ ...ad, adType: adType }));
        setGeneratedAds(adsWithType);
        toast.success(`Generated ${data.ads.length} unique ad ideas!`);
        onCreditsChange();
        refetchAICredits();
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
    const hasImageCredits = aiCredits && aiCredits.images_available > 0;
    if (!hasImageCredits && userCredits < 1) {
      toast.error('Insufficient credits for image generation');
      return;
    }

    setIsGeneratingImage(ad.id);
    try {
      if (hasImageCredits) {
        await deductImageCredit(1);
        refetchAICredits();
      }
      
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

  const handleGenerateVideo = async (ad: GeneratedAd) => {
    if (videoMinutesAvailable < 0.1 && totalAvailableCredits < VIDEO_CREDIT_COST) {
      toast.error('Insufficient credits for video generation');
      return;
    }

    const imageToUse = selectedProductImage || ad.generatedImageUrl || uploadedImages[0];
    
    setIsGeneratingVideo(ad.id);
    try {
      const videoPrompt = `Create a dynamic ${ad.platform} video advertisement: ${ad.headline}. ${ad.primaryText}. Style: Professional marketing video, engaging motion graphics, bold text overlays. ${imageToUse ? 'Incorporate product imagery.' : ''}`;
      
      const { data, error } = await supabase.functions.invoke('text-to-video', {
        body: {
          prompt: videoPrompt,
          duration: 5,
          aspectRatio: ad.platform === 'tiktok' || ad.platform === 'instagram' ? '9:16' : '16:9',
        }
      });

      if (error) throw error;

      if (data?.videoUrl) {
        setGeneratedAds(prev => prev.map(a => 
          a.id === ad.id ? { ...a, generatedVideoUrl: data.videoUrl, adType: 'video' } : a
        ));
        toast.success('Video ad generated!');
        onCreditsChange();
        refetchAICredits();
      }
    } catch (error: any) {
      console.error('Generate video error:', error);
      toast.error(error.message || 'Failed to generate video');
    } finally {
      setIsGeneratingVideo(null);
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

  const handleDownloadAd = async (ad: GeneratedAd) => {
    const mediaUrl = ad.generatedVideoUrl || ad.generatedImageUrl;
    if (!mediaUrl) {
      toast.error('No media to download. Generate an image or video first.');
      return;
    }

    try {
      const response = await fetch(mediaUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${ad.platform}-ad-${ad.id}.${ad.generatedVideoUrl ? 'mp4' : 'png'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Download started!');
    } catch (error) {
      toast.error('Failed to download. Try right-clicking and saving directly.');
    }
  };

  const handlePublishAd = (ad: GeneratedAd) => {
    setSelectedAdForPublish(ad);
    setPublishDialogOpen(true);
  };

  const handleShareToSocial = async (platform: string) => {
    if (!selectedAdForPublish) return;
    
    const adText = `${selectedAdForPublish.headline}\n\n${selectedAdForPublish.primaryText}\n\n${selectedAdForPublish.hashtags.join(' ')}`;
    const mediaUrl = selectedAdForPublish.generatedVideoUrl || selectedAdForPublish.generatedImageUrl;
    
    const shareUrls: Record<string, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(adText)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(adText)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(brandData?.url || '')}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(adText + (mediaUrl ? '\n\n' + mediaUrl : ''))}`,
    };
    
    if (shareUrls[platform]) {
      window.open(shareUrls[platform], '_blank', 'width=600,height=400');
      toast.success(`Opening ${platform} to share your ad...`);
    }
    
    setPublishDialogOpen(false);
  };

  const handleDeleteAd = (adId: string) => {
    setGeneratedAds(prev => prev.filter(a => a.id !== adId));
    toast.success('Ad removed');
  };

  const getPlatformInfo = (platformId: string) => {
    return PLATFORMS.find(p => p.id === platformId) || PLATFORMS[0];
  };

  return (
    <div className="space-y-6 p-2 md:p-4">
      {/* Colorful Header */}
      <div className="text-center space-y-4 py-6 px-4 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 text-white shadow-xl">
        <div className="flex items-center justify-center gap-3">
          <div className="p-4 rounded-2xl bg-white/20 backdrop-blur-sm">
            <Megaphone className="h-10 w-10 text-white" />
          </div>
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
          TriviaBees AI Ads Maker
        </h1>
        <p className="text-white/90 max-w-2xl mx-auto text-sm md:text-base">
          Create stunning image & video ads for all social media platforms. 
          Upload your products or let AI suggest visuals for you!
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Badge className="bg-white/20 text-white border-white/30 px-4 py-2">
            <Image className="h-4 w-4 mr-2" />
            Image Ads
          </Badge>
          <Badge className="bg-white/20 text-white border-white/30 px-4 py-2">
            <Video className="h-4 w-4 mr-2" />
            Video Ads
          </Badge>
          <Badge className="bg-white/20 text-white border-white/30 px-4 py-2">
            <Share2 className="h-4 w-4 mr-2" />
            Direct Publish
          </Badge>
        </div>
      </div>

      {/* Step 1: Website Input */}
      <Card className="border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 shadow-lg overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-purple-500 to-pink-500" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Globe className="h-5 w-5 text-purple-500" />
            </div>
            Step 1: Enter Your Website
          </CardTitle>
          <CardDescription>
            Drop your website link and our AI will analyze your brand
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="https://yourwebsite.com"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              className="flex-1 border-purple-200 focus:border-purple-500 bg-white dark:bg-gray-900"
            />
            <Button 
              onClick={handleScrapeWebsite}
              disabled={isScrapingWebsite || !websiteUrl.trim()}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg"
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
            <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 border border-green-300 dark:border-green-700">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1 rounded-full bg-green-500">
                  <CheckCircle className="h-4 w-4 text-white" />
                </div>
                <span className="font-bold text-green-700 dark:text-green-400">Brand Analyzed Successfully!</span>
              </div>
              <div className="space-y-2 text-sm">
                <p className="font-medium text-green-800 dark:text-green-300">{brandData.title || 'Unknown Brand'}</p>
                <p className="text-green-700 dark:text-green-400">{brandData.description?.substring(0, 150) || 'No description found'}...</p>
                {brandData.branding?.colors && brandData.branding.colors.length > 0 && (
                  <div className="flex items-center gap-2 pt-2">
                    <span className="font-medium text-green-800 dark:text-green-300">Brand Colors:</span>
                    <div className="flex gap-1">
                      {brandData.branding.colors.slice(0, 5).map((color, i) => (
                        <div 
                          key={i} 
                          className="w-6 h-6 rounded-md border-2 border-white shadow-sm"
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

      {/* Step 2: Ad Type & Product Images */}
      {brandData && (
        <Card className="border-2 border-pink-200 dark:border-pink-800 bg-gradient-to-br from-pink-50 to-orange-50 dark:from-pink-950/30 dark:to-orange-950/30 shadow-lg overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-pink-500 to-orange-500" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-pink-700 dark:text-pink-300">
              <div className="p-2 rounded-lg bg-pink-500/10">
                <Film className="h-5 w-5 text-pink-500" />
              </div>
              Step 2: Choose Ad Type & Upload Product Images
            </CardTitle>
            <CardDescription>
              Select image or video ads and add your product visuals
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Ad Type Selection */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setAdType('image')}
                className={`p-6 rounded-xl border-2 transition-all ${
                  adType === 'image' 
                    ? 'border-pink-500 bg-pink-100 dark:bg-pink-900/40 shadow-lg scale-[1.02]' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-pink-300'
                }`}
              >
                <div className="flex flex-col items-center gap-3">
                  <div className={`p-4 rounded-xl ${adType === 'image' ? 'bg-gradient-to-r from-pink-500 to-orange-500' : 'bg-gray-200 dark:bg-gray-700'}`}>
                    <Image className={`h-8 w-8 ${adType === 'image' ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`} />
                  </div>
                  <div>
                    <p className="font-bold text-lg">Image Ads</p>
                    <p className="text-xs text-muted-foreground">{AD_CREDIT_COST} credits/platform</p>
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => setAdType('video')}
                className={`p-6 rounded-xl border-2 transition-all ${
                  adType === 'video' 
                    ? 'border-purple-500 bg-purple-100 dark:bg-purple-900/40 shadow-lg scale-[1.02]' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                }`}
              >
                <div className="flex flex-col items-center gap-3">
                  <div className={`p-4 rounded-xl ${adType === 'video' ? 'bg-gradient-to-r from-purple-500 to-cyan-500' : 'bg-gray-200 dark:bg-gray-700'}`}>
                    <Video className={`h-8 w-8 ${adType === 'video' ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`} />
                  </div>
                  <div>
                    <p className="font-bold text-lg">Video Ads</p>
                    <p className="text-xs text-muted-foreground">{VIDEO_CREDIT_COST} credits/video</p>
                  </div>
                </div>
              </button>
            </div>

            {/* Product Images Section */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Product Images (Optional for Video Ads)</Label>
              
              <Tabs defaultValue="upload" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-gradient-to-r from-pink-100 to-orange-100 dark:from-pink-900/30 dark:to-orange-900/30">
                  <TabsTrigger value="upload" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Yours
                  </TabsTrigger>
                  <TabsTrigger value="ai" className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800">
                    <Wand2 className="h-4 w-4 mr-2" />
                    AI Suggestions
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="upload" className="space-y-4 mt-4">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-pink-300 dark:border-pink-700 rounded-xl p-8 text-center cursor-pointer hover:border-pink-500 hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-all"
                  >
                    <ImagePlus className="h-12 w-12 mx-auto text-pink-400 mb-3" />
                    <p className="font-medium text-pink-700 dark:text-pink-300">Click to upload product images</p>
                    <p className="text-sm text-muted-foreground">PNG, JPG up to 10MB each</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>
                  
                  {uploadedImages.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                      {uploadedImages.map((img, i) => (
                        <div 
                          key={i} 
                          onClick={() => setSelectedProductImage(img)}
                          className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                            selectedProductImage === img ? 'border-pink-500 ring-2 ring-pink-500 scale-105' : 'border-transparent hover:border-pink-300'
                          }`}
                        >
                          <img src={img} alt={`Product ${i + 1}`} className="w-full h-full object-cover" />
                          {selectedProductImage === img && (
                            <div className="absolute inset-0 bg-pink-500/20 flex items-center justify-center">
                              <CheckCircle className="h-6 w-6 text-white" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="ai" className="space-y-4 mt-4">
                  <Button
                    onClick={handleGenerateAISuggestions}
                    disabled={isGeneratingAISuggestions}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    {isGeneratingAISuggestions ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating AI Suggestions...
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4 mr-2" />
                        Generate 3 AI Image Suggestions (3 credits)
                      </>
                    )}
                  </Button>
                  
                  {aiSuggestedImages.length > 0 && (
                    <div className="grid grid-cols-3 gap-3">
                      {aiSuggestedImages.map((img, i) => (
                        <div 
                          key={i}
                          onClick={() => setSelectedProductImage(img)}
                          className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                            selectedProductImage === img ? 'border-purple-500 ring-2 ring-purple-500 scale-105' : 'border-transparent hover:border-purple-300'
                          }`}
                        >
                          <img src={img} alt={`AI Suggestion ${i + 1}`} className="w-full h-full object-cover" />
                          {selectedProductImage === img && (
                            <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center">
                              <CheckCircle className="h-6 w-6 text-white" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Platform Selection */}
      {brandData && (
        <Card className="border-2 border-orange-200 dark:border-orange-800 bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-950/30 dark:to-yellow-950/30 shadow-lg overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-orange-500 to-yellow-500" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Palette className="h-5 w-5 text-orange-500" />
              </div>
              Step 3: Select Platforms
            </CardTitle>
            <CardDescription>
              Choose which social media platforms you want to create ads for
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {PLATFORMS.map(platform => {
                const isSelected = selectedPlatforms.includes(platform.id);
                const Icon = platform.icon;
                return (
                  <button
                    key={platform.id}
                    onClick={() => togglePlatform(platform.id)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      isSelected 
                        ? 'border-orange-500 bg-orange-100 dark:bg-orange-900/40 shadow-lg scale-105' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-orange-300'
                    }`}
                  >
                    <div className={`w-12 h-12 mx-auto rounded-xl bg-gradient-to-r ${platform.gradient} flex items-center justify-center mb-2 shadow-md`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <p className="text-sm font-medium text-center">{platform.name}</p>
                    {isSelected && (
                      <CheckCircle className="h-4 w-4 text-orange-500 mx-auto mt-1" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-orange-100 to-yellow-100 dark:from-orange-900/30 dark:to-yellow-900/30 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-orange-800 dark:text-orange-300">
                  Cost: {selectedPlatforms.length * AD_CREDIT_COST} credits
                </p>
                <p className="text-sm text-orange-600 dark:text-orange-400">
                  {AD_CREDIT_COST} credits per platform × {selectedPlatforms.length} platforms
                </p>
              </div>
              <Button
                onClick={handleGenerateAds}
                disabled={isGeneratingAds || selectedPlatforms.length === 0}
                size="lg"
                className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white shadow-lg"
              >
                {isGeneratingAds ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Generating Ads...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-2" />
                    Generate {adType === 'video' ? 'Video' : 'Image'} Ads
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Generated Ads */}
      {generatedAds.length > 0 && (
        <Card className="border-2 border-cyan-200 dark:border-cyan-800 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/30 shadow-lg overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-cyan-500 to-blue-500" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-cyan-700 dark:text-cyan-300">
              <div className="p-2 rounded-lg bg-cyan-500/10">
                <Megaphone className="h-5 w-5 text-cyan-500" />
              </div>
              Step 4: Review, Edit & Publish Your Ads
            </CardTitle>
            <CardDescription>
              Customize the ads to your liking, generate media, and publish when ready
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              {generatedAds.map(ad => {
                const platform = getPlatformInfo(ad.platform);
                const Icon = platform.icon;
                return (
                  <Card key={ad.id} className="overflow-hidden shadow-lg border-0">
                    <div className={`p-4 bg-gradient-to-r ${platform.gradient} text-white flex items-center justify-between`}>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg">
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="font-bold">{platform.name}</span>
                      </div>
                      <Badge className={`${ad.adType === 'video' ? 'bg-purple-500' : 'bg-pink-500'} text-white`}>
                        {ad.adType === 'video' ? <Video className="h-3 w-3 mr-1" /> : <Image className="h-3 w-3 mr-1" />}
                        {ad.adType}
                      </Badge>
                    </div>
                    <CardContent className="p-5 space-y-4 bg-white dark:bg-gray-900">
                      <div>
                        <p className="font-bold text-xl text-gray-800 dark:text-white">{ad.headline}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{ad.primaryText}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{ad.description}</p>
                      </div>
                      <div>
                        <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2">
                          {ad.callToAction}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {ad.hashtags.map((tag, i) => (
                          <Badge key={i} variant="outline" className="text-xs border-cyan-300 text-cyan-700 dark:text-cyan-400">
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      {/* Generated Media */}
                      {ad.generatedVideoUrl && (
                        <div className="relative rounded-xl overflow-hidden">
                          <video 
                            src={ad.generatedVideoUrl} 
                            controls
                            className="w-full rounded-xl"
                          />
                          <div className="absolute top-2 right-2">
                            <Badge className="bg-purple-500 text-white">
                              <Play className="h-3 w-3 mr-1" /> Video
                            </Badge>
                          </div>
                        </div>
                      )}
                      
                      {ad.generatedImageUrl && !ad.generatedVideoUrl && (
                        <div className="relative rounded-xl overflow-hidden">
                          <img 
                            src={ad.generatedImageUrl} 
                            alt="Generated ad" 
                            className="w-full rounded-xl"
                          />
                        </div>
                      )}

                      {/* Actions Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditAd(ad)}
                          className="border-gray-300"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleGenerateImage(ad)}
                          disabled={isGeneratingImage === ad.id}
                          className="bg-gradient-to-r from-pink-500 to-orange-500 text-white"
                        >
                          {isGeneratingImage === ad.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Image className="h-4 w-4 mr-1" />
                              Image
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleGenerateVideo(ad)}
                          disabled={isGeneratingVideo === ad.id}
                          className="bg-gradient-to-r from-purple-500 to-cyan-500 text-white"
                        >
                          {isGeneratingVideo === ad.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Video className="h-4 w-4 mr-1" />
                              Video
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopyAd(ad)}
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Copy
                        </Button>
                      </div>
                      
                      {/* Publish & Download Row */}
                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleDownloadAd(ad)}
                          disabled={!ad.generatedImageUrl && !ad.generatedVideoUrl}
                          className="bg-gradient-to-r from-green-500 to-emerald-500 text-white"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handlePublishAd(ad)}
                          className="bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                        >
                          <Share2 className="h-4 w-4 mr-1" />
                          Publish
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteAd(ad.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
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
            <div className="mt-6 text-center">
              <Button
                onClick={handleGenerateAds}
                variant="outline"
                disabled={isGeneratingAds}
                className="border-cyan-300 text-cyan-700 hover:bg-cyan-50"
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-purple-500" />
              Edit Ad Content
            </DialogTitle>
            <DialogDescription>
              Customize this ad to perfectly match your brand voice
            </DialogDescription>
          </DialogHeader>
          {editingAd && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-semibold">Headline</Label>
                <Input
                  value={editingAd.headline}
                  onChange={(e) => setEditingAd({ ...editingAd, headline: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold">Primary Text</Label>
                <Textarea
                  value={editingAd.primaryText}
                  onChange={(e) => setEditingAd({ ...editingAd, primaryText: e.target.value })}
                  rows={3}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold">Description</Label>
                <Textarea
                  value={editingAd.description}
                  onChange={(e) => setEditingAd({ ...editingAd, description: e.target.value })}
                  rows={2}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold">Call to Action</Label>
                <Input
                  value={editingAd.callToAction}
                  onChange={(e) => setEditingAd({ ...editingAd, callToAction: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold">Image/Video Prompt (for AI generation)</Label>
                <Textarea
                  value={editingAd.imagePrompt}
                  onChange={(e) => setEditingAd({ ...editingAd, imagePrompt: e.target.value })}
                  rows={2}
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveEdit}
                  className="bg-gradient-to-r from-purple-500 to-pink-500"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Publish Dialog */}
      <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-blue-500" />
              Publish Your Ad
            </DialogTitle>
            <DialogDescription>
              Share your ad directly to social media platforms
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 pt-4">
            <Button
              onClick={() => handleShareToSocial('facebook')}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Facebook className="h-5 w-5 mr-2" />
              Facebook
            </Button>
            <Button
              onClick={() => handleShareToSocial('twitter')}
              className="bg-black hover:bg-gray-800 text-white"
            >
              <Twitter className="h-5 w-5 mr-2" />
              Twitter/X
            </Button>
            <Button
              onClick={() => handleShareToSocial('linkedin')}
              className="bg-blue-700 hover:bg-blue-800 text-white"
            >
              <Linkedin className="h-5 w-5 mr-2" />
              LinkedIn
            </Button>
            <Button
              onClick={() => handleShareToSocial('whatsapp')}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              <Send className="h-5 w-5 mr-2" />
              WhatsApp
            </Button>
          </div>
          <div className="pt-4 border-t mt-4">
            <p className="text-sm text-muted-foreground text-center">
              Tip: Download your ad media first, then attach it manually when the social media page opens.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdsMaker;
