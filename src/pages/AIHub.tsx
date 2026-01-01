import React, { useState, useEffect, memo } from 'react';
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
import { useAICredits } from '@/hooks/useAICredits';
import BuyAICreditsDialog from '@/components/ai/BuyAICreditsDialog';
import CreditSourceDialog from '@/components/ai/CreditSourceDialog';
import ContentCreator from '@/components/ai/ContentCreator';
import { VideoEditor } from '@/components/ai/VideoEditor';
import { ImageIcon, VideoIcon, TypeIcon, Sparkles, Upload, Loader2, Download, Copy, Wand2, Crown, X, ImagePlus, ShoppingCart, Film, Music, Play, Pause, Megaphone, Eraser, Palette, Sun, Trash2, Scissors, Briefcase, Brain, MessageSquare, Lock, Menu, ChevronLeft, Send, ArrowUp, GitBranch, Globe, BarChart3, Users, Image, CheckCircle, Code, Newspaper, TrendingUp } from 'lucide-react';
import WebsiteBuilder from '@/components/ai/WebsiteBuilder';
import BusinessSolutions from '@/components/ai/BusinessSolutions';
import DeepResearchAssistant from '@/components/ai/DeepResearchAssistant';
import AdvancedChatAssistant from '@/components/ai/AdvancedChatAssistant';
import BinaryAffiliateTab from '@/components/ai/BinaryAffiliateTab';
import AIHubGallery from '@/components/ai/AIHubGallery';
import WebsiteScraper from '@/components/ai/WebsiteScraper';
import CreatorAnalytics from '@/components/ai/CreatorAnalytics';
import SocialMediaManager from '@/components/ai/SocialMediaManager';
import AdsMaker from '@/components/ai/AdsMaker';
import ContactUsAssistant from '@/components/ai/ContactUsAssistant';
import AICreditsDisplay from '@/components/ai/AICreditsDisplay';
import BlogContentMaker from '@/components/ai/BlogContentMaker';
import MarketAnalysis from '@/components/ai/MarketAnalysis';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const AIHub = memo(() => {
  const { user, profile } = useAuth();
  const { 
    credits: aiCredits, 
    loading: aiCreditsLoading, 
    refetch: refetchAICredits,
    canGenerateImage: canUseImageCredits,
    canGenerateVideo: canUseVideoCredits,
    canGenerateAudio: canUseAudioCredits,
    deductImageCredit,
    deductVideoMinutes,
    deductAudioMinutes
  } = useAICredits();
  const [activeTab, setActiveTab] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [homeInputValue, setHomeInputValue] = useState('');
  const [initialResearchQuery, setInitialResearchQuery] = useState('');
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
  const [videoProvider, setVideoProvider] = useState<'gemini' | 'openai'>('gemini');

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
  
  // Credit source dialog state
  const [showCreditSourceDialog, setShowCreditSourceDialog] = useState(false);
  const [pendingCreditAction, setPendingCreditAction] = useState<{
    type: 'image' | 'video' | 'audio' | 'general';
    cost: number;
    serviceName: string;
    callback: (source: 'ai_credits' | 'legacy_credits') => void;
  } | null>(null);

  // Video editor state
  const [showVideoEditor, setShowVideoEditor] = useState(false);
  const [editorMediaUrl, setEditorMediaUrl] = useState<string>('');
  const [editorMediaType, setEditorMediaType] = useState<'video' | 'image'>('video');

  // Research to video state
  const [researchForVideo, setResearchForVideo] = useState<string | null>(null);
  const [topicForVideo, setTopicForVideo] = useState<string | null>(null);

  const handleCreateVideoFromResearch = (researchContent: string, topic: string) => {
    setResearchForVideo(researchContent);
    setTopicForVideo(topic);
    setActiveTab('content-creator');
    toast.success('Switching to Content Creator with your research!');
  };

  const isPaidAffiliate = (profile as any)?.is_paid_affiliate || (profile as any)?.ai_features_unlocked;

  // Navigation items for sidebar with colorful gradients
  const navItems = [
    { id: 'home', label: 'Home', icon: Sparkles, gradient: 'from-yellow-400 to-orange-500', iconColor: 'text-yellow-500' },
    // Only show affiliate tab for affiliates or users looking to buy credits
    ...(isPaidAffiliate || user ? [{ id: 'affiliate', label: 'Affiliate', icon: GitBranch, gradient: 'from-green-400 to-emerald-500', iconColor: 'text-green-500' }] : []),
    { id: 'research', label: 'Research', icon: Brain, gradient: 'from-purple-400 to-indigo-500', iconColor: 'text-purple-500' },
    { id: 'chat', label: 'GPT-5', icon: MessageSquare, gradient: 'from-blue-400 to-cyan-500', iconColor: 'text-blue-500' },
    { id: 'business', label: 'Business', icon: Briefcase, gradient: 'from-slate-400 to-gray-600', iconColor: 'text-slate-500' },
    { id: 'text-to-image', label: 'Image', icon: Wand2, gradient: 'from-pink-400 to-rose-500', iconColor: 'text-pink-500' },
    { id: 'text-to-video', label: 'Video', icon: VideoIcon, gradient: 'from-red-400 to-orange-500', iconColor: 'text-red-500' },
    { id: 'text-to-music', label: 'Music', icon: Music, gradient: 'from-violet-400 to-purple-500', iconColor: 'text-violet-500' },
    { id: 'enhance', label: 'Enhance', icon: Sparkles, gradient: 'from-amber-400 to-yellow-500', iconColor: 'text-amber-500' },
    { id: 'image-to-text', label: 'Analyze', icon: ImageIcon, gradient: 'from-teal-400 to-cyan-500', iconColor: 'text-teal-500' },
    { id: 'video-to-text', label: 'V→Text', icon: TypeIcon, gradient: 'from-lime-400 to-green-500', iconColor: 'text-lime-500' },
    { id: 'content-creator', label: 'Creator', icon: Film, gradient: 'from-fuchsia-400 to-pink-500', iconColor: 'text-fuchsia-500' },
    { id: 'video-editor', label: 'Editor', icon: Scissors, gradient: 'from-orange-400 to-red-500', iconColor: 'text-orange-500' },
    { id: 'web-scraper', label: 'Scraper', icon: Globe, gradient: 'from-cyan-400 to-blue-500', iconColor: 'text-cyan-500', premium: true },
    { id: 'website-builder', label: 'Website', icon: Code, gradient: 'from-emerald-400 to-teal-500', iconColor: 'text-emerald-500', premium: true },
    { id: 'creator-analytics', label: 'Analytics', icon: Crown, gradient: 'from-yellow-400 to-amber-500', iconColor: 'text-yellow-500', premium: true },
    { id: 'social-media', label: 'Social', icon: Users, gradient: 'from-indigo-400 to-violet-500', iconColor: 'text-indigo-500', premium: true },
    ...(isPaidAffiliate ? [{ id: 'ads-maker', label: 'Ads', icon: Megaphone, gradient: 'from-orange-400 to-red-500', iconColor: 'text-orange-500', premium: true }] : []),
    { id: 'blog-maker', label: 'Blog', icon: Newspaper, gradient: 'from-orange-400 to-amber-500', iconColor: 'text-orange-500', premium: true },
    { id: 'market-analysis', label: 'Markets', icon: TrendingUp, gradient: 'from-blue-500 to-indigo-600', iconColor: 'text-blue-500', premium: true },
    { id: 'contact', label: 'Contact', icon: MessageSquare, gradient: 'from-teal-400 to-blue-500', iconColor: 'text-teal-500' },
  ];

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
      const { data } = await supabase.from('app_settings').select('value').eq('key', 'app_logo').maybeSingle();
      if (data?.value) {
        setAppLogo(data.value);
      }
    } catch (error) {
      console.error('Error fetching app logo:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      const { data } = await supabase.from('app_settings').select('key, value').in('key', ['ai_free_image_limit', 'ai_video_credit_cost', 'ai_credit_to_diamond_rate']);
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
      const { count } = await supabase.from('ai_generations').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('generation_type', 'text-to-image');
      setImageGenerationCount(count || 0);
    } catch (error) {
      console.error('Error fetching usage stats:', error);
    }
  };

  const fetchUserCredits = async () => {
    if (!user) return;
    try {
      const { data } = await supabase.from('profiles').select('credits').eq('id', user.id).single();
      setUserCredits(data?.credits || 0);
    } catch (error) {
      console.error('Error fetching credits:', error);
    }
  };

  const canGenerateImage = () => {
    if (!user) return false;
    // Check AI credits first (from purchased packages)
    if (aiCredits && aiCredits.images_available > 0) return true;
    // Fall back to free tier
    return imageGenerationCount < freeImageLimit || userCredits > 0;
  };

  const canGenerateVideo = () => {
    if (!user) return false;
    // Check AI video minutes first (from purchased packages)
    if (aiCredits && Number(aiCredits.video_minutes_available) >= 0.5) return true;
    // Fall back to legacy credits
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

  // Helper to show credit source selection dialog
  const promptCreditSource = (
    type: 'image' | 'video' | 'audio' | 'general',
    cost: number,
    serviceName: string
  ): Promise<'ai_credits' | 'legacy_credits' | null> => {
    return new Promise((resolve) => {
      // Check available credits for each source
      const aiAvailable = type === 'image' 
        ? aiCredits?.images_available || 0
        : type === 'video'
        ? Number(aiCredits?.video_minutes_available || 0)
        : type === 'audio'
        ? Number(aiCredits?.audio_minutes_available || 0)
        : 0;
      
      const hasAI = type === 'image' ? aiAvailable >= cost : aiAvailable >= 0.5;
      const hasLegacy = userCredits >= cost;
      
      // If only one option is available, use it automatically
      if (hasAI && !hasLegacy) {
        resolve('ai_credits');
        return;
      }
      if (!hasAI && hasLegacy) {
        resolve('legacy_credits');
        return;
      }
      if (!hasAI && !hasLegacy) {
        resolve(null);
        return;
      }
      
      // Both available - show dialog
      setPendingCreditAction({
        type,
        cost,
        serviceName,
        callback: (source) => {
          resolve(source);
          setPendingCreditAction(null);
        }
      });
      setShowCreditSourceDialog(true);
    });
  };

  // Deduct from specified source
  const deductFromSource = async (amount: number, type: 'image' | 'video' | 'audio' | 'general', source: 'ai_credits' | 'legacy_credits') => {
    if (!user) return false;
    
    if (source === 'ai_credits') {
      if (type === 'image' && aiCredits && aiCredits.images_available >= amount) {
        const success = await deductImageCredit(amount);
        if (success) {
          refetchAICredits();
          return true;
        }
      }
      if (type === 'video' && aiCredits) {
        const minutesNeeded = amount / videoCreditCost * 0.5;
        if (Number(aiCredits.video_minutes_available) >= minutesNeeded) {
          const success = await deductVideoMinutes(minutesNeeded);
          if (success) {
            refetchAICredits();
            return true;
          }
        }
      }
      if (type === 'audio' && aiCredits) {
        const minutesNeeded = amount / 5;
        if (Number(aiCredits.audio_minutes_available) >= minutesNeeded) {
          const success = await deductAudioMinutes(minutesNeeded);
          if (success) {
            refetchAICredits();
            return true;
          }
        }
      }
      return false;
    }
    
    // Legacy credits
    try {
      const { error } = await supabase.from('profiles').update({
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

  // Deduct from AI credits first, then fall back to legacy credits
  const deductCredits = async (amount: number, type: 'image' | 'video' | 'audio' | 'general' = 'general') => {
    if (!user) return false;
    
    // For image generation, try to use AI image credits first
    if (type === 'image' && aiCredits && aiCredits.images_available >= amount) {
      const success = await deductImageCredit(amount);
      if (success) {
        refetchAICredits();
        return true;
      }
    }
    
    // For video generation, try to use AI video minutes first (convert credits to minutes)
    if (type === 'video' && aiCredits) {
      const minutesNeeded = amount / videoCreditCost * 0.5; // Convert credits to approximate minutes
      if (Number(aiCredits.video_minutes_available) >= minutesNeeded) {
        const success = await deductVideoMinutes(minutesNeeded);
        if (success) {
          refetchAICredits();
          return true;
        }
      }
    }
    
    // For audio generation, try to use AI audio minutes first
    if (type === 'audio' && aiCredits) {
      const minutesNeeded = amount / 5; // Assuming 5 credits per minute of audio
      if (Number(aiCredits.audio_minutes_available) >= minutesNeeded) {
        const success = await deductAudioMinutes(minutesNeeded);
        if (success) {
          refetchAICredits();
          return true;
        }
      }
    }
    
    // Fall back to legacy credits from profiles table
    try {
      const { error } = await supabase.from('profiles').update({
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

    // Check if user has AI image credits first
    const hasAIImageCredits = aiCredits && aiCredits.images_available > 0;
    const hasLegacyCredits = userCredits > 0;
    
    if (imageGenerationCount >= freeImageLimit) {
      if (!hasAIImageCredits && !hasLegacyCredits) {
        toast.error('You have reached your free image limit. Please buy AI credits to continue.');
        setShowBuyCredits(true);
        return;
      }
      
      // If both credit types available, let user choose
      if (hasAIImageCredits && hasLegacyCredits) {
        const source = await promptCreditSource('image', 1, 'Image Generation');
        if (!source) {
          toast.error('No credits available');
          setShowBuyCredits(true);
          return;
        }
        const deducted = await deductFromSource(1, 'image', source);
        if (!deducted) {
          toast.error('Failed to deduct credits');
          return;
        }
      } else {
        const deducted = await deductCredits(1, 'image');
        if (!deducted) {
          toast.error('Failed to deduct credits');
          return;
        }
      }
    }
    setIsGenerating(true);
    setGeneratedImage(null);
    try {
      const selectedAdPreset = AD_PRESETS[adPreset as keyof typeof AD_PRESETS];
      const selectedStylePreset = IMAGE_STYLE_PRESETS[imageStylePreset as keyof typeof IMAGE_STYLE_PRESETS];
      const finalPrompt = prompt.trim() + (selectedStylePreset?.promptSuffix || '') + (selectedAdPreset?.promptSuffix || '');

      const { data, error } = await supabase.functions.invoke('ai-generate', {
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
      const { data, error } = await supabase.functions.invoke('ai-generate', {
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
      const { data, error } = await supabase.functions.invoke('ai-generate', {
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
    
    // Check if user has AI video minutes first
    const hasAIVideoMinutes = aiCredits && Number(aiCredits.video_minutes_available) >= 0.5;
    const hasLegacyCredits = userCredits >= videoCreditCost;
    
    if (!hasAIVideoMinutes && !hasLegacyCredits) {
      toast.error(`You need AI video minutes or at least ${videoCreditCost} credits to generate a video`);
      setShowBuyCredits(true);
      return;
    }
    
    // If both credit types available, let user choose
    let deducted = false;
    if (hasAIVideoMinutes && hasLegacyCredits) {
      const source = await promptCreditSource('video', videoCreditCost, 'Video Generation');
      if (!source) {
        toast.error('No credits available');
        setShowBuyCredits(true);
        return;
      }
      deducted = await deductFromSource(videoCreditCost, 'video', source);
    } else {
      deducted = await deductCredits(videoCreditCost, 'video');
    }
    
    if (!deducted) {
      toast.error('Failed to deduct credits');
      return;
    }
    
    setIsGenerating(true);
    setGeneratedVideo(null);
    try {
      toast.info('Generating video... This may take a minute.');
      const { data, error } = await supabase.functions.invoke('text-to-video', {
        body: {
          prompt: videoPrompt.trim(),
          duration: 5,
          aspectRatio: videoAspectRatio,
          provider: videoProvider
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
    
    // Check if user has AI audio minutes first
    const hasAIAudioMinutes = aiCredits && Number(aiCredits.audio_minutes_available) >= 0.5;
    const hasLegacyCredits = userCredits >= musicCreditCost;
    
    if (!hasAIAudioMinutes && !hasLegacyCredits) {
      toast.error(`You need AI audio minutes or at least ${musicCreditCost} credits to generate music`);
      setShowBuyCredits(true);
      return;
    }
    
    // If both credit types available, let user choose
    let deducted = false;
    if (hasAIAudioMinutes && hasLegacyCredits) {
      const source = await promptCreditSource('audio', musicCreditCost, 'Music Generation');
      if (!source) {
        toast.error('No credits available');
        setShowBuyCredits(true);
        return;
      }
      deducted = await deductFromSource(musicCreditCost, 'audio', source);
    } else {
      deducted = await deductCredits(musicCreditCost, 'audio');
    }
    
    if (!deducted) {
      toast.error('Failed to deduct credits');
      return;
    }
    
    setIsGenerating(true);
    setGeneratedMusic(null);
    setMusicTitle(null);
    try {
      toast.info('Generating music... This may take a minute.');
      const { data, error } = await supabase.functions.invoke('generate-music', {
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
    
    // Check if user has AI image credits first for enhancement
    const hasAIImageCredits = aiCredits && aiCredits.images_available >= enhanceCreditCost;
    
    if (!hasAIImageCredits && userCredits < enhanceCreditCost) {
      toast.error(`You need AI image credits or at least ${enhanceCreditCost} credits to enhance images`);
      setShowBuyCredits(true);
      return;
    }

    setIsEnhancing(true);
    setEnhancedResult(null);

    try {
      const deducted = await deductCredits(enhanceCreditCost, 'image');
      if (!deducted) {
        toast.error('Failed to deduct credits');
        return;
      }

      toast.info('Enhancing your image...');

      const { data, error } = await supabase.functions.invoke('enhance-image', {
        body: {
          imageUrl: enhanceImage,
          operation: enhanceOperation,
          newBackgroundPrompt: enhanceOperation === 'change-background' ? newBackgroundPrompt : undefined
        }
      });

      if (error) throw error;

      if (data?.imageUrl) {
        setEnhancedResult(data.imageUrl);
        await trackGeneration('image-enhance', enhanceCreditCost);
        toast.success('Image enhanced successfully!');
      } else if (data?.error) {
        throw new Error(data.error);
      } else {
        throw new Error('No result returned');
      }
    } catch (error: any) {
      console.error('Enhancement error:', error);
      toast.error(error.message || 'Failed to enhance image');
      await supabase.from('profiles').update({
        credits: userCredits
      }).eq('id', user.id);
      fetchUserCredits();
    } finally {
      setIsEnhancing(false);
    }
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

    const creditCost = Math.ceil(animationDuration / 2) * 5;
    
    // Check if user has AI video minutes for animation
    const minutesNeeded = animationDuration / 60;
    const hasAIVideoMinutes = aiCredits && Number(aiCredits.video_minutes_available) >= minutesNeeded;
    
    if (!hasAIVideoMinutes && userCredits < creditCost) {
      toast.error(`You need AI video minutes or at least ${creditCost} credits to animate this image`);
      setShowBuyCredits(true);
      return;
    }

    setIsAnimating(true);
    setAnimatedVideoUrl(null);

    try {
      const deducted = await deductCredits(creditCost, 'video');
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

  // Handle home input submit - go to research with the query
  const handleHomeSubmit = () => {
    if (!homeInputValue.trim()) return;
    setActiveTab('research');
    // The DeepResearchAssistant will need to receive this - for now we switch tabs
    toast.info('Starting your research...');
  };

  // Login required wall for non-authenticated users
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-border/50 bg-card/50 backdrop-blur-sm">
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
      </div>
    );
  }

  return (
    <div className="min-h-screen beehive-bg flex pb-20">
      {/* Left Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col bg-card border-r border-border/50 transition-all duration-300",
        sidebarOpen ? "w-64" : "w-0 md:w-16"
      )}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <div className={cn("flex items-center gap-2", !sidebarOpen && "md:hidden")}>
            {appLogo && <img src={appLogo} alt="Logo" className="h-8 w-8 object-contain rounded-lg" />}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="h-8 w-8"
          >
            {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation Items */}
        <ScrollArea className="flex-1 py-4">
          <nav className="space-y-1.5 px-2">
            <TooltipProvider delayDuration={0}>
              {navItems.map((item) => (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        setActiveTab(item.id);
                        if (window.innerWidth < 768) setSidebarOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden",
                        activeTab === item.id
                          ? `bg-gradient-to-r ${item.gradient} text-white shadow-lg shadow-${item.gradient.split('-')[1]}-500/30`
                          : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                      )}
                    >
                      {activeTab === item.id && (
                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                      <div className={cn(
                        "flex items-center justify-center w-8 h-8 rounded-lg transition-all",
                        activeTab === item.id
                          ? "bg-white/20"
                          : `bg-gradient-to-br ${item.gradient} shadow-sm`
                      )}>
                        <item.icon className={cn(
                          "h-4 w-4 flex-shrink-0",
                          activeTab === item.id ? "text-white" : "text-white"
                        )} />
                      </div>
                      <span className={cn("flex-1 text-left", !sidebarOpen && "md:hidden")}>
                        {item.label}
                      </span>
                      {item.premium && (
                        <Crown className={cn(
                          "h-3 w-3",
                          activeTab === item.id ? "text-white" : "text-yellow-500",
                          !sidebarOpen && "md:hidden"
                        )} />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent 
                    side="right" 
                    className={cn(
                      "bg-background border shadow-lg z-50",
                      sidebarOpen && "md:hidden" // Only show tooltip when sidebar is collapsed
                    )}
                  >
                    <p className="font-medium">{item.label}</p>
                    {item.premium && <p className="text-xs text-muted-foreground">Premium Feature</p>}
                  </TooltipContent>
                </Tooltip>
              ))}
            </TooltipProvider>
          </nav>
        </ScrollArea>

        {/* Sidebar Footer - AI Credits Display */}
        <div className={cn("p-3 border-t border-border/50 space-y-3", !sidebarOpen && "md:hidden")}>
          <AICreditsDisplay />
          <Button
            onClick={() => setShowBuyCredits(true)}
            variant="outline"
            size="sm"
            className="w-full gap-2"
          >
            <ShoppingCart className="h-3 w-3" />
            Buy AI Credits
          </Button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className={cn(
        "flex-1 transition-all duration-300",
        sidebarOpen ? "ml-64" : "ml-0 md:ml-16"
      )}>
        {/* Top Bar for mobile */}
        <div className="sticky top-0 z-30 flex items-center justify-between p-4 bg-background/80 backdrop-blur-sm border-b border-border/50 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          {appLogo && <img src={appLogo} alt="Logo" className="h-6 w-6 object-contain rounded" />}
          <div className="flex items-center gap-2">
            {/* Show AI Credits if available */}
            {aiCredits && (aiCredits.total_credits > 0 || aiCredits.images_available > 0) ? (
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="gap-1 text-xs">
                  <ImageIcon className="h-3 w-3 text-blue-500" />
                  {aiCredits.images_available}
                </Badge>
                <Badge variant="outline" className="gap-1 text-xs">
                  <VideoIcon className="h-3 w-3 text-purple-500" />
                  {Number(aiCredits.video_minutes_available).toFixed(1)}m
                </Badge>
                <Badge variant="outline" className="gap-1 text-xs">
                  <Music className="h-3 w-3 text-green-500" />
                  {Number(aiCredits.audio_minutes_available).toFixed(1)}m
                </Badge>
              </div>
            ) : (
              <Badge variant="outline" className="gap-1">
                <Crown className="h-3 w-3 text-yellow-500" />
                {userCredits}
              </Badge>
            )}
          </div>
        </div>

        {/* Desktop Credits Bar - Shows when sidebar is collapsed */}
        <div className={cn(
          "hidden md:flex items-center justify-between p-3 bg-background/80 backdrop-blur-sm border-b border-border/50",
          sidebarOpen && "md:hidden"
        )}>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            <span className="font-semibold">AI Hub</span>
          </div>
          <div className="flex items-center gap-2">
            {aiCredits && (aiCredits.total_credits > 0 || aiCredits.images_available > 0) ? (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1.5 text-sm py-1">
                  <ImageIcon className="h-3.5 w-3.5 text-blue-500" />
                  <span>{aiCredits.images_available} images</span>
                </Badge>
                <Badge variant="outline" className="gap-1.5 text-sm py-1">
                  <VideoIcon className="h-3.5 w-3.5 text-purple-500" />
                  <span>{Number(aiCredits.video_minutes_available).toFixed(1)} min</span>
                </Badge>
                <Badge variant="outline" className="gap-1.5 text-sm py-1">
                  <Music className="h-3.5 w-3.5 text-green-500" />
                  <span>{Number(aiCredits.audio_minutes_available).toFixed(1)} min</span>
                </Badge>
              </div>
            ) : (
              <Badge variant="outline" className="gap-1.5 text-sm py-1">
                <Crown className="h-3.5 w-3.5 text-yellow-500" />
                <span>{userCredits} credits</span>
              </Badge>
            )}
            <Button
              onClick={() => setShowBuyCredits(true)}
              variant="outline"
              size="sm"
              className="gap-1.5"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              Buy Credits
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="min-h-[calc(100vh-60px)] md:min-h-screen">
          {/* Home - Gallery Style Landing */}
          {activeTab === 'home' && (
            <AIHubGallery 
              onNavigate={(tab, prompt) => {
                setActiveTab(tab === 'deep-research' ? 'research' : tab);
                if (prompt) {
                  if (tab === 'text-to-video') {
                    setVideoPrompt(prompt);
                  } else if (tab === 'text-to-image') {
                    setPrompt(prompt);
                  } else if (tab === 'deep-research') {
                    setInitialResearchQuery(prompt);
                  }
                }
              }}
              userCredits={userCredits}
            />
          )}

          {/* Binary Affiliate Tab */}
          {activeTab === 'affiliate' && (
            <div className="p-4 md:p-6">
              <BinaryAffiliateTab onBuyCredits={() => setShowBuyCredits(true)} />
            </div>
          )}

          {/* Deep Research Assistant */}
          {activeTab === 'research' && (
            <div className="p-4 md:p-6">
              <DeepResearchAssistant 
                onCreateVideo={handleCreateVideoFromResearch} 
                initialQuery={initialResearchQuery}
              />
            </div>
          )}

          {/* GPT-5 Chat Assistant */}
          {activeTab === 'chat' && (
            <div className="p-4 md:p-6">
              <AdvancedChatAssistant />
            </div>
          )}

          {/* Business Solutions */}
          {activeTab === 'business' && (
            <div className="p-4 md:p-6">
              <BusinessSolutions userCredits={userCredits} onCreditsChange={fetchUserCredits} />
            </div>
          )}

          {/* Text to Image */}
          {activeTab === 'text-to-image' && (
            <div className="p-4 md:p-6 max-w-4xl mx-auto">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wand2 className="h-5 w-5 text-primary" />
                    Text to Image
                    {remainingFreeImages > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {remainingFreeImages} free left
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Describe what you want to create and let AI generate it for you.
                    {remainingFreeImages === 0 && userCredits > 0 && (
                      <span className="text-amber-500"> (1 credit per image)</span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Your Prompt</Label>
                    <Textarea
                      placeholder="A majestic dragon flying over a crystal lake at sunset..."
                      value={prompt}
                      onChange={e => setPrompt(e.target.value)}
                      className="min-h-[120px] resize-none"
                    />
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
                        <SelectItem value="none" className="text-sm">📷 Normal Image</SelectItem>
                        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Social Media</div>
                        <SelectItem value="facebook-feed" className="text-sm">📘 Facebook Feed (1200×628)</SelectItem>
                        <SelectItem value="facebook-story" className="text-sm">📱 FB/IG Story (1080×1920)</SelectItem>
                        <SelectItem value="instagram-square" className="text-sm">📸 IG Square (1080×1080)</SelectItem>
                        <SelectItem value="instagram-post" className="text-sm">📲 IG Post (1080×1350)</SelectItem>
                        <SelectItem value="twitter-post" className="text-sm">🐦 Twitter/X (1600×900)</SelectItem>
                        <SelectItem value="tiktok-ad" className="text-sm">🎵 TikTok (1080×1920)</SelectItem>
                        <SelectItem value="pinterest-pin" className="text-sm">📌 Pinterest (1000×1500)</SelectItem>
                        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">YouTube</div>
                        <SelectItem value="youtube-thumbnail" className="text-sm">▶️ YT Thumbnail (1280×720)</SelectItem>
                        <SelectItem value="youtube-banner" className="text-sm">🎬 YT Banner (2560×1440)</SelectItem>
                        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Ads</div>
                        <SelectItem value="google-display" className="text-sm">🔲 Google Display (300×250)</SelectItem>
                        <SelectItem value="google-leaderboard" className="text-sm">📏 Google Banner (728×90)</SelectItem>
                        <SelectItem value="linkedin-sponsored" className="text-sm">💼 LinkedIn (1200×627)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Reference Image Upload */}
                  <div className="space-y-2">
                    <Label>Reference Image (Optional)</Label>
                    <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={e => handleImageUpload(e, 'reference')}
                        className="hidden"
                        id="reference-upload"
                      />
                      <label htmlFor="reference-upload" className="cursor-pointer space-y-2 block">
                        <ImagePlus className="h-8 w-8 mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Upload a reference image</p>
                      </label>
                    </div>
                    {referenceImage && (
                      <div className="relative">
                        <img src={referenceImage} alt="Reference" className="max-h-32 mx-auto rounded-lg" />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-0 right-0 h-6 w-6"
                          onClick={() => setReferenceImage(null)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={handleTextToImage}
                    disabled={isGenerating || !canGenerateImage()}
                    className="w-full gap-2"
                    size="lg"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Generate Image
                      </>
                    )}
                  </Button>

                  {generatedImage && (
                    <div className="space-y-4">
                      <div className="relative group">
                        <img
                          src={generatedImage}
                          alt="Generated"
                          className="w-full rounded-lg border"
                        />
                        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="sm" variant="secondary" onClick={downloadImage}>
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => copyToClipboard(generatedImage)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Animate Section */}
                      <Card className="border-primary/20">
                        <CardHeader className="py-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Film className="h-4 w-4" />
                            Animate this Image
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center gap-4">
                            <Label className="text-sm">Duration:</Label>
                            <Select
                              value={animationDuration.toString()}
                              onValueChange={(v) => setAnimationDuration(parseInt(v))}
                            >
                              <SelectTrigger className="w-32 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="2">2 seconds</SelectItem>
                                <SelectItem value="4">4 seconds</SelectItem>
                                <SelectItem value="6">6 seconds</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            onClick={handleAnimateImage}
                            disabled={isAnimating}
                            variant="outline"
                            className="w-full gap-2"
                          >
                            {isAnimating ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Animating...
                              </>
                            ) : (
                              <>
                                <Play className="h-4 w-4" />
                                Animate ({Math.ceil(animationDuration / 2) * 5} credits)
                              </>
                            )}
                          </Button>
                        </CardContent>
                      </Card>

                      {animatedVideoUrl && (
                        <div className="space-y-2">
                          <Label>Animated Video</Label>
                          <video
                            src={animatedVideoUrl}
                            controls
                            className="w-full rounded-lg border"
                          />
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" asChild>
                              <a href={animatedVideoUrl} download>
                                <Download className="h-4 w-4 mr-1" />
                                Download
                              </a>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openVideoEditor(animatedVideoUrl, 'video')}
                            >
                              <Scissors className="h-4 w-4 mr-1" />
                              Edit in Editor
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Text to Video */}
          {activeTab === 'text-to-video' && (
            <div className="p-4 md:p-6 max-w-4xl mx-auto">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <VideoIcon className="h-5 w-5 text-purple-500" />
                    Text to Video
                    <Badge variant="outline" className="ml-2">
                      {videoCreditCost} credits
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Describe your video and AI will create it for you.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Video Prompt</Label>
                    <Textarea
                      placeholder="A serene beach at sunset with waves gently rolling in..."
                      value={videoPrompt}
                      onChange={e => setVideoPrompt(e.target.value)}
                      className="min-h-[120px] resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Aspect Ratio</Label>
                      <Select value={videoAspectRatio} onValueChange={setVideoAspectRatio}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(VIDEO_ASPECT_RATIOS).map(([key, val]) => (
                            <SelectItem key={key} value={key}>
                              {val.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label>AI Provider</Label>
                      <Select value={videoProvider} onValueChange={(v: 'gemini' | 'openai') => setVideoProvider(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gemini">Google Veo3</SelectItem>
                          <SelectItem value="openai">OpenAI</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    onClick={handleTextToVideo}
                    disabled={isGenerating || !canGenerateVideo()}
                    className="w-full gap-2"
                    size="lg"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating Video...
                      </>
                    ) : (
                      <>
                        <VideoIcon className="h-4 w-4" />
                        Generate Video ({videoCreditCost} credits)
                      </>
                    )}
                  </Button>

                  {generatedVideo && (
                    <div className="space-y-2">
                      <video src={generatedVideo} controls className="w-full rounded-lg border" />
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <a href={generatedVideo} download>
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </a>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openVideoEditor(generatedVideo, 'video')}
                        >
                          <Scissors className="h-4 w-4 mr-1" />
                          Edit in Editor
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Text to Music */}
          {activeTab === 'text-to-music' && (
            <div className="p-4 md:p-6 max-w-4xl mx-auto">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Music className="h-5 w-5 text-pink-500" />
                    Text to Music
                    <Badge variant="outline" className="ml-2">
                      {musicCreditCost} credits
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Describe the music you want and AI will compose it.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Music Description</Label>
                    <Textarea
                      placeholder="An upbeat electronic dance track with synthesizers and a catchy melody..."
                      value={musicPrompt}
                      onChange={e => setMusicPrompt(e.target.value)}
                      className="min-h-[120px] resize-none"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="instrumental"
                      checked={isInstrumental}
                      onChange={(e) => setIsInstrumental(e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="instrumental">Instrumental only (no vocals)</Label>
                  </div>

                  <Button
                    onClick={handleGenerateMusic}
                    disabled={isGenerating || userCredits < musicCreditCost}
                    className="w-full gap-2"
                    size="lg"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Composing...
                      </>
                    ) : (
                      <>
                        <Music className="h-4 w-4" />
                        Generate Music ({musicCreditCost} credits)
                      </>
                    )}
                  </Button>

                  {generatedMusic && (
                    <div className="space-y-2">
                      {musicTitle && <p className="font-medium">{musicTitle}</p>}
                      <audio src={generatedMusic} controls className="w-full" />
                      <Button variant="outline" size="sm" asChild>
                        <a href={generatedMusic} download>
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </a>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Image Enhancement */}
          {activeTab === 'enhance' && (
            <div className="p-4 md:p-6 max-w-4xl mx-auto">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Image Enhancement
                    <Badge variant="outline" className="ml-2">
                      {enhanceCreditCost} credits
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Enhance, restore, or modify your images with AI.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Upload Image</Label>
                    <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={e => handleImageUpload(e, 'enhance')}
                        className="hidden"
                        id="enhance-upload"
                      />
                      <label htmlFor="enhance-upload" className="cursor-pointer space-y-2 block">
                        <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Click to upload an image</p>
                      </label>
                    </div>
                    {enhanceImage && (
                      <div className="relative">
                        <img src={enhanceImage} alt="To enhance" className="max-h-48 mx-auto rounded-lg" />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-0 right-0 h-6 w-6"
                          onClick={() => setEnhanceImage(null)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label>Enhancement Type</Label>
                    <Select value={enhanceOperation} onValueChange={setEnhanceOperation}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="enhance">✨ Enhance Quality</SelectItem>
                        <SelectItem value="remove-background">🔲 Remove Background</SelectItem>
                        <SelectItem value="change-background">🖼️ Change Background</SelectItem>
                        <SelectItem value="restore">🔧 Restore Old Photo</SelectItem>
                        <SelectItem value="upscale">📐 Upscale (2x)</SelectItem>
                        <SelectItem value="colorize">🎨 Colorize (B&W to Color)</SelectItem>
                        <SelectItem value="fix-lighting">💡 Fix Lighting</SelectItem>
                        <SelectItem value="remove-noise">🔇 Remove Noise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {enhanceOperation === 'change-background' && (
                    <div className="space-y-2">
                      <Label>New Background Description</Label>
                      <Textarea
                        placeholder="A beautiful sunset beach..."
                        value={newBackgroundPrompt}
                        onChange={e => setNewBackgroundPrompt(e.target.value)}
                        className="min-h-[80px] resize-none"
                      />
                    </div>
                  )}

                  <Button
                    onClick={handleEnhanceImage}
                    disabled={isEnhancing || !enhanceImage || userCredits < enhanceCreditCost}
                    className="w-full gap-2"
                    size="lg"
                  >
                    {isEnhancing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Enhance Image ({enhanceCreditCost} credits)
                      </>
                    )}
                  </Button>

                  {enhancedResult && (
                    <div className="space-y-2">
                      <Label>Enhanced Result</Label>
                      <img src={enhancedResult} alt="Enhanced" className="w-full rounded-lg border" />
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <a href={enhancedResult} download>
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </a>
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => copyToClipboard(enhancedResult)}>
                          <Copy className="h-4 w-4 mr-1" />
                          Copy URL
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Image to Text */}
          {activeTab === 'image-to-text' && (
            <div className="p-4 md:p-6 max-w-4xl mx-auto">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-primary" />
                    Image Analysis
                  </CardTitle>
                  <CardDescription>
                    Upload an image and AI will analyze and describe it.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={e => handleImageUpload(e, 'image')}
                        className="hidden"
                        id="image-analysis-upload"
                      />
                      <label htmlFor="image-analysis-upload" className="cursor-pointer space-y-2 block">
                        <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Click to upload an image</p>
                      </label>
                    </div>
                    {uploadedImage && (
                      <img src={uploadedImage} alt="Uploaded" className="max-h-64 mx-auto rounded-lg" />
                    )}
                  </div>

                  <Button
                    onClick={handleImageToText}
                    disabled={isGenerating || !uploadedImage}
                    className="w-full gap-2"
                    size="lg"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Analyze Image
                      </>
                    )}
                  </Button>

                  {imageDescription && (
                    <div className="space-y-2">
                      <Label>Analysis Result</Label>
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm whitespace-pre-wrap">{imageDescription}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => copyToClipboard(imageDescription)}>
                        <Copy className="h-4 w-4 mr-1" />
                        Copy
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Video to Text */}
          {activeTab === 'video-to-text' && (
            <div className="p-4 md:p-6 max-w-4xl mx-auto">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TypeIcon className="h-5 w-5 text-primary" />
                    Video Analysis
                  </CardTitle>
                  <CardDescription>
                    Upload a video and AI will analyze and describe it.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                      <Input
                        type="file"
                        accept="video/*"
                        onChange={e => handleImageUpload(e, 'video')}
                        className="hidden"
                        id="video-analysis-upload"
                      />
                      <label htmlFor="video-analysis-upload" className="cursor-pointer space-y-2 block">
                        <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Click to upload a video</p>
                      </label>
                    </div>
                    {uploadedVideo && (
                      <video src={uploadedVideo} controls className="max-h-64 mx-auto rounded-lg" />
                    )}
                  </div>

                  <Button
                    onClick={handleVideoToText}
                    disabled={isGenerating || !uploadedVideo}
                    className="w-full gap-2"
                    size="lg"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Analyze Video
                      </>
                    )}
                  </Button>

                  {videoDescription && (
                    <div className="space-y-2">
                      <Label>Analysis Result</Label>
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm whitespace-pre-wrap">{videoDescription}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => copyToClipboard(videoDescription)}>
                        <Copy className="h-4 w-4 mr-1" />
                        Copy
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Content Creator */}
          {activeTab === 'content-creator' && (
            <div className="p-4 md:p-6">
              <ContentCreator
                userCredits={userCredits}
                onCreditsChange={fetchUserCredits}
              />
            </div>
          )}

          {/* Video Editor */}
          {activeTab === 'video-editor' && (
            <div className="p-4 md:p-6 max-w-4xl mx-auto">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Scissors className="h-5 w-5 text-purple-500" />
                    Video Editor
                    <Badge variant="outline" className="ml-2 gap-1">
                      <Lock className="h-3 w-3" />
                      10 credits
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Edit your videos or images with professional tools.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {userCredits < 10 ? (
                    <div className="text-center py-8 space-y-4">
                      <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
                      <p className="text-muted-foreground">You need at least 10 credits to use the Video Editor</p>
                      <Button onClick={() => setShowBuyCredits(true)} className="gap-2">
                        <ShoppingCart className="h-4 w-4" />
                        Buy Credits
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        {/* Upload Video */}
                        <div className="space-y-3">
                          <Label>Upload Video</Label>
                          <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                            <Input
                              type="file"
                              accept="video/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setEditorMediaUrl(reader.result as string);
                                    setEditorMediaType('video');
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                              className="hidden"
                              id="editor-video-upload"
                            />
                            <label htmlFor="editor-video-upload" className="cursor-pointer space-y-2 block">
                              <VideoIcon className="h-10 w-10 mx-auto text-muted-foreground" />
                              <p className="text-sm text-muted-foreground">Click to upload a video</p>
                            </label>
                          </div>
                        </div>

                        {/* Upload Image */}
                        <div className="space-y-3">
                          <Label>Upload Image</Label>
                          <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setEditorMediaUrl(reader.result as string);
                                    setEditorMediaType('image');
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                              className="hidden"
                              id="editor-image-upload"
                            />
                            <label htmlFor="editor-image-upload" className="cursor-pointer space-y-2 block">
                              <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground" />
                              <p className="text-sm text-muted-foreground">Click to upload an image</p>
                            </label>
                          </div>
                        </div>
                      </div>

                      {editorMediaUrl && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-green-500 border-green-500">
                              {editorMediaType === 'video' ? 'Video' : 'Image'} Ready
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditorMediaUrl('')}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          {editorMediaType === 'video' ? (
                            <video src={editorMediaUrl} controls className="w-full max-h-64 rounded-lg border" />
                          ) : (
                            <img src={editorMediaUrl} alt="Preview" className="w-full max-h-64 object-contain rounded-lg border" />
                          )}
                        </div>
                      )}

                      <Button
                        onClick={async () => {
                          if (!editorMediaUrl) {
                            toast.error('Please upload a video or image first');
                            return;
                          }
                          const { error } = await supabase
                            .from('profiles')
                            .update({ credits: userCredits - 10 })
                            .eq('id', user?.id);
                          if (error) {
                            toast.error('Failed to deduct credits');
                            return;
                          }
                          setUserCredits(prev => prev - 10);
                          setShowVideoEditor(true);
                          toast.success('Opening Video Editor...');
                        }}
                        disabled={!editorMediaUrl}
                        className="w-full gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                        size="lg"
                      >
                        <Scissors className="h-4 w-4" />
                        Open Video Editor (10 credits)
                      </Button>

                      <p className="text-xs text-muted-foreground text-center">
                        Features: Trim, split, add text overlays, filters, color grading, and more. Export when done.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Website Scraper - Premium */}
          {activeTab === 'web-scraper' && (
            <div className="p-4 md:p-6">
              <WebsiteScraper userCredits={userCredits} onCreditsChange={fetchUserCredits} />
            </div>
          )}

          {/* Website Builder - Premium */}
          {activeTab === 'website-builder' && (
            <div className="p-4 md:p-6">
              <WebsiteBuilder userCredits={userCredits} onCreditsChange={fetchUserCredits} />
            </div>
          )}

          {/* Creator Analytics - Premium */}
          {activeTab === 'creator-analytics' && (
            <div className="p-4 md:p-6">
              <CreatorAnalytics userCredits={userCredits} onCreditsChange={fetchUserCredits} />
            </div>
          )}

          {/* Social Media Manager - Premium */}
          {activeTab === 'social-media' && (
            <div className="p-4 md:p-6">
              <SocialMediaManager userCredits={userCredits} onCreditsChange={fetchUserCredits} />
            </div>
          )}

          {/* AI Ads Maker - Premium (Paid Affiliates Only) */}
          {activeTab === 'ads-maker' && (
            <div className="p-4 md:p-6">
              <AdsMaker userCredits={userCredits} onCreditsChange={() => { fetchUserCredits(); refetchAICredits(); }} />
            </div>
          )}

          {/* Blog Content Maker - Premium */}
          {activeTab === 'blog-maker' && (
            <div className="p-4 md:p-6">
              <BlogContentMaker userCredits={userCredits} onCreditsChange={() => { fetchUserCredits(); refetchAICredits(); }} />
            </div>
          )}

          {/* Market Analysis - Premium */}
          {activeTab === 'market-analysis' && (
            <div className="p-4 md:p-6">
              <MarketAnalysis userCredits={userCredits} onCreditsChange={() => { fetchUserCredits(); refetchAICredits(); }} />
            </div>
          )}

          {/* Contact Us - AI Assistant */}
          {activeTab === 'contact' && (
            <div className="p-4 md:p-6 h-[calc(100vh-120px)]">
              <ContactUsAssistant />
            </div>
          )}
        </div>
      </main>

      {/* Buy Credits Dialog */}
      <BuyAICreditsDialog
        open={showBuyCredits}
        onOpenChange={setShowBuyCredits}
        onPurchaseComplete={() => {
          fetchUserCredits();
          refetchAICredits();
        }}
      />

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

      {/* Credit Source Selection Dialog */}
      {pendingCreditAction && (
        <CreditSourceDialog
          open={showCreditSourceDialog}
          onOpenChange={(open) => {
            setShowCreditSourceDialog(open);
            if (!open && pendingCreditAction) {
              pendingCreditAction.callback('ai_credits');
              setPendingCreditAction(null);
            }
          }}
          onConfirm={(source) => {
            if (pendingCreditAction) {
              pendingCreditAction.callback(source);
            }
          }}
          aiCreditsAvailable={
            pendingCreditAction.type === 'image' 
              ? aiCredits?.images_available || 0
              : pendingCreditAction.type === 'video'
              ? Number(aiCredits?.video_minutes_available || 0)
              : pendingCreditAction.type === 'audio'
              ? Number(aiCredits?.audio_minutes_available || 0)
              : 0
          }
          legacyCreditsAvailable={userCredits}
          creditCost={pendingCreditAction.cost}
          serviceType={pendingCreditAction.type}
          serviceName={pendingCreditAction.serviceName}
        />
      )}
    </div>
  );
});

AIHub.displayName = 'AIHub';
export default AIHub;
