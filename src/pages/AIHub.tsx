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
import { VideoEditor } from '@/components/ai/VideoEditor';
import { ImageIcon, VideoIcon, TypeIcon, Sparkles, Upload, Loader2, Download, Copy, Wand2, Crown, X, ImagePlus, ShoppingCart, Film, Music, Play, Pause, Megaphone, Eraser, Palette, Sun, Trash2, Scissors } from 'lucide-react';
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
  const [imageStylePreset, setImageStylePreset] = useState<string>('none');
  const [videoAspectRatio, setVideoAspectRatio] = useState<string>('16:9');

  // Image style presets
  const IMAGE_STYLE_PRESETS = {
    none: { label: 'Default', promptSuffix: '' },
    realistic: { label: 'Realistic', promptSuffix: ', ultra realistic, photorealistic, 8K UHD, high detail, professional photography' },
    cartoon: { label: 'Cartoon', promptSuffix: ', cartoon style, animated, vibrant colors, playful, 2D illustration' },
    anime: { label: 'Anime', promptSuffix: ', anime style, Japanese animation, cel shading, vibrant colors, detailed eyes' },
    '3d-render': { label: '3D Render', promptSuffix: ', 3D render, CGI, octane render, blender, highly detailed, volumetric lighting' },
    'oil-painting': { label: 'Oil Painting', promptSuffix: ', oil painting style, classic art, textured brushstrokes, museum quality' },
    watercolor: { label: 'Watercolor', promptSuffix: ', watercolor painting, soft edges, flowing colors, artistic, hand-painted' },
    'pixel-art': { label: 'Pixel Art', promptSuffix: ', pixel art style, retro gaming, 16-bit, nostalgic, crisp pixels' },
    cyberpunk: { label: 'Cyberpunk', promptSuffix: ', cyberpunk style, neon lights, futuristic, dystopian, high tech low life' },
    fantasy: { label: 'Fantasy', promptSuffix: ', fantasy art style, magical, ethereal, mystical, epic fantasy illustration' },
    'sora-cinematic': { label: 'Sora Cinematic', promptSuffix: ', cinematic shot, film grain, anamorphic lens, movie scene, dramatic lighting, 35mm film' },
    'sora-dreamlike': { label: 'Sora Dreamlike', promptSuffix: ', dreamlike, surreal, ethereal atmosphere, soft focus, magical realism' },
    minimalist: { label: 'Minimalist', promptSuffix: ', minimalist design, clean lines, simple, modern, elegant' },
    vintage: { label: 'Vintage', promptSuffix: ', vintage style, retro, nostalgic, aged photograph, sepia tones' },
    'comic-book': { label: 'Comic Book', promptSuffix: ', comic book style, bold lines, halftone dots, dynamic action, superhero comics' },
  };

  // Video aspect ratio presets
  const VIDEO_ASPECT_RATIOS = {
    '16:9': { label: 'YouTube/Landscape', description: '16:9 - Standard YouTube, TV' },
    '9:16': { label: 'TikTok/Reels', description: '9:16 - TikTok, IG Reels, YT Shorts' },
    '1:1': { label: 'Instagram Square', description: '1:1 - Instagram Feed' },
    '4:5': { label: 'Instagram Portrait', description: '4:5 - Instagram Portrait' },
    '4:3': { label: 'Classic', description: '4:3 - Classic TV format' },
  };

  // Ad presets with dimensions and prompt enhancements
  const AD_PRESETS = {
    none: { label: 'Normal Image', dimensions: '', promptSuffix: '', isAd: false },
    'facebook-feed': { label: 'Facebook Feed', dimensions: '1200x628', promptSuffix: ', optimized for Facebook feed advertisement, eye-catching, professional marketing design', isAd: true },
    'facebook-story': { label: 'FB/IG Story', dimensions: '1080x1920', promptSuffix: ', vertical format for Stories, bold visuals, mobile-optimized advertisement', isAd: true },
    'instagram-square': { label: 'IG Square', dimensions: '1080x1080', promptSuffix: ', square format for Instagram, vibrant colors, lifestyle aesthetic', isAd: true },
    'instagram-post': { label: 'IG Post', dimensions: '1080x1350', promptSuffix: ', portrait format for Instagram feed, trendy aesthetic, high engagement', isAd: true },
    'youtube-thumbnail': { label: 'YT Thumbnail', dimensions: '1280x720', promptSuffix: ', YouTube thumbnail style, high contrast, bold and attention-grabbing', isAd: true },
    'youtube-banner': { label: 'YT Banner', dimensions: '2560x1440', promptSuffix: ', YouTube channel art banner, wide panoramic format, professional branding', isAd: true },
    'google-display': { label: 'Google Display', dimensions: '300x250', promptSuffix: ', Google display advertisement, clean and professional design', isAd: true },
    'google-leaderboard': { label: 'Google Banner', dimensions: '728x90', promptSuffix: ', horizontal banner advertisement, minimal but impactful', isAd: true },
    'linkedin-sponsored': { label: 'LinkedIn', dimensions: '1200x627', promptSuffix: ', LinkedIn professional advertisement, corporate and business style', isAd: true },
    'twitter-post': { label: 'Twitter/X', dimensions: '1600x900', promptSuffix: ', Twitter post image, trending visual style, shareable design', isAd: true },
    'tiktok-ad': { label: 'TikTok', dimensions: '1080x1920', promptSuffix: ', TikTok vertical format, Gen-Z aesthetic, trendy and dynamic', isAd: true },
    'pinterest-pin': { label: 'Pinterest', dimensions: '1000x1500', promptSuffix: ', Pinterest pin format, aesthetic and inspirational, lifestyle imagery', isAd: true },
  };

  // Music generation
  const [musicPrompt, setMusicPrompt] = useState('');
  const [generatedMusic, setGeneratedMusic] = useState<string | null>(null);
  const [musicTitle, setMusicTitle] = useState<string | null>(null);
  const [isInstrumental, setIsInstrumental] = useState(false);
  const [musicCreditCost] = useState(5);

  // Animate image state
  const [isAnimating, setIsAnimating] = useState(false);
  const [animatedVideoUrl, setAnimatedVideoUrl] = useState<string | null>(null);
  const [animationDuration, setAnimationDuration] = useState(4);

  // Image enhancement state
  const [enhanceImage, setEnhanceImage] = useState<string | null>(null);
  const [enhancedResult, setEnhancedResult] = useState<string | null>(null);
  const [enhanceOperation, setEnhanceOperation] = useState<string>('enhance');
  const [newBackgroundPrompt, setNewBackgroundPrompt] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhanceCreditCost] = useState(2);

  // Usage tracking
  const [imageGenerationCount, setImageGenerationCount] = useState(0);
  const [freeImageLimit, setFreeImageLimit] = useState(3);
  const [videoCreditCost, setVideoCreditCost] = useState(10);
  const [creditToDiamondRate, setCreditToDiamondRate] = useState(10);
  const [userCredits, setUserCredits] = useState(0);

  // Logo and dialogs
  const [appLogo, setAppLogo] = useState<string | null>(null);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  
  // Video editor state
  const [showVideoEditor, setShowVideoEditor] = useState(false);
  const [editorMediaUrl, setEditorMediaUrl] = useState<string>('');
  const [editorMediaType, setEditorMediaType] = useState<'video' | 'image'>('video');
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
      // Build the final prompt with style and ad preset suffixes
      const selectedAdPreset = AD_PRESETS[adPreset as keyof typeof AD_PRESETS];
      const selectedStylePreset = IMAGE_STYLE_PRESETS[imageStylePreset as keyof typeof IMAGE_STYLE_PRESETS];
      const finalPrompt = prompt.trim() + (selectedStylePreset?.promptSuffix || '') + (selectedAdPreset?.promptSuffix || '');
      
      const {
        data,
        error
      } = await supabase.functions.invoke('ai-generate', {
        body: {
          type: 'text-to-image',
          prompt: finalPrompt,
          referenceImage: referenceImage,
          dimensions: selectedAdPreset?.dimensions || undefined
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
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'reference' | 'enhance') => {
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
      } else if (type === 'enhance') {
        setEnhanceImage(base64);
        setEnhancedResult(null);
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
          duration: 5,
          aspectRatio: videoAspectRatio
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

  const handleEnhanceImage = async () => {
    if (!enhanceImage) {
      toast.error('Please upload an image first');
      return;
    }
    if (!user) {
      toast.error('Please login to enhance images');
      return;
    }
    if (enhanceOperation === 'change-bg' && !newBackgroundPrompt.trim()) {
      toast.error('Please describe the new background');
      return;
    }
    if (userCredits < enhanceCreditCost) {
      toast.error(`You need at least ${enhanceCreditCost} credits for this operation`);
      setShowBuyCredits(true);
      return;
    }

    setIsEnhancing(true);
    setEnhancedResult(null);

    try {
      const deducted = await deductCredits(enhanceCreditCost);
      if (!deducted) {
        toast.error('Failed to deduct credits');
        return;
      }

      toast.info('Processing your image... This may take a moment.');

      const { data, error } = await supabase.functions.invoke('enhance-image', {
        body: {
          imageUrl: enhanceImage,
          operation: enhanceOperation,
          newBackground: enhanceOperation === 'change-bg' ? newBackgroundPrompt : undefined
        }
      });

      if (error) throw error;

      if (data?.imageUrl) {
        setEnhancedResult(data.imageUrl);
        await trackGeneration(`image-${enhanceOperation}`, enhanceCreditCost);
        toast.success('Image processed successfully!');
      } else if (data?.error) {
        throw new Error(data.error);
      } else {
        throw new Error('No result returned');
      }
    } catch (error: any) {
      console.error('Enhancement error:', error);
      toast.error(error.message || 'Failed to process image');
      // Refund credits on failure
      await supabase.from('profiles').update({
        credits: userCredits
      }).eq('id', user.id);
      fetchUserCredits();
    } finally {
      setIsEnhancing(false);
    }
  };

  const getAnimationCreditCost = (duration: number) => {
    if (duration <= 4) return 3;
    if (duration <= 8) return 5;
    if (duration <= 10) return 8;
    if (duration <= 30) return 15;
    if (duration <= 60) return 25;
    if (duration <= 300) return 100;
    return 250; // 15 minutes
  };

  const handleAnimateImage = async () => {
    if (!generatedImage) {
      toast.error('Please generate an image first');
      return;
    }
    if (!user) {
      toast.error('Please login to animate images');
      return;
    }
    
    const creditCost = getAnimationCreditCost(animationDuration);
    
    if (userCredits < creditCost) {
      toast.error(`You need at least ${creditCost} credits to animate for ${animationDuration} seconds`);
      setShowBuyCredits(true);
      return;
    }

    // Check duration limits based on credits (paid access for longer durations)
    if (animationDuration > 10 && userCredits < 15) {
      toast.error('You need a paid plan (15+ credits) for animations longer than 10 seconds');
      setShowBuyCredits(true);
      return;
    }

    setIsAnimating(true);
    setAnimatedVideoUrl(null);

    try {
      const deducted = await deductCredits(creditCost);
      if (!deducted) {
        toast.error('Failed to deduct credits');
        return;
      }

      toast.info('Animating your image... This may take a moment.');

      const { data, error } = await supabase.functions.invoke('animate-image', {
        body: {
          imageUrl: generatedImage,
          duration: animationDuration,
          prompt: prompt
        }
      });

      if (error) throw error;

      if (data?.videoUrl) {
        setAnimatedVideoUrl(data.videoUrl);
        await trackGeneration('image-animation', creditCost);
        toast.success('Image animated successfully!');
      } else if (data?.error) {
        throw new Error(data.error);
      } else {
        throw new Error('No video returned');
      }
    } catch (error: any) {
      console.error('Animation error:', error);
      toast.error(error.message || 'Failed to animate image');
      // Refund credits on failure
      await supabase.from('profiles').update({
        credits: userCredits
      }).eq('id', user.id);
      fetchUserCredits();
    } finally {
      setIsAnimating(false);
    }
  };
  const downloadImage = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `ai-generated-${Date.now()}.png`;
    link.click();
  };
  
  const openVideoEditor = (url: string, type: 'video' | 'image') => {
    setEditorMediaUrl(url);
    setEditorMediaType(type);
    setShowVideoEditor(true);
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
          <TabsList className="grid grid-cols-7 w-full max-w-4xl mx-auto bg-background/50 backdrop-blur-sm border">
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
            <TabsTrigger value="enhance" className="gap-1 text-xs sm:text-sm">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Enhance</span>
              <span className="sm:hidden">Fix</span>
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
                  <Textarea placeholder="A majestic dragon flying over a crystal lake at sunset..." value={prompt} onChange={e => setPrompt(e.target.value)} className="min-h-[120px] resize-none" />
                </div>

                {/* Image Style Preset */}
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2 text-sm">
                    <Palette className="h-3.5 w-3.5" />
                    Image Style
                  </Label>
                  <Select value={imageStylePreset} onValueChange={setImageStylePreset}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select style..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[320px]">
                      <SelectItem value="none" className="text-sm">🎨 Default (No style)</SelectItem>
                      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Photo & Realistic</div>
                      <SelectItem value="realistic" className="text-sm">📸 Realistic / Photorealistic</SelectItem>
                      <SelectItem value="sora-cinematic" className="text-sm">🎬 Sora Cinematic</SelectItem>
                      <SelectItem value="sora-dreamlike" className="text-sm">💫 Sora Dreamlike</SelectItem>
                      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Illustration & Art</div>
                      <SelectItem value="cartoon" className="text-sm">🎪 Cartoon</SelectItem>
                      <SelectItem value="anime" className="text-sm">🌸 Anime</SelectItem>
                      <SelectItem value="comic-book" className="text-sm">💥 Comic Book</SelectItem>
                      <SelectItem value="pixel-art" className="text-sm">👾 Pixel Art</SelectItem>
                      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Fine Art</div>
                      <SelectItem value="oil-painting" className="text-sm">🖼️ Oil Painting</SelectItem>
                      <SelectItem value="watercolor" className="text-sm">💧 Watercolor</SelectItem>
                      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Digital & 3D</div>
                      <SelectItem value="3d-render" className="text-sm">🎮 3D Render</SelectItem>
                      <SelectItem value="cyberpunk" className="text-sm">🌃 Cyberpunk</SelectItem>
                      <SelectItem value="fantasy" className="text-sm">🧙 Fantasy</SelectItem>
                      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Other Styles</div>
                      <SelectItem value="minimalist" className="text-sm">⬜ Minimalist</SelectItem>
                      <SelectItem value="vintage" className="text-sm">📷 Vintage</SelectItem>
                    </SelectContent>
                  </Select>
                  {imageStylePreset !== 'none' && (
                    <p className="text-xs text-muted-foreground">
                      Style: {IMAGE_STYLE_PRESETS[imageStylePreset as keyof typeof IMAGE_STYLE_PRESETS]?.label}
                    </p>
                  )}
                </div>

                {/* Image Format Preset */}
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2 text-sm">
                    <Megaphone className="h-3.5 w-3.5" />
                    Image Format
                  </Label>
                  <Select value={adPreset} onValueChange={setAdPreset}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select format..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[280px]">
                      <SelectItem value="none" className="text-sm">🖼️ Normal Image</SelectItem>
                      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Social Media Ads</div>
                      <SelectItem value="facebook-feed" className="text-sm">📘 Facebook Feed <span className="text-muted-foreground text-xs ml-1">1200×628</span></SelectItem>
                      <SelectItem value="facebook-story" className="text-sm">📱 FB/IG Story <span className="text-muted-foreground text-xs ml-1">1080×1920</span></SelectItem>
                      <SelectItem value="instagram-square" className="text-sm">📷 IG Square <span className="text-muted-foreground text-xs ml-1">1080×1080</span></SelectItem>
                      <SelectItem value="instagram-post" className="text-sm">📸 IG Post <span className="text-muted-foreground text-xs ml-1">1080×1350</span></SelectItem>
                      <SelectItem value="youtube-thumbnail" className="text-sm">▶️ YT Thumbnail <span className="text-muted-foreground text-xs ml-1">1280×720</span></SelectItem>
                      <SelectItem value="youtube-banner" className="text-sm">🎬 YT Banner <span className="text-muted-foreground text-xs ml-1">2560×1440</span></SelectItem>
                      <SelectItem value="google-display" className="text-sm">🔍 Google Display <span className="text-muted-foreground text-xs ml-1">300×250</span></SelectItem>
                      <SelectItem value="google-leaderboard" className="text-sm">📊 Google Banner <span className="text-muted-foreground text-xs ml-1">728×90</span></SelectItem>
                      <SelectItem value="linkedin-sponsored" className="text-sm">💼 LinkedIn <span className="text-muted-foreground text-xs ml-1">1200×627</span></SelectItem>
                      <SelectItem value="twitter-post" className="text-sm">🐦 Twitter/X <span className="text-muted-foreground text-xs ml-1">1600×900</span></SelectItem>
                      <SelectItem value="tiktok-ad" className="text-sm">🎵 TikTok <span className="text-muted-foreground text-xs ml-1">1080×1920</span></SelectItem>
                      <SelectItem value="pinterest-pin" className="text-sm">📌 Pinterest <span className="text-muted-foreground text-xs ml-1">1000×1500</span></SelectItem>
                    </SelectContent>
                  </Select>
                  {adPreset !== 'none' && (
                    <p className="text-xs text-muted-foreground">
                      Optimized for {AD_PRESETS[adPreset as keyof typeof AD_PRESETS]?.label} ({AD_PRESETS[adPreset as keyof typeof AD_PRESETS]?.dimensions})
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

                {generatedImage && <div className="space-y-4 animate-in fade-in">
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
                      <Button 
                        variant="outline" 
                        className="flex-1 gap-2" 
                        onClick={() => openVideoEditor(generatedImage, 'image')}
                      >
                        <Scissors className="h-4 w-4" />
                        Edit
                      </Button>
                    </div>
                    
                    {/* Animate Image Section */}
                    <div className="p-4 rounded-lg border bg-gradient-to-r from-purple-500/10 to-pink-500/10">
                      <div className="flex items-center gap-2 mb-3">
                        <Film className="h-5 w-5 text-purple-500" />
                        <span className="font-medium">Animate This Image</span>
                        <Badge variant="outline" className="ml-auto">
                          {userCredits > 0 ? `${getAnimationCreditCost(animationDuration)} credits` : 'Paid Feature'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Transform your static image into an animated video. Free: up to 10 sec. Paid: up to 15 min.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1">
                          <Label className="text-xs mb-1.5 block">Duration (seconds)</Label>
                          <Select 
                            value={String(animationDuration)} 
                            onValueChange={(v) => setAnimationDuration(parseInt(v))}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="4">4 seconds (3 credits)</SelectItem>
                              <SelectItem value="8">8 seconds (5 credits)</SelectItem>
                              <SelectItem value="10">10 seconds (8 credits)</SelectItem>
                              {userCredits >= 15 && (
                                <>
                                  <SelectItem value="30">30 seconds (15 credits)</SelectItem>
                                  <SelectItem value="60">1 minute (25 credits)</SelectItem>
                                  <SelectItem value="300">5 minutes (100 credits)</SelectItem>
                                  <SelectItem value="900">15 minutes (250 credits)</SelectItem>
                                </>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button 
                          onClick={handleAnimateImage} 
                          disabled={isAnimating || userCredits < 3}
                          className="gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                        >
                          {isAnimating ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Animating...
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4" />
                              Animate
                            </>
                          )}
                        </Button>
                      </div>
                      {userCredits < 3 && (
                        <p className="text-xs text-amber-500 mt-2">
                          You need at least 3 credits to animate images. 
                          <Button variant="link" className="h-auto p-0 pl-1 text-xs" onClick={() => setShowBuyCredits(true)}>
                            Buy credits
                          </Button>
                        </p>
                      )}
                    </div>

                    {/* Animated Video Result */}
                    {animatedVideoUrl && (
                      <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
                        <div className="flex items-center gap-2">
                          <Film className="h-5 w-5 text-green-500" />
                          <span className="font-medium">Animated Video Ready!</span>
                        </div>
                        <video 
                          src={animatedVideoUrl} 
                          controls 
                          className="w-full rounded-lg max-h-[400px]"
                          autoPlay
                          loop
                        />
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            className="flex-1 gap-2" 
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = animatedVideoUrl;
                              link.download = `animated-${Date.now()}.mp4`;
                              link.click();
                            }}
                          >
                            <Download className="h-4 w-4" />
                            Download
                          </Button>
                          <Button 
                            className="flex-1 gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600" 
                            onClick={() => openVideoEditor(animatedVideoUrl, 'video')}
                          >
                            <Scissors className="h-4 w-4" />
                            Edit Video
                          </Button>
                        </div>
                      </div>
                    )}
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

                {/* Video Aspect Ratio */}
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2 text-sm">
                    <VideoIcon className="h-3.5 w-3.5" />
                    Aspect Ratio (Platform)
                  </Label>
                  <Select value={videoAspectRatio} onValueChange={setVideoAspectRatio}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Select aspect ratio..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="16:9" className="text-sm">📺 YouTube / Landscape (16:9)</SelectItem>
                      <SelectItem value="9:16" className="text-sm">📱 TikTok / Reels / Shorts (9:16)</SelectItem>
                      <SelectItem value="1:1" className="text-sm">📷 Instagram Square (1:1)</SelectItem>
                      <SelectItem value="4:5" className="text-sm">📸 Instagram Portrait (4:5)</SelectItem>
                      <SelectItem value="4:3" className="text-sm">🖥️ Classic (4:3)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {VIDEO_ASPECT_RATIOS[videoAspectRatio as keyof typeof VIDEO_ASPECT_RATIOS]?.description}
                  </p>
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
                    <Button 
                      className="w-full gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600" 
                      onClick={() => openVideoEditor(generatedVideo, 'video')}
                    >
                      <Scissors className="h-4 w-4" />
                      Open Video Editor
                    </Button>
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

          {/* Image Enhancement */}
          <TabsContent value="enhance">
            <Card className="border-purple-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  Image Enhancement & Correction
                  <Badge variant="secondary" className="ml-2">{enhanceCreditCost} credits</Badge>
                </CardTitle>
                <CardDescription>
                  Restore old photos, remove backgrounds, enhance quality, and fix lighting. Perfect for IDs and precious memories.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Upload Section */}
                <div className="space-y-4">
                  <Label>Upload Image</Label>
                  <div className="flex flex-col items-center gap-4">
                    {enhanceImage ? (
                      <div className="relative w-full max-w-md">
                        <img 
                          src={enhanceImage} 
                          alt="Image to enhance" 
                          className="w-full rounded-lg border shadow-sm"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={() => {
                            setEnhanceImage(null);
                            setEnhancedResult(null);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <label className="w-full max-w-md border-2 border-dashed rounded-lg p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-all">
                        <Upload className="h-10 w-10 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Click to upload your image</span>
                        <span className="text-xs text-muted-foreground">Supports JPG, PNG, WEBP</span>
                        <Input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleImageUpload(e, 'enhance')}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Operation Selection */}
                <div className="space-y-3">
                  <Label>Select Enhancement Operation</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Button
                      variant={enhanceOperation === 'enhance' ? 'default' : 'outline'}
                      className="flex flex-col h-auto py-4 gap-2"
                      onClick={() => setEnhanceOperation('enhance')}
                    >
                      <Wand2 className="h-5 w-5" />
                      <span className="text-xs">Enhance Quality</span>
                    </Button>
                    <Button
                      variant={enhanceOperation === 'remove-bg' ? 'default' : 'outline'}
                      className="flex flex-col h-auto py-4 gap-2"
                      onClick={() => setEnhanceOperation('remove-bg')}
                    >
                      <Eraser className="h-5 w-5" />
                      <span className="text-xs">Remove Background</span>
                    </Button>
                    <Button
                      variant={enhanceOperation === 'change-bg' ? 'default' : 'outline'}
                      className="flex flex-col h-auto py-4 gap-2"
                      onClick={() => setEnhanceOperation('change-bg')}
                    >
                      <Palette className="h-5 w-5" />
                      <span className="text-xs">Change Background</span>
                    </Button>
                    <Button
                      variant={enhanceOperation === 'restore' ? 'default' : 'outline'}
                      className="flex flex-col h-auto py-4 gap-2"
                      onClick={() => setEnhanceOperation('restore')}
                    >
                      <ImagePlus className="h-5 w-5" />
                      <span className="text-xs">Restore Old Photo</span>
                    </Button>
                    <Button
                      variant={enhanceOperation === 'upscale' ? 'default' : 'outline'}
                      className="flex flex-col h-auto py-4 gap-2"
                      onClick={() => setEnhanceOperation('upscale')}
                    >
                      <ImageIcon className="h-5 w-5" />
                      <span className="text-xs">Upscale HD</span>
                    </Button>
                    <Button
                      variant={enhanceOperation === 'colorize' ? 'default' : 'outline'}
                      className="flex flex-col h-auto py-4 gap-2"
                      onClick={() => setEnhanceOperation('colorize')}
                    >
                      <Palette className="h-5 w-5" />
                      <span className="text-xs">Colorize B&W</span>
                    </Button>
                    <Button
                      variant={enhanceOperation === 'fix-lighting' ? 'default' : 'outline'}
                      className="flex flex-col h-auto py-4 gap-2"
                      onClick={() => setEnhanceOperation('fix-lighting')}
                    >
                      <Sun className="h-5 w-5" />
                      <span className="text-xs">Fix Lighting</span>
                    </Button>
                    <Button
                      variant={enhanceOperation === 'denoise' ? 'default' : 'outline'}
                      className="flex flex-col h-auto py-4 gap-2"
                      onClick={() => setEnhanceOperation('denoise')}
                    >
                      <Sparkles className="h-5 w-5" />
                      <span className="text-xs">Remove Noise</span>
                    </Button>
                  </div>
                </div>

                {/* New Background Prompt (only for change-bg) */}
                {enhanceOperation === 'change-bg' && (
                  <div className="space-y-2">
                    <Label>Describe New Background</Label>
                    <Textarea
                      placeholder="A professional studio background with soft gradient lighting, clean white wall, nature landscape with mountains..."
                      value={newBackgroundPrompt}
                      onChange={(e) => setNewBackgroundPrompt(e.target.value)}
                      className="min-h-[100px]"
                    />
                  </div>
                )}

                {/* Credits Warning */}
                {user && userCredits < enhanceCreditCost && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-sm text-amber-600">
                      You need at least {enhanceCreditCost} credits for this operation. Current balance: {userCredits} credits.
                    </p>
                    <Button
                      variant="link"
                      className="p-0 h-auto text-amber-600 underline"
                      onClick={() => setShowBuyCredits(true)}
                    >
                      Buy credits now
                    </Button>
                  </div>
                )}

                {/* Process Button */}
                <Button
                  onClick={handleEnhanceImage}
                  disabled={isEnhancing || !enhanceImage || userCredits < enhanceCreditCost || (enhanceOperation === 'change-bg' && !newBackgroundPrompt.trim())}
                  className="w-full gap-2"
                  size="lg"
                >
                  {isEnhancing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing Image...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Process Image
                      <Badge variant="outline" className="ml-2">{enhanceCreditCost} credits</Badge>
                    </>
                  )}
                </Button>

                {/* Result Display */}
                {enhancedResult && (
                  <div className="space-y-4 animate-in fade-in">
                    <div className="p-4 rounded-lg bg-muted/50 border space-y-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                        <Sparkles className="h-4 w-4" />
                        Enhanced Result
                      </div>
                      
                      {/* Before/After Comparison */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground text-center">Before</p>
                          <img
                            src={enhanceImage!}
                            alt="Original"
                            className="w-full rounded-lg border"
                          />
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground text-center">After</p>
                          <img
                            src={enhancedResult}
                            alt="Enhanced"
                            className="w-full rounded-lg border"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1 gap-2"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = enhancedResult;
                          link.download = `enhanced-${enhanceOperation}-${Date.now()}.png`;
                          link.click();
                        }}
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 gap-2"
                        onClick={() => copyToClipboard(enhancedResult)}
                      >
                        <Copy className="h-4 w-4" />
                        Copy URL
                      </Button>
                    </div>
                  </div>
                )}
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
      
      {/* Video Editor Dialog */}
      <VideoEditor 
        open={showVideoEditor} 
        onOpenChange={setShowVideoEditor}
        mediaUrl={editorMediaUrl}
        mediaType={editorMediaType}
        onExport={(url) => {
          toast.success('Video exported successfully!');
        }}
      />
    </div>;
});
AIHub.displayName = 'AIHub';
export default AIHub;