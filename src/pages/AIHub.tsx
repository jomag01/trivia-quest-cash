import React, { useState, useEffect, memo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import BuyAICreditsDialog from '@/components/ai/BuyAICreditsDialog';
import ContentCreator from '@/components/ai/ContentCreator';
import { ImageIcon, VideoIcon, TypeIcon, Sparkles, Upload, Loader2, Download, Copy, Wand2, Crown, X, ImagePlus, ShoppingCart, Film, Music, Play, Pause, Megaphone } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
const AIHub = memo(() => {
  const {
    user,
    profile
  } = useAuth();
  const [activeTab, setActiveTab] = useState('text-to-image');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [imageDescription, setImageDescription] = useState<string | null>(null);
  const [uploadedVideo, setUploadedVideo] = useState<string | null>(null);
  const [videoDescription, setVideoDescription] = useState<string | null>(null);
  const [videoPrompt, setVideoPrompt] = useState('');
  const [adPreset, setAdPreset] = useState<string>('none');

  // Ad presets with dimensions and prompt enhancements
  const AD_PRESETS = {
    none: { label: 'No Preset', dimensions: '', promptSuffix: '' },
    'facebook-feed': { label: 'Facebook Feed Ad (1200x628)', dimensions: '1200x628', promptSuffix: ', optimized for Facebook feed advertisement, eye-catching, professional marketing design, clean layout with space for text overlay' },
    'facebook-story': { label: 'Facebook/IG Story (1080x1920)', dimensions: '1080x1920', promptSuffix: ', vertical format for Stories, bold visuals, mobile-optimized advertisement design, engaging and scroll-stopping' },
    'instagram-square': { label: 'Instagram Square (1080x1080)', dimensions: '1080x1080', promptSuffix: ', square format for Instagram, vibrant colors, lifestyle aesthetic, professional product photography style' },
    'instagram-post': { label: 'Instagram Post (1080x1350)', dimensions: '1080x1350', promptSuffix: ', portrait format for Instagram feed, trendy aesthetic, high engagement design, influencer-style visual' },
    'youtube-thumbnail': { label: 'YouTube Thumbnail (1280x720)', dimensions: '1280x720', promptSuffix: ', YouTube thumbnail style, high contrast, bold and dramatic, attention-grabbing with clear focal point' },
    'youtube-banner': { label: 'YouTube Banner (2560x1440)', dimensions: '2560x1440', promptSuffix: ', YouTube channel art banner, wide panoramic format, professional branding design' },
    'google-display': { label: 'Google Display Ad (300x250)', dimensions: '300x250', promptSuffix: ', Google display advertisement format, clean and professional, clear call-to-action space, corporate design' },
    'google-leaderboard': { label: 'Google Leaderboard (728x90)', dimensions: '728x90', promptSuffix: ', horizontal banner advertisement, website header ad format, minimal but impactful design' },
    'linkedin-sponsored': { label: 'LinkedIn Sponsored (1200x627)', dimensions: '1200x627', promptSuffix: ', LinkedIn professional advertisement, corporate and business style, trustworthy and authoritative design' },
    'twitter-post': { label: 'Twitter/X Post (1600x900)', dimensions: '1600x900', promptSuffix: ', Twitter post image, trending visual style, shareable and viral-worthy design' },
    'tiktok-ad': { label: 'TikTok Ad (1080x1920)', dimensions: '1080x1920', promptSuffix: ', TikTok vertical format, Gen-Z aesthetic, trendy and dynamic, bold colors and modern design' },
    'pinterest-pin': { label: 'Pinterest Pin (1000x1500)', dimensions: '1000x1500', promptSuffix: ', Pinterest pin format, aesthetic and inspirational, lifestyle imagery, save-worthy visual' },
  };

  // Music generation
  const [musicPrompt, setMusicPrompt] = useState('');
  const [generatedMusic, setGeneratedMusic] = useState<string | null>(null);
  const [musicTitle, setMusicTitle] = useState<string | null>(null);
  const [isInstrumental, setIsInstrumental] = useState(false);
  const [musicCreditCost] = useState(5);

  // Usage tracking
  const [imageGenerationCount, setImageGenerationCount] = useState(0);
  const [freeImageLimit, setFreeImageLimit] = useState(3);
  const [videoCreditCost, setVideoCreditCost] = useState(10);
  const [creditToDiamondRate, setCreditToDiamondRate] = useState(10);
  const [userCredits, setUserCredits] = useState(0);

  // Logo and dialogs
  const [appLogo, setAppLogo] = useState<string | null>(null);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  useEffect(() => {
    fetchSettings();
    fetchAppLogo();
    if (user) {
      fetchUsageStats();
      fetchUserCredits();
    }
  }, [user]);
  const fetchAppLogo = async () => {
    try {
      const {
        data
      } = await supabase.from('app_settings').select('value').eq('key', 'app_logo').maybeSingle();
      if (data?.value) {
        setAppLogo(data.value);
      }
    } catch (error) {
      console.error('Error fetching app logo:', error);
    }
  };
  const fetchSettings = async () => {
    try {
      const {
        data
      } = await supabase.from('app_settings').select('key, value').in('key', ['ai_free_image_limit', 'ai_video_credit_cost', 'ai_credit_to_diamond_rate']);
      data?.forEach(setting => {
        if (setting.key === 'ai_free_image_limit') {
          setFreeImageLimit(parseInt(setting.value || '3'));
        } else if (setting.key === 'ai_video_credit_cost') {
          setVideoCreditCost(parseInt(setting.value || '10'));
        } else if (setting.key === 'ai_credit_to_diamond_rate') {
          setCreditToDiamondRate(parseInt(setting.value || '10'));
        }
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };
  const fetchUsageStats = async () => {
    if (!user) return;
    try {
      const {
        count
      } = await supabase.from('ai_generations').select('*', {
        count: 'exact',
        head: true
      }).eq('user_id', user.id).eq('generation_type', 'text-to-image');
      setImageGenerationCount(count || 0);
    } catch (error) {
      console.error('Error fetching usage stats:', error);
    }
  };
  const fetchUserCredits = async () => {
    if (!user) return;
    try {
      const {
        data
      } = await supabase.from('profiles').select('credits').eq('id', user.id).single();
      setUserCredits(data?.credits || 0);
    } catch (error) {
      console.error('Error fetching credits:', error);
    }
  };
  const canGenerateImage = () => {
    if (!user) return false;
    return imageGenerationCount < freeImageLimit || userCredits > 0;
  };
  const canGenerateVideo = () => {
    if (!user) return false;
    return userCredits >= videoCreditCost;
  };
  const trackGeneration = async (type: string, creditsUsed: number = 0) => {
    if (!user) return;
    try {
      await supabase.from('ai_generations').insert({
        user_id: user.id,
        generation_type: type,
        prompt: prompt,
        credits_used: creditsUsed
      });
    } catch (error) {
      console.error('Error tracking generation:', error);
    }
  };
  const deductCredits = async (amount: number) => {
    if (!user) return false;
    try {
      const {
        error
      } = await supabase.from('profiles').update({
        credits: userCredits - amount
      }).eq('id', user.id);
      if (error) throw error;
      setUserCredits(prev => prev - amount);
      return true;
    } catch (error) {
      console.error('Error deducting credits:', error);
      return false;
    }
  };
  const handleTextToImage = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }
    if (!user) {
      toast.error('Please login to generate images');
      return;
    }

    // Check if user has reached free limit
    if (imageGenerationCount >= freeImageLimit) {
      if (userCredits <= 0) {
        toast.error('You have reached your free image limit. Please buy credits to continue.');
        return;
      }
      // Deduct 1 credit for image generation beyond free limit
      const deducted = await deductCredits(1);
      if (!deducted) {
        toast.error('Failed to deduct credits');
        return;
      }
    }
    setIsGenerating(true);
    setGeneratedImage(null);
    try {
      // Build the final prompt with ad preset suffix
      const selectedPreset = AD_PRESETS[adPreset as keyof typeof AD_PRESETS];
      const finalPrompt = prompt.trim() + (selectedPreset?.promptSuffix || '');
      
      const {
        data,
        error
      } = await supabase.functions.invoke('ai-generate', {
        body: {
          type: 'text-to-image',
          prompt: finalPrompt,
          referenceImage: referenceImage,
          dimensions: selectedPreset?.dimensions || undefined
        }
      });
      if (error) throw error;
      if (data?.imageUrl) {
        setGeneratedImage(data.imageUrl);
        await trackGeneration('text-to-image', imageGenerationCount >= freeImageLimit ? 1 : 0);
        setImageGenerationCount(prev => prev + 1);
        toast.success('Image generated successfully!');
      } else {
        throw new Error('No image returned');
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error(error.message || 'Failed to generate image');
    } finally {
      setIsGenerating(false);
    }
  };
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'reference') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      if (type === 'image') {
        setUploadedImage(base64);
        setImageDescription(null);
      } else if (type === 'video') {
        setUploadedVideo(base64);
        setVideoDescription(null);
      } else if (type === 'reference') {
        setReferenceImage(base64);
      }
    };
    reader.readAsDataURL(file);
  };
  const handleImageToText = async () => {
    if (!uploadedImage) {
      toast.error('Please upload an image first');
      return;
    }
    setIsGenerating(true);
    setImageDescription(null);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('ai-generate', {
        body: {
          type: 'image-to-text',
          imageUrl: uploadedImage
        }
      });
      if (error) throw error;
      if (data?.description) {
        setImageDescription(data.description);
        toast.success('Image analyzed successfully!');
      } else {
        throw new Error('No description returned');
      }
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast.error(error.message || 'Failed to analyze image');
    } finally {
      setIsGenerating(false);
    }
  };
  const handleVideoToText = async () => {
    if (!uploadedVideo) {
      toast.error('Please upload a video first');
      return;
    }
    setIsGenerating(true);
    setVideoDescription(null);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('ai-generate', {
        body: {
          type: 'video-to-text',
          videoUrl: uploadedVideo
        }
      });
      if (error) throw error;
      if (data?.description) {
        setVideoDescription(data.description);
        toast.success('Video analyzed successfully!');
      } else {
        throw new Error('No description returned');
      }
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast.error(error.message || 'Failed to analyze video');
    } finally {
      setIsGenerating(false);
    }
  };
  const handleTextToVideo = async () => {
    if (!videoPrompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }
    if (!user) {
      toast.error('Please login to generate videos');
      return;
    }
    if (!canGenerateVideo()) {
      toast.error(`You need at least ${videoCreditCost} credits to generate a video`);
      setShowBuyCredits(true);
      return;
    }
    setIsGenerating(true);
    setGeneratedVideo(null);
    try {
      // Deduct credits first
      const deducted = await deductCredits(videoCreditCost);
      if (!deducted) {
        toast.error('Failed to deduct credits');
        return;
      }
      toast.info('Generating video... This may take a minute.');
      const {
        data,
        error
      } = await supabase.functions.invoke('text-to-video', {
        body: {
          prompt: videoPrompt.trim(),
          duration: 5
        }
      });
      if (error) throw error;
      if (data?.videoUrl) {
        setGeneratedVideo(data.videoUrl);
        await trackGeneration('text-to-video', videoCreditCost);
        toast.success('Video generated successfully!');
      } else if (data?.error) {
        throw new Error(data.error);
      } else {
        throw new Error('No video returned');
      }
    } catch (error: any) {
      console.error('Video generation error:', error);
      toast.error(error.message || 'Failed to generate video');
      // Refund credits on failure
      await supabase.from('profiles').update({
        credits: userCredits
      }).eq('id', user.id);
      fetchUserCredits();
    } finally {
      setIsGenerating(false);
    }
  };
  const handleGenerateMusic = async () => {
    if (!musicPrompt.trim()) {
      toast.error('Please enter a music description');
      return;
    }
    if (!user) {
      toast.error('Please login to generate music');
      return;
    }
    if (userCredits < musicCreditCost) {
      toast.error(`You need at least ${musicCreditCost} credits to generate music`);
      setShowBuyCredits(true);
      return;
    }
    setIsGenerating(true);
    setGeneratedMusic(null);
    setMusicTitle(null);
    try {
      const deducted = await deductCredits(musicCreditCost);
      if (!deducted) {
        toast.error('Failed to deduct credits');
        return;
      }
      toast.info('Generating music... This may take a minute.');
      const {
        data,
        error
      } = await supabase.functions.invoke('generate-music', {
        body: {
          prompt: musicPrompt.trim(),
          duration: 30,
          instrumental: isInstrumental
        }
      });
      if (error) throw error;
      if (data?.audioUrl) {
        setGeneratedMusic(data.audioUrl);
        setMusicTitle(data.title || 'AI Generated Music');
        await trackGeneration('text-to-music', musicCreditCost);
        toast.success('Music generated successfully!');
      } else if (data?.error) {
        throw new Error(data.error);
      } else {
        throw new Error('No audio returned');
      }
    } catch (error: any) {
      console.error('Music generation error:', error);
      toast.error(error.message || 'Failed to generate music');
      // Refund credits on failure
      await supabase.from('profiles').update({
        credits: userCredits
      }).eq('id', user.id);
      fetchUserCredits();
    } finally {
      setIsGenerating(false);
    }
  };
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };
  const downloadImage = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `ai-generated-${Date.now()}.png`;
    link.click();
  };
  const remainingFreeImages = Math.max(0, freeImageLimit - imageGenerationCount);

  // Login required wall for non-authenticated users
  if (!user) {
    return <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-4 rounded-full bg-primary/10">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Welcome to AI Hub</CardTitle>
            <CardDescription>
              Create stunning images, videos, and music with AI. Login or sign up to get started.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <ImageIcon className="h-4 w-4 text-primary" />
                <span>{freeImageLimit} free image generations</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <VideoIcon className="h-4 w-4 text-purple-500" />
                <span>AI video creation</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <Music className="h-4 w-4 text-pink-500" />
                <span>AI music generation</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <Film className="h-4 w-4 text-orange-500" />
                <span>Full content creator pipeline</span>
              </div>
            </div>
            <div className="pt-4 space-y-2">
              <Button className="w-full" asChild>
                <a href="/auth">Login to Get Started</a>
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Don't have an account? <a href="/auth" className="text-primary underline">Sign up</a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>;
  }
  return <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-24">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-purple-500/10 to-pink-500/10 blur-3xl" />
        <div className="relative container mx-auto px-4 py-12">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">AI-Powered Creation</span>
            </div>
            <div className="flex items-center justify-center gap-3">
              {appLogo && <img src={appLogo} alt="Logo" className="h-12 w-12 object-contain rounded-lg" />}
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">TRIVIABEES AI</h1>
            </div>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Transform your ideas into stunning visuals. Generate images from text, analyze images and videos with AI.
            </p>
            
            {/* Buy Credits Button */}
            <Button onClick={() => setShowBuyCredits(true)} variant="outline" className="gap-2">
              <ShoppingCart className="h-4 w-4" />
              Buy AI Credits
            </Button>
            
            {/* Usage Stats */}
            <div className="flex flex-wrap justify-center gap-4 mt-6">
              <Card className="px-4 py-2 bg-background/50 backdrop-blur-sm border-primary/20">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-primary" />
                  <span className="text-sm">
                    Free Images: <strong>{remainingFreeImages}/{freeImageLimit}</strong>
                  </span>
                </div>
                <Progress value={remainingFreeImages / freeImageLimit * 100} className="h-1 mt-1" />
              </Card>
              <Card className="px-4 py-2 bg-background/50 backdrop-blur-sm border-primary/20">
                <div className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm">
                    Credits: <strong>{userCredits}</strong>
                  </span>
                </div>
              </Card>
              <Card className="px-4 py-2 bg-background/50 backdrop-blur-sm border-primary/20">
                <div className="flex items-center gap-2">
                  <VideoIcon className="h-4 w-4 text-purple-500" />
                  <span className="text-sm">
                    Video Cost: <strong>{videoCreditCost} credits</strong>
                  </span>
                </div>
              </Card>
              <Card className="px-4 py-2 bg-background/50 backdrop-blur-sm border-yellow-500/20">
                <div className="flex items-center gap-2">
                  <span className="text-lg">💎</span>
                  <span className="text-sm">
                    Rate: <strong>{creditToDiamondRate} credits = 1 💎</strong>
                  </span>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 -mt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-6 w-full max-w-4xl mx-auto bg-background/50 backdrop-blur-sm border">
            <TabsTrigger value="text-to-image" className="gap-1 text-xs sm:text-sm">
              <Wand2 className="h-4 w-4" />
              <span className="hidden sm:inline">Image</span>
              <span className="sm:hidden">Img</span>
            </TabsTrigger>
            <TabsTrigger value="text-to-video" className="gap-1 text-xs sm:text-sm">
              <VideoIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Video</span>
              <span className="sm:hidden">Vid</span>
            </TabsTrigger>
            <TabsTrigger value="text-to-music" className="gap-1 text-xs sm:text-sm">
              <Music className="h-4 w-4" />
              <span className="hidden sm:inline">Music</span>
              <span className="sm:hidden">🎵</span>
            </TabsTrigger>
            <TabsTrigger value="image-to-text" className="gap-1 text-xs sm:text-sm">
              <ImageIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Analyze</span>
              <span className="sm:hidden">I→T</span>
            </TabsTrigger>
            <TabsTrigger value="video-to-text" className="gap-1 text-xs sm:text-sm">
              <TypeIcon className="h-4 w-4" />
              <span className="hidden sm:inline">V→Text</span>
              <span className="sm:hidden">V→T</span>
            </TabsTrigger>
            <TabsTrigger value="content-creator" className="gap-1 text-xs sm:text-sm">
              <Film className="h-4 w-4" />
              <span className="hidden sm:inline">Creator</span>
              <span className="sm:hidden">Create</span>
            </TabsTrigger>
          </TabsList>

          {/* Text to Image */}
          <TabsContent value="text-to-image">
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5 text-primary" />
                  Text to Image
                  {remainingFreeImages > 0 && <Badge variant="secondary" className="ml-2">
                      {remainingFreeImages} free left
                    </Badge>}
                </CardTitle>
                <CardDescription>
                  Describe what you want to create and let AI generate it for you. 
                  {remainingFreeImages === 0 && userCredits > 0 && <span className="text-amber-500"> (1 credit per image)</span>}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Your Prompt</Label>
                  <Textarea placeholder="A majestic dragon flying over a crystal lake at sunset, fantasy art style, highly detailed..." value={prompt} onChange={e => setPrompt(e.target.value)} className="min-h-[120px] resize-none" />
                </div>

                {/* Social Media Ad Preset */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Megaphone className="h-4 w-4" />
                    Social Media Ad Preset (Optional)
                  </Label>
                  <Select value={adPreset} onValueChange={setAdPreset}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select ad format..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Preset - Custom Image</SelectItem>
                      <SelectItem value="facebook-feed">📘 Facebook Feed Ad (1200x628)</SelectItem>
                      <SelectItem value="facebook-story">📱 Facebook/IG Story (1080x1920)</SelectItem>
                      <SelectItem value="instagram-square">📷 Instagram Square (1080x1080)</SelectItem>
                      <SelectItem value="instagram-post">📸 Instagram Post (1080x1350)</SelectItem>
                      <SelectItem value="youtube-thumbnail">▶️ YouTube Thumbnail (1280x720)</SelectItem>
                      <SelectItem value="youtube-banner">🎬 YouTube Banner (2560x1440)</SelectItem>
                      <SelectItem value="google-display">🔍 Google Display Ad (300x250)</SelectItem>
                      <SelectItem value="google-leaderboard">📊 Google Leaderboard (728x90)</SelectItem>
                      <SelectItem value="linkedin-sponsored">💼 LinkedIn Sponsored (1200x627)</SelectItem>
                      <SelectItem value="twitter-post">🐦 Twitter/X Post (1600x900)</SelectItem>
                      <SelectItem value="tiktok-ad">🎵 TikTok Ad (1080x1920)</SelectItem>
                      <SelectItem value="pinterest-pin">📌 Pinterest Pin (1000x1500)</SelectItem>
                    </SelectContent>
                  </Select>
                  {adPreset !== 'none' && (
                    <p className="text-xs text-muted-foreground">
                      AI will optimize your image for {AD_PRESETS[adPreset as keyof typeof AD_PRESETS]?.label}
                    </p>
                  )}
                </div>

                {/* Reference Image Upload */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <ImagePlus className="h-4 w-4" />
                    Reference Image (Optional)
                  </Label>
                  <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                    <Input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'reference')} className="hidden" id="reference-upload" />
                    <label htmlFor="reference-upload" className="cursor-pointer">
                      {referenceImage ? <div className="relative inline-block">
                          <img src={referenceImage} alt="Reference" className="max-h-32 rounded-lg" />
                          <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6" onClick={e => {
                        e.preventDefault();
                        setReferenceImage(null);
                      }}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div> : <div className="flex flex-col items-center gap-2 py-2">
                          <Upload className="h-8 w-8 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">
                            Add a reference image to guide the AI
                          </p>
                        </div>}
                    </label>
                  </div>
                </div>

                {!user && <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-sm text-amber-600">
                      Please login to generate images
                    </p>
                  </div>}

                {user && !canGenerateImage() && <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-sm text-amber-600">
                      You've used all {freeImageLimit} free images. Buy credits to continue generating!
                    </p>
                  </div>}

                <Button onClick={handleTextToImage} disabled={isGenerating || !prompt.trim() || !canGenerateImage()} className="w-full gap-2" size="lg">
                  {isGenerating ? <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating...
                    </> : <>
                      <Sparkles className="h-4 w-4" />
                      Generate Image
                      {remainingFreeImages === 0 && userCredits > 0 && <Badge variant="outline" className="ml-2">1 credit</Badge>}
                    </>}
                </Button>

                {generatedImage && <div className="space-y-3 animate-in fade-in">
                    <div className="relative rounded-lg overflow-hidden border">
                      <img src={generatedImage} alt="Generated" className="w-full max-h-[500px] object-contain bg-muted" />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1 gap-2" onClick={downloadImage}>
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                      <Button variant="outline" className="flex-1 gap-2" onClick={() => copyToClipboard(generatedImage)}>
                        <Copy className="h-4 w-4" />
                        Copy URL
                      </Button>
                    </div>
                  </div>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Image to Text */}
          <TabsContent value="image-to-text">
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-primary" />
                  Image to Text
                </CardTitle>
                <CardDescription>
                  Upload an image and get a detailed AI description
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Upload Image</Label>
                  <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                    <Input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'image')} className="hidden" id="image-upload" />
                    <label htmlFor="image-upload" className="cursor-pointer space-y-2">
                      {uploadedImage ? <img src={uploadedImage} alt="Uploaded" className="max-h-64 mx-auto rounded-lg" /> : <>
                          <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">Click to upload an image</p>
                        </>}
                    </label>
                  </div>
                </div>
                <Button onClick={handleImageToText} disabled={isGenerating || !uploadedImage} className="w-full gap-2" size="lg">
                  {isGenerating ? <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyzing...
                    </> : <>
                      <Sparkles className="h-4 w-4" />
                      Analyze Image
                    </>}
                </Button>

                {imageDescription && <div className="space-y-3 animate-in fade-in">
                    <div className="p-4 rounded-lg bg-muted/50 border">
                      <p className="text-sm leading-relaxed">{imageDescription}</p>
                    </div>
                    <Button variant="outline" className="w-full gap-2" onClick={() => copyToClipboard(imageDescription)}>
                      <Copy className="h-4 w-4" />
                      Copy Description
                    </Button>
                  </div>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Text to Video */}
          <TabsContent value="text-to-video">
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <VideoIcon className="h-5 w-5 text-primary" />
                  Text to Video
                  <Badge variant="secondary">{videoCreditCost} credits</Badge>
                </CardTitle>
                <CardDescription>
                  Generate videos from text descriptions. Requires {videoCreditCost} credits per video.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Your Prompt</Label>
                  <Textarea placeholder="A peaceful river flowing through a forest, with sunlight filtering through the trees..." value={videoPrompt} onChange={e => setVideoPrompt(e.target.value)} className="min-h-[120px] resize-none" />
                </div>

                {user && !canGenerateVideo() && <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-sm text-amber-600">
                      You need at least {videoCreditCost} credits to generate a video. Current balance: {userCredits} credits.
                    </p>
                    <Button variant="link" className="p-0 h-auto text-amber-600 underline" onClick={() => setShowBuyCredits(true)}>
                      Buy credits now
                    </Button>
                  </div>}

                <Button onClick={handleTextToVideo} disabled={isGenerating || !videoPrompt.trim() || !canGenerateVideo()} className="w-full gap-2" size="lg">
                  {isGenerating ? <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating Video...
                    </> : <>
                      <VideoIcon className="h-4 w-4" />
                      Generate Video
                      <Badge variant="outline" className="ml-2">{videoCreditCost} credits</Badge>
                    </>}
                </Button>

                {generatedVideo && <div className="space-y-3 animate-in fade-in">
                    <div className="relative rounded-lg overflow-hidden border">
                      <video src={generatedVideo} controls autoPlay loop className="w-full max-h-[500px] object-contain bg-muted" />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1 gap-2" onClick={() => {
                    const link = document.createElement('a');
                    link.href = generatedVideo;
                    link.download = `ai-video-${Date.now()}.mp4`;
                    link.click();
                  }}>
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                      <Button variant="outline" className="flex-1 gap-2" onClick={() => copyToClipboard(generatedVideo)}>
                        <Copy className="h-4 w-4" />
                        Copy URL
                      </Button>
                    </div>
                  </div>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Video to Text */}
          <TabsContent value="video-to-text">
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TypeIcon className="h-5 w-5 text-primary" />
                  Video to Text
                </CardTitle>
                <CardDescription>
                  Upload a video and get an AI-generated description
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Upload Video</Label>
                  <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                    <Input type="file" accept="video/*" onChange={e => handleImageUpload(e, 'video')} className="hidden" id="video-upload" />
                    <label htmlFor="video-upload" className="cursor-pointer space-y-2">
                      {uploadedVideo ? <video src={uploadedVideo} controls className="max-h-64 mx-auto rounded-lg" /> : <>
                          <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">Click to upload a video</p>
                        </>}
                    </label>
                  </div>
                </div>
                <Button onClick={handleVideoToText} disabled={isGenerating || !uploadedVideo} className="w-full gap-2" size="lg">
                  {isGenerating ? <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyzing...
                    </> : <>
                      <Sparkles className="h-4 w-4" />
                      Analyze Video
                    </>}
                </Button>

                {videoDescription && <div className="space-y-3 animate-in fade-in">
                    <div className="p-4 rounded-lg bg-muted/50 border">
                      <p className="text-sm leading-relaxed">{videoDescription}</p>
                    </div>
                    <Button variant="outline" className="w-full gap-2" onClick={() => copyToClipboard(videoDescription)}>
                      <Copy className="h-4 w-4" />
                      Copy Description
                    </Button>
                  </div>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Text to Music */}
          <TabsContent value="text-to-music">
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Music className="h-5 w-5 text-primary" />
                  Text to Music
                  <Badge variant="secondary">{musicCreditCost} credits</Badge>
                </CardTitle>
                <CardDescription>
                  Generate original AI music from text descriptions using Suno AI
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Describe Your Music</Label>
                  <Textarea placeholder="Upbeat electronic dance track with heavy bass and synth melodies, perfect for workout videos..." value={musicPrompt} onChange={e => setMusicPrompt(e.target.value)} className="min-h-[120px] resize-none" />
                </div>

                <div className="flex items-center gap-3">
                  <input type="checkbox" id="instrumental" checked={isInstrumental} onChange={e => setIsInstrumental(e.target.checked)} className="rounded" />
                  <Label htmlFor="instrumental" className="cursor-pointer">
                    Instrumental only (no vocals)
                  </Label>
                </div>

                {user && userCredits < musicCreditCost && <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-sm text-amber-600">
                      You need at least {musicCreditCost} credits to generate music. Current balance: {userCredits} credits.
                    </p>
                    <Button variant="link" className="p-0 h-auto text-amber-600 underline" onClick={() => setShowBuyCredits(true)}>
                      Buy credits now
                    </Button>
                  </div>}

                <Button onClick={handleGenerateMusic} disabled={isGenerating || !musicPrompt.trim() || userCredits < musicCreditCost} className="w-full gap-2" size="lg">
                  {isGenerating ? <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating Music...
                    </> : <>
                      <Music className="h-4 w-4" />
                      Generate Music
                      <Badge variant="outline" className="ml-2">{musicCreditCost} credits</Badge>
                    </>}
                </Button>

                {generatedMusic && <div className="space-y-3 animate-in fade-in">
                    <div className="p-4 rounded-lg bg-muted/50 border">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-3 rounded-full bg-primary/10">
                          <Music className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-medium">{musicTitle}</h4>
                          <p className="text-xs text-muted-foreground">AI Generated</p>
                        </div>
                      </div>
                      <audio controls src={generatedMusic} className="w-full" />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1 gap-2" onClick={() => {
                    const link = document.createElement('a');
                    link.href = generatedMusic;
                    link.download = `ai-music-${Date.now()}.mp3`;
                    link.click();
                  }}>
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                      <Button variant="outline" className="flex-1 gap-2" onClick={() => copyToClipboard(generatedMusic)}>
                        <Copy className="h-4 w-4" />
                        Copy URL
                      </Button>
                    </div>
                  </div>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Content Creator */}
          <TabsContent value="content-creator">
            <ContentCreator userCredits={userCredits} onCreditsChange={fetchUserCredits} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Buy Credits Dialog */}
      <BuyAICreditsDialog open={showBuyCredits} onOpenChange={setShowBuyCredits} onPurchaseComplete={() => {
      fetchUserCredits();
    }} />
    </div>;
});
AIHub.displayName = 'AIHub';
export default AIHub;