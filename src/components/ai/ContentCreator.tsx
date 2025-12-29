import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAICredits } from '@/hooks/useAICredits';
import { 
  Sparkles, 
  FileText, 
  Mic, 
  Image as ImageIcon, 
  Video, 
  Music, 
  Upload, 
  Loader2, 
  ChevronRight,
  Play,
  Download,
  Share2,
  Lock,
  RefreshCw,
  Eye,
  Camera,
  X,
  User,
  UserCircle,
  Save,
  FolderOpen,
  Send
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import SocialMediaPublisher from './SocialMediaPublisher';

interface Scene {
  sceneNumber: number;
  visualDescription: string;
  voiceOver: string;
  durationSeconds: number;
  musicMood: string;
}

interface Script {
  title: string;
  description: string;
  hashtags: string[];
  callToAction: string;
  totalDuration: number;
  scenes: Scene[];
}

interface ContentCreatorProps {
  userCredits: number;
  onCreditsChange: () => void;
  externalResearch?: string | null;
  externalTopic?: string | null;
}

// Google Cloud TTS voices - one male, one female per language
const VOICES = [
  { name: 'Emma (Female)', id: 'en-US-Neural2-C', gender: 'FEMALE', lang: 'en' },
  { name: 'James (Male)', id: 'en-US-Neural2-D', gender: 'MALE', lang: 'en' },
  { name: 'Sofia (Female)', id: 'es-ES-Neural2-A', gender: 'FEMALE', lang: 'es' },
  { name: 'Carlos (Male)', id: 'es-ES-Neural2-B', gender: 'MALE', lang: 'es' },
  { name: 'Marie (Female)', id: 'fr-FR-Neural2-A', gender: 'FEMALE', lang: 'fr' },
  { name: 'Pierre (Male)', id: 'fr-FR-Neural2-B', gender: 'MALE', lang: 'fr' },
  { name: 'Anna (Female)', id: 'de-DE-Neural2-A', gender: 'FEMALE', lang: 'de' },
  { name: 'Hans (Male)', id: 'de-DE-Neural2-B', gender: 'MALE', lang: 'de' },
  { name: 'Yuki (Female)', id: 'ja-JP-Neural2-B', gender: 'FEMALE', lang: 'ja' },
  { name: 'Kenji (Male)', id: 'ja-JP-Neural2-C', gender: 'MALE', lang: 'ja' },
  { name: 'Maria (Female)', id: 'fil-PH-Standard-A', gender: 'FEMALE', lang: 'fil' },
  { name: 'Jose (Male)', id: 'fil-PH-Standard-C', gender: 'MALE', lang: 'fil' },
  { name: 'Priya (Female)', id: 'hi-IN-Neural2-A', gender: 'FEMALE', lang: 'hi' },
  { name: 'Raj (Male)', id: 'hi-IN-Neural2-B', gender: 'MALE', lang: 'hi' },
  { name: 'Mei (Female)', id: 'cmn-CN-Standard-A', gender: 'FEMALE', lang: 'zh' },
  { name: 'Wei (Male)', id: 'cmn-CN-Standard-B', gender: 'MALE', lang: 'zh' },
  { name: 'Ingrid (Female)', id: 'sv-SE-Standard-A', gender: 'FEMALE', lang: 'sv' },
  { name: 'Erik (Male)', id: 'sv-SE-Standard-D', gender: 'MALE', lang: 'sv' },
];

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ar', name: 'Arabic' },
  { code: 'fil', name: 'Filipino' },
  { code: 'sv', name: 'Swedish' },
];

const VIDEO_DURATIONS = [
  { seconds: 15, label: '15 seconds', credits: 5 },
  { seconds: 30, label: '30 seconds', credits: 10 },
  { seconds: 60, label: '1 minute', credits: 18 },
  { seconds: 180, label: '3 minutes', credits: 50 },
  { seconds: 300, label: '5 minutes', credits: 80 },
  { seconds: 600, label: '10 minutes', credits: 150 },
  { seconds: 900, label: '15 minutes', credits: 220 },
];

const ContentCreator = ({ userCredits, onCreditsChange, externalResearch, externalTopic }: ContentCreatorProps) => {
  const { user } = useAuth();
  const { 
    credits: aiCredits, 
    refetch: refetchAICredits,
    deductImageCredit,
    deductVideoMinutes,
    deductAudioMinutes
  } = useAICredits();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isPaidAffiliate, setIsPaidAffiliate] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  
  // Step 1: Topic
  const [topic, setTopic] = useState('');
  const [research, setResearch] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageAnalysis, setImageAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check paid affiliate status
  useEffect(() => {
    const checkPaidStatus = async () => {
      if (!user) {
        setIsCheckingStatus(false);
        return;
      }
      
      try {
        const { data } = await supabase
          .from('profiles')
          .select('is_paid_affiliate, is_verified_seller')
          .eq('id', user.id)
          .single();
        
        setIsPaidAffiliate(data?.is_paid_affiliate === true || data?.is_verified_seller === true);
      } catch (error) {
        console.error('Error checking paid status:', error);
      } finally {
        setIsCheckingStatus(false);
      }
    };
    
    checkPaidStatus();
  }, [user]);

  // Effect to handle external research from Deep Research Assistant
  useEffect(() => {
    if (externalResearch && externalTopic) {
      setTopic(externalTopic);
      setResearch(externalResearch);
      setCurrentStep(2); // Skip to script generation step
      toast.success('Research imported! Ready to generate script.');
    }
  }, [externalResearch, externalTopic]);
  
  // Step 2: Script
  const [targetAudience, setTargetAudience] = useState('');
  const [style, setStyle] = useState('engaging and conversational');
  const [numScenes, setNumScenes] = useState(5);
  const [script, setScript] = useState<Script | null>(null);
  
  // Step 3: Voice-over
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0].id);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  // Step 4: Images
  const [imagePrompts, setImagePrompts] = useState<string[]>([]);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  
  // Step 5: Music & Video
  const [musicPrompt, setMusicPrompt] = useState('');
  const [generatedMusicUrl, setGeneratedMusicUrl] = useState<string | null>(null);
  const [isGeneratingMusic, setIsGeneratingMusic] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(VIDEO_DURATIONS[1]);
  const [isRegeneratingImages, setIsRegeneratingImages] = useState(false);
  const [isRegeneratingVideo, setIsRegeneratingVideo] = useState(false);
  const [showVideoPreview, setShowVideoPreview] = useState(false);
  
  // Avatar state
  const [useAvatar, setUseAvatar] = useState(false);
  const [avatarImage, setAvatarImage] = useState<string | null>(null);
  const [isGeneratingAvatarVideo, setIsGeneratingAvatarVideo] = useState(false);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  
  // Video state
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Saved projects state
  const [savedProjects, setSavedProjects] = useState<any[]>([]);
  const [showSavedProjects, setShowSavedProjects] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Social Media Publisher state
  const [showSocialPublisher, setShowSocialPublisher] = useState(false);

  const isPaidUser = isPaidAffiliate;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage(event.target?.result as string);
      setImageAnalysis(null);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyzeImage = async () => {
    if (!uploadedImage) {
      toast.error('Please upload an image first');
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-generate', {
        body: { 
          type: 'image-to-text', 
          imageUrl: uploadedImage 
        }
      });

      if (error) throw error;
      
      const analysis = data.description || data.text || 'Unable to analyze image';
      setImageAnalysis(analysis);
      toast.success('Image analyzed successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to analyze image');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleResearchFromImage = async () => {
    if (!imageAnalysis) {
      toast.error('Please analyze the image first');
      return;
    }

    setIsLoading(true);
    try {
      const topicFromImage = `Based on this image analysis: ${imageAnalysis}`;
      setTopic(topicFromImage);
      
      const { data, error } = await supabase.functions.invoke('content-creator', {
        body: { action: 'research-topic', topic: topicFromImage }
      });

      if (error) throw error;
      setResearch(data.research);
      toast.success('Topic researched from image!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to research topic');
    } finally {
      setIsLoading(false);
    }
  };

  const clearUploadedImage = () => {
    setUploadedImage(null);
    setImageAnalysis(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAvatarImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setAvatarImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const clearAvatarImage = () => {
    setAvatarImage(null);
    if (avatarFileInputRef.current) {
      avatarFileInputRef.current.value = '';
    }
  };

  const handleCreateAvatarVideo = async () => {
    if (!avatarImage) {
      toast.error('Please upload an avatar image first');
      return;
    }

    if (!audioUrl) {
      toast.error('Please generate a voice-over first');
      return;
    }

    const avatarCredits = 15;
    if (userCredits < avatarCredits) {
      toast.error(`You need ${avatarCredits} credits for avatar video`);
      return;
    }

    setIsGeneratingAvatarVideo(true);
    try {
      // First, upload avatar image to get a URL
      const { data: uploadData, error: uploadError } = await supabase.functions.invoke('storage-upload', {
        body: { 
          file: avatarImage,
          bucket: 'avatars',
          path: `content-creator/${user?.id}/${Date.now()}.jpg`
        }
      });

      if (uploadError) throw uploadError;
      const imageUrl = uploadData?.publicUrl || avatarImage;

      // Upload audio to get a URL
      const audioBlob = await fetch(audioUrl).then(r => r.blob());
      const audioBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(audioBlob);
      });

      const { data: audioUploadData, error: audioUploadError } = await supabase.functions.invoke('storage-upload', {
        body: { 
          file: audioBase64,
          bucket: 'audio',
          path: `content-creator/${user?.id}/${Date.now()}.mp3`
        }
      });

      if (audioUploadError) throw audioUploadError;
      const audioFileUrl = audioUploadData?.publicUrl || audioUrl;

      // Generate avatar video using SadTalker
      const { data, error } = await supabase.functions.invoke('avatar-video', {
        body: { 
          imageUrl,
          audioUrl: audioFileUrl,
          enhancer: 'gfpgan'
        }
      });

      if (error) throw error;
      
      if (data?.videoUrl) {
        // Deduct credits
        await supabase
          .from('profiles')
          .update({ credits: userCredits - avatarCredits })
          .eq('id', user?.id);

        setVideoUrl(data.videoUrl);
        onCreditsChange();
        toast.success('Avatar video created successfully!');
      } else {
        throw new Error('No video URL returned');
      }
    } catch (error: any) {
      console.error('Avatar video error:', error);
      toast.error(error.message || 'Failed to create avatar video');
    } finally {
      setIsGeneratingAvatarVideo(false);
    }
  };

  const handleResearchTopic = async () => {
    if (!topic.trim()) {
      toast.error('Please enter a topic');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('content-creator', {
        body: { action: 'research-topic', topic }
      });

      if (error) throw error;
      setResearch(data.research);
      toast.success('Topic researched successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to research topic');
    } finally {
      setIsLoading(false);
    }
  };

  // Save project function
  const handleSaveProject = async () => {
    if (!user) {
      toast.error('Please sign in to save projects');
      return;
    }

    setIsSaving(true);
    try {
      const projectData = {
        user_id: user.id,
        title: script?.title || topic || 'Untitled Project',
        topic,
        research,
        script: script ? JSON.stringify(script) : null,
        images: generatedImages.length > 0 ? generatedImages : null,
        audio_url: audioUrl,
        music_url: generatedMusicUrl,
        video_url: videoUrl,
        voice_id: selectedVoice,
        voice_language: selectedLanguage,
        status: videoUrl ? 'completed' : generatedImages.length > 0 ? 'images_ready' : script ? 'script_ready' : research ? 'research_ready' : 'draft',
      };

      const { error } = await supabase
        .from('content_creator_projects')
        .upsert(projectData, { onConflict: 'id' });

      if (error) throw error;
      toast.success('Project saved successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save project');
    } finally {
      setIsSaving(false);
    }
  };

  // Load saved projects
  const loadSavedProjects = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('content_creator_projects')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setSavedProjects(data || []);
      setShowSavedProjects(true);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load saved projects');
    }
  };

  // Load a specific project
  const loadProject = (project: any) => {
    setTopic(project.topic || '');
    setResearch(project.research || null);
    if (project.script) {
      try {
        setScript(JSON.parse(project.script));
      } catch {
        setScript(null);
      }
    } else {
      setScript(null);
    }
    if (project.images) {
      setGeneratedImages(project.images);
    } else {
      setGeneratedImages([]);
    }
    setAudioUrl(project.audio_url || null);
    setGeneratedMusicUrl(project.music_url || null);
    setVideoUrl(project.video_url || null);
    if (project.voice_id) setSelectedVoice(project.voice_id);
    if (project.voice_language) setSelectedLanguage(project.voice_language);
    
    // Navigate to appropriate step based on saved progress
    if (project.video_url) {
      setCurrentStep(6);
    } else if (project.images?.length > 0) {
      setCurrentStep(5);
    } else if (project.script) {
      setCurrentStep(3);
    } else if (project.research) {
      setCurrentStep(2);
    } else {
      setCurrentStep(1);
    }
    
    setShowSavedProjects(false);
    toast.success('Project loaded!');
  };

  const handleGenerateScript = async () => {
    if (!topic.trim()) {
      toast.error('Please enter a topic first');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('content-creator', {
        body: { 
          action: 'generate-script', 
          topic, 
          targetAudience, 
          style, 
          numScenes 
        }
      });

      if (error) throw error;
      
      if (typeof data.script === 'object') {
        setScript(data.script);
      } else {
        // Parse text response
        try {
          const parsed = JSON.parse(data.script);
          setScript(parsed);
        } catch {
          toast.error('Could not parse script. Please try again.');
        }
      }
      toast.success('Script generated!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate script');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateVoiceover = async () => {
    if (!script) {
      toast.error('Please generate a script first');
      return;
    }

    if (!isPaidUser) {
      toast.error('Voice-over requires credits. Please purchase credits.');
      return;
    }

    const fullText = script.scenes.map(s => s.voiceOver).join(' ');
    const selectedVoiceData = VOICES.find(v => v.id === selectedVoice);
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-tts', {
        body: { 
          action: 'generate',
          text: fullText,
          voiceName: selectedVoice,
          language: selectedLanguage,
          gender: selectedVoiceData?.gender || 'FEMALE'
        }
      });

      if (error) throw error;
      
      // Create audio URL from base64
      const audioBlob = new Blob(
        [Uint8Array.from(atob(data.audioBase64), c => c.charCodeAt(0))],
        { type: 'audio/mpeg' }
      );
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      
      toast.success('Voice-over generated!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate voice-over');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateImages = async () => {
    if (!script) {
      toast.error('Please generate a script first');
      return;
    }

    if (!isPaidUser) {
      toast.error('Image generation requires credits. Please purchase credits.');
      return;
    }

    setIsLoading(true);
    try {
      // First get image prompts
      const { data: promptData, error: promptError } = await supabase.functions.invoke('content-creator', {
        body: { 
          action: 'generate-image-prompts',
          script
        }
      });

      if (promptError) throw promptError;
      
      let prompts: string[] = [];
      try {
        prompts = JSON.parse(promptData.prompts);
      } catch {
        prompts = script.scenes.map(s => s.visualDescription);
      }
      setImagePrompts(prompts);

      // Generate images for each scene - generate ALL scenes requested
      const images: string[] = [];
      const totalScenes = script?.scenes?.length || numScenes;
      for (let i = 0; i < prompts.length && i < totalScenes; i++) {
        toast.info(`Generating image ${i + 1} of ${Math.min(prompts.length, totalScenes)}...`);
        const { data, error } = await supabase.functions.invoke('ai-generate', {
          body: { type: 'text-to-image', prompt: prompts[i] }
        });
        
        if (!error && data.imageUrl) {
          images.push(data.imageUrl);
        }
      }
      
      setGeneratedImages(images);
      toast.success(`Generated ${images.length} images!`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate images');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateVideo = async (isRegenerate = false) => {
    if (!isPaidUser) {
      toast.error('Video creation requires credits. Please purchase credits.');
      return;
    }

    // Check if user has AI video minutes first
    const minutesNeeded = selectedDuration.seconds / 60;
    const hasAIVideoMinutes = aiCredits && Number(aiCredits.video_minutes_available) >= minutesNeeded;
    
    if (!hasAIVideoMinutes && userCredits < selectedDuration.credits) {
      toast.error(`You need AI video minutes or ${selectedDuration.credits} credits for this video length`);
      return;
    }

    if (isRegenerate) {
      setIsRegeneratingVideo(true);
    } else {
      setIsLoading(true);
    }

    try {
      // Try to deduct from AI video minutes first
      let creditDeducted = false;
      if (hasAIVideoMinutes) {
        creditDeducted = await deductVideoMinutes(minutesNeeded);
        if (creditDeducted) {
          refetchAICredits();
        }
      }
      
      // Fall back to legacy credits
      if (!creditDeducted) {
        const { error: creditError } = await supabase
          .from('profiles')
          .update({ credits: userCredits - selectedDuration.credits })
          .eq('id', user?.id);

        if (creditError) throw creditError;
      }

      // Generate video using text-to-video edge function
      const videoPrompt = script 
        ? `Create a video about: ${script.title}. ${script.description}` 
        : topic;

      const { data, error } = await supabase.functions.invoke('text-to-video', {
        body: { 
          prompt: videoPrompt,
          duration: Math.min(selectedDuration.seconds, 8) // API max is 8 seconds per clip
        }
      });

      if (error) throw error;
      
      if (data?.videoUrl) {
        setVideoUrl(data.videoUrl);
        onCreditsChange();
        toast.success(isRegenerate ? 'Video regenerated successfully!' : 'Video created successfully!');
      } else {
        throw new Error('No video URL returned');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create video');
    } finally {
      setIsLoading(false);
      setIsRegeneratingVideo(false);
    }
  };

  const handleRegenerateImages = async () => {
    if (!script) {
      toast.error('Please generate a script first');
      return;
    }

    const regenerateCost = 5;
    
    // Check if user has AI image credits first
    const hasAIImageCredits = aiCredits && aiCredits.images_available >= regenerateCost;
    
    if (!hasAIImageCredits && userCredits < regenerateCost) {
      toast.error(`You need AI image credits or ${regenerateCost} credits to regenerate images`);
      return;
    }

    setIsRegeneratingImages(true);
    try {
      // Try to deduct from AI image credits first
      let creditDeducted = false;
      if (hasAIImageCredits) {
        creditDeducted = await deductImageCredit(regenerateCost);
        if (creditDeducted) {
          refetchAICredits();
        }
      }
      
      // Fall back to legacy credits
      if (!creditDeducted) {
        const { error: creditError } = await supabase
          .from('profiles')
          .update({ credits: userCredits - regenerateCost })
          .eq('id', user?.id);

        if (creditError) throw creditError;
      }

      // Generate new images for ALL scenes
      const images: string[] = [];
      const prompts = imagePrompts.length > 0 
        ? imagePrompts 
        : script.scenes.map(s => s.visualDescription);

      const totalScenes = script.scenes.length;
      for (let i = 0; i < prompts.length && i < totalScenes; i++) {
        toast.info(`Regenerating image ${i + 1} of ${Math.min(prompts.length, totalScenes)}...`);
        const { data, error } = await supabase.functions.invoke('ai-generate', {
          body: { type: 'text-to-image', prompt: prompts[i] }
        });
        
        if (!error && data.imageUrl) {
          images.push(data.imageUrl);
        }
      }
      
      setGeneratedImages(images);
      onCreditsChange();
      toast.success(`Regenerated ${images.length} images!`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to regenerate images');
    } finally {
      setIsRegeneratingImages(false);
    }
  };

  const handleDownloadVideo = () => {
    if (!videoUrl) return;
    
    const link = document.createElement('a');
    link.href = videoUrl;
    link.download = `${script?.title || 'video'}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Video download started!');
  };

  const steps = [
    { num: 1, title: 'Topic Research', icon: FileText },
    { num: 2, title: 'Script', icon: Sparkles },
    { num: 3, title: 'Voice-over', icon: Mic },
    { num: 4, title: 'Images', icon: ImageIcon },
    { num: 5, title: 'Video', icon: Video },
    { num: 6, title: 'Download & Share', icon: Download },
  ];

  if (isCheckingStatus) {
    return (
      <Card className="p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground mt-2">Checking access...</p>
      </Card>
    );
  }

  if (!isPaidUser) {
    return (
      <Card className="border-yellow-500/50 bg-yellow-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-yellow-500" />
            Content Creator - Premium Feature
          </CardTitle>
          <CardDescription>
            Automated content creation is available for paid users only
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            With Content Creator, you can automatically:
          </p>
          <ul className="text-sm space-y-2">
            <li className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> Research trending topics
            </li>
            <li className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Generate video scripts
            </li>
            <li className="flex items-center gap-2">
              <Mic className="h-4 w-4 text-primary" /> Create AI voice-overs in 29+ languages
            </li>
            <li className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-primary" /> Generate scene images
            </li>
            <li className="flex items-center gap-2">
              <Video className="h-4 w-4 text-primary" /> Compile into videos up to 15 minutes
            </li>
            <li className="flex items-center gap-2">
              <Share2 className="h-4 w-4 text-primary" /> Upload to TikTok, YouTube, Facebook
            </li>
          </ul>
          <Badge variant="secondary" className="mt-4">
            Purchase credits to unlock
          </Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Save/Load Actions */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Button 
            onClick={handleSaveProject} 
            variant="outline" 
            size="sm" 
            disabled={isSaving || (!topic && !research && !script)}
            className="gap-2"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Progress
          </Button>
          <Button 
            onClick={loadSavedProjects} 
            variant="outline" 
            size="sm"
            className="gap-2"
          >
            <FolderOpen className="h-4 w-4" />
            Load Project
          </Button>
        </div>
        {(generatedImages.length > 0 || script || research) && (
          <Badge variant="outline" className="text-green-500 border-green-500">
            {generatedImages.length > 0 ? `${generatedImages.length} images ready` : script ? 'Script ready' : 'Research ready'}
          </Badge>
        )}
      </div>

      {/* Saved Projects Dialog */}
      <Dialog open={showSavedProjects} onOpenChange={setShowSavedProjects}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Saved Projects</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {savedProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No saved projects yet</p>
            ) : (
              savedProjects.map((project) => (
                <div 
                  key={project.id} 
                  className="p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => loadProject(project)}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm truncate flex-1">{project.title}</h4>
                    <Badge variant="secondary" className="text-xs ml-2">
                      {project.status?.replace('_', ' ')}
                    </Badge>
                  </div>
                  {project.topic && (
                    <p className="text-xs text-muted-foreground truncate mt-1">{project.topic}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(project.updated_at).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Progress Steps */}
      <div className="flex items-center justify-between overflow-x-auto pb-2">
        {steps.map((step, index) => (
          <div key={step.num} className="flex items-center">
            <button
              onClick={() => setCurrentStep(step.num)}
              className={`flex flex-col items-center gap-1 px-2 ${
                currentStep === step.num 
                  ? 'text-primary' 
                  : currentStep > step.num 
                    ? 'text-green-500' 
                    : 'text-muted-foreground'
              }`}
            >
              <div className={`p-2 rounded-full border-2 ${
                currentStep === step.num 
                  ? 'border-primary bg-primary/10' 
                  : currentStep > step.num 
                    ? 'border-green-500 bg-green-500/10' 
                    : 'border-muted'
              }`}>
                <step.icon className="h-4 w-4" />
              </div>
              <span className="text-xs whitespace-nowrap">{step.title}</span>
            </button>
            {index < steps.length - 1 && (
              <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Topic Research */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Step 1: Topic Research
            </CardTitle>
            <CardDescription>
              Enter a topic manually or upload an image for AI analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Option 1: Manual Topic Entry */}
            <div className="space-y-2">
              <Label>Option 1: Enter a topic manually</Label>
              <Input
                placeholder="e.g., 10 productivity hacks for remote workers"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
              <Button onClick={handleResearchTopic} disabled={isLoading || !topic.trim()} size="sm" className="gap-2">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Research Topic
              </Button>
            </div>
            
            <div className="relative">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                OR
              </span>
            </div>

            {/* Option 2: Upload Image for Analysis */}
            <div className="space-y-3">
              <Label>Option 2: Upload an image for AI analysis</Label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                ref={fileInputRef}
                className="hidden"
                id="image-upload-content"
              />
              
              {!uploadedImage ? (
                <label
                  htmlFor="image-upload-content"
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <Camera className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Click to upload an image</span>
                  <span className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP</span>
                </label>
              ) : (
                <div className="space-y-3">
                  <div className="relative inline-block">
                    <img
                      src={uploadedImage}
                      alt="Uploaded"
                      className="max-h-40 rounded-lg border object-contain"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={clearUploadedImage}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={handleAnalyzeImage}
                      disabled={isAnalyzing}
                      size="sm"
                      variant="secondary"
                      className="gap-2"
                    >
                      {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                      Analyze Image
                    </Button>
                    
                    {imageAnalysis && (
                      <Button
                        onClick={handleResearchFromImage}
                        disabled={isLoading}
                        size="sm"
                        className="gap-2"
                      >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        Research from Analysis
                      </Button>
                    )}
                  </div>

                  {imageAnalysis && (
                    <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                      <h4 className="font-medium text-sm mb-1 flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Image Analysis:
                      </h4>
                      <p className="text-sm text-muted-foreground">{imageAnalysis}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {research && (
              <div className="mt-4 p-4 rounded-lg bg-muted/50 border">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Research Results:</h4>
                  <Button onClick={handleSaveProject} variant="outline" size="sm" disabled={isSaving} className="gap-1">
                    {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                    Save Research
                  </Button>
                </div>
                <pre className="text-xs whitespace-pre-wrap overflow-auto max-h-64">{research}</pre>
              </div>
            )}

            {(topic || research) && (
              <div className="flex gap-2 mt-4">
                <Button onClick={() => setCurrentStep(2)} variant="outline">
                  Next: Generate Script <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Script Generation */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Step 2: Generate Script
            </CardTitle>
            <CardDescription>
              Create an AI-powered video script with scenes, voice-over text, and visuals
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Target Audience</Label>
                <Input
                  placeholder="e.g., entrepreneurs aged 25-40"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Style</Label>
                <Select value={style} onValueChange={setStyle}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="engaging and conversational">Conversational</SelectItem>
                    <SelectItem value="professional and informative">Professional</SelectItem>
                    <SelectItem value="funny and entertaining">Entertaining</SelectItem>
                    <SelectItem value="dramatic and cinematic">Cinematic</SelectItem>
                    <SelectItem value="educational and detailed">Educational</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Number of Scenes: {numScenes}</Label>
              <input
                type="range"
                min={3}
                max={30}
                value={numScenes}
                onChange={(e) => setNumScenes(parseInt(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Each scene will generate one image. More scenes = more credits.
              </p>
            </div>

            <Button onClick={handleGenerateScript} disabled={isLoading} className="gap-2">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate Script
            </Button>

            {script && (
              <div className="mt-4 space-y-4">
                <div className="p-4 rounded-lg bg-muted/50 border">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-lg">{script.title}</h4>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-1"
                      onClick={() => {
                        const scriptText = `TITLE: ${script.title}\n\nDESCRIPTION: ${script.description}\n\nHASHTAGS: ${script.hashtags?.join(' ')}\n\nCALL TO ACTION: ${script.callToAction}\n\n${script.scenes?.map(s => `--- SCENE ${s.sceneNumber} (${s.durationSeconds}s) ---\nVISUAL: ${s.visualDescription}\nVOICE-OVER: ${s.voiceOver}\nMOOD: ${s.musicMood}`).join('\n\n')}`;
                        const blob = new Blob([scriptText], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `${script.title || 'script'}.txt`;
                        link.click();
                        URL.revokeObjectURL(url);
                        toast.success('Script downloaded!');
                      }}
                    >
                      <Download className="h-3 w-3" />
                      Download Script
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{script.description}</p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {script.hashtags?.map((tag, i) => (
                      <Badge key={i} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                {script.scenes?.map((scene, index) => (
                  <div key={index} className="p-4 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge>Scene {scene.sceneNumber}</Badge>
                      <span className="text-xs text-muted-foreground">{scene.durationSeconds}s</span>
                      <Badge variant="outline" className="text-xs">{scene.musicMood}</Badge>
                    </div>
                    <p className="text-sm mb-2"><strong>Visual:</strong> {scene.visualDescription}</p>
                    <p className="text-sm"><strong>Voice:</strong> {scene.voiceOver}</p>
                  </div>
                ))}

                <div className="flex gap-2 flex-wrap">
                  <Button onClick={() => setCurrentStep(3)} variant="outline">
                    Next: Generate Voice-over <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                  <Button onClick={() => setCurrentStep(4)} variant="ghost" size="sm">
                    Skip to Images →
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Voice-over */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-primary" />
              Step 3: Generate Voice-over
            </CardTitle>
            <CardDescription>
              Create AI voice narration using ElevenLabs with 29+ language support
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Voice</Label>
                <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VOICES.map((voice) => (
                      <SelectItem key={voice.id} value={voice.id}>{voice.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Language</Label>
                <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>{lang.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={handleGenerateVoiceover} disabled={isLoading || !script} className="gap-2">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
              Generate Voice-over
            </Button>

            {audioUrl && (
              <div className="mt-4 p-4 rounded-lg bg-muted/50 border">
                <Label className="mb-2 block">Preview Voice-over:</Label>
                <audio controls src={audioUrl} className="w-full" />
                <div className="flex gap-2 mt-3 flex-wrap">
                  <Button variant="outline" size="sm" className="gap-2" asChild>
                    <a href={audioUrl} download="voiceover.mp3">
                      <Download className="h-4 w-4" /> Download Audio
                    </a>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="gap-1"
                    onClick={() => {
                      navigator.clipboard.writeText(audioUrl);
                      toast.success('Audio URL copied!');
                    }}
                  >
                    Copy URL
                  </Button>
                </div>
              </div>
            )}

            <div className="flex gap-2 flex-wrap">
              <Button onClick={() => setCurrentStep(4)} variant="outline" disabled={!script}>
                Next: Generate Images <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
              {audioUrl && (
                <Button onClick={() => setCurrentStep(4)} variant="ghost" size="sm">
                  Skip to Images →
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Images */}
      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" />
              Step 4: Generate Scene Images
            </CardTitle>
            <CardDescription>
              Create AI images for each scene in your video
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleGenerateImages} disabled={isLoading || !script} className="gap-2">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
              Generate All Scene Images
            </Button>

            {generatedImages.length > 0 && (
              <>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="text-sm text-muted-foreground">
                    Generated {generatedImages.length} of {script?.scenes?.length || numScenes} scene images
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-1"
                      onClick={() => {
                        generatedImages.forEach((img, index) => {
                          setTimeout(() => {
                            const link = document.createElement('a');
                            link.href = img;
                            link.download = `scene-${index + 1}.png`;
                            link.click();
                          }, index * 200);
                        });
                        toast.success(`Downloading ${generatedImages.length} images...`);
                      }}
                    >
                      <Download className="h-3 w-3" />
                      Download All
                    </Button>
                    <Button onClick={handleSaveProject} variant="outline" size="sm" disabled={isSaving} className="gap-1">
                      {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                      Save Images
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                  {generatedImages.map((img, index) => (
                    <div key={index} className="relative group">
                      <img 
                        src={img} 
                        alt={`Scene ${index + 1}`} 
                        className="rounded-lg border w-full aspect-video object-cover"
                      />
                      <Badge className="absolute top-2 left-2">Scene {index + 1}</Badge>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = img;
                          link.download = `scene-${index + 1}.png`;
                          link.click();
                        }}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="flex gap-2 flex-wrap">
              <Button onClick={() => setCurrentStep(5)} variant="outline">
                Next: Create Video <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
              {generatedImages.length > 0 && (
                <p className="text-xs text-muted-foreground self-center">
                  Or download images above and edit in your own app
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Music & Video Creation */}
      {currentStep === 5 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              Step 5: Music & Video
            </CardTitle>
            <CardDescription>
              Generate AI background music and combine into your final video
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Music Generation Section */}
            <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2">
                <Music className="h-5 w-5 text-purple-500" />
                <h4 className="font-medium">Background Music</h4>
                <Badge variant="secondary">5 credits</Badge>
              </div>
              
              <div className="space-y-2">
                <Label>Describe the music style</Label>
                <Textarea
                  placeholder="e.g., Upbeat corporate background music, motivational and inspiring..."
                  value={musicPrompt}
                  onChange={(e) => setMusicPrompt(e.target.value)}
                  className="min-h-[80px] resize-none"
                />
              </div>

              <Button 
                onClick={async () => {
                  if (!musicPrompt.trim()) {
                    toast.error('Please enter a music description');
                    return;
                  }
                  if (userCredits < 5) {
                    toast.error('You need at least 5 credits for music generation');
                    return;
                  }
                  setIsGeneratingMusic(true);
                  try {
                    const { data, error } = await supabase.functions.invoke('generate-music', {
                      body: { 
                        prompt: musicPrompt.trim(),
                        duration: 30,
                        instrumental: true
                      }
                    });
                    if (error) throw error;
                    if (data?.audioUrl) {
                      setGeneratedMusicUrl(data.audioUrl);
                      toast.success('Music generated!');
                    }
                  } catch (error: any) {
                    toast.error(error.message || 'Failed to generate music');
                  } finally {
                    setIsGeneratingMusic(false);
                  }
                }} 
                disabled={isGeneratingMusic || !musicPrompt.trim() || userCredits < 5} 
                variant="outline"
                className="gap-2"
              >
                {isGeneratingMusic ? <Loader2 className="h-4 w-4 animate-spin" /> : <Music className="h-4 w-4" />}
                Generate Music
              </Button>

              {generatedMusicUrl && (
                <div className="p-3 rounded-lg bg-background border">
                  <Label className="mb-2 block text-sm">Preview Music:</Label>
                  <audio controls src={generatedMusicUrl} className="w-full" />
                </div>
              )}
            </div>

            <Separator />

            {/* Avatar Speaking Option */}
            <div className="space-y-4 p-4 rounded-lg border bg-gradient-to-r from-purple-500/10 to-pink-500/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCircle className="h-5 w-5 text-purple-500" />
                  <h4 className="font-medium">Speaking Avatar (Explainer Video)</h4>
                  <Badge variant="secondary">15 credits</Badge>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-sm text-muted-foreground">Use Avatar</span>
                  <input 
                    type="checkbox" 
                    checked={useAvatar}
                    onChange={(e) => setUseAvatar(e.target.checked)}
                    className="w-4 h-4 rounded border-input"
                  />
                </label>
              </div>

              {useAvatar && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Upload your avatar image and it will speak with lip-sync to your voice-over
                  </p>
                  
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarImageUpload}
                    ref={avatarFileInputRef}
                    className="hidden"
                    id="avatar-image-upload"
                  />
                  
                  {!avatarImage ? (
                    <label
                      htmlFor="avatar-image-upload"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-purple-500/50 rounded-lg cursor-pointer hover:bg-purple-500/10 transition-colors"
                    >
                      <User className="h-8 w-8 text-purple-500 mb-2" />
                      <span className="text-sm text-muted-foreground">Upload avatar photo</span>
                      <span className="text-xs text-muted-foreground mt-1">Best: front-facing portrait</span>
                    </label>
                  ) : (
                    <div className="flex items-start gap-4">
                      <div className="relative">
                        <img
                          src={avatarImage}
                          alt="Avatar"
                          className="h-32 w-32 rounded-lg border-2 border-purple-500/50 object-cover"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6"
                          onClick={clearAvatarImage}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex-1 space-y-2">
                        <p className="text-sm font-medium text-green-500">Avatar uploaded!</p>
                        <p className="text-xs text-muted-foreground">
                          Make sure you have generated a voice-over in Step 3 before creating the avatar video.
                        </p>
                        {!audioUrl && (
                          <Badge variant="outline" className="text-yellow-500 border-yellow-500">
                            Voice-over required
                          </Badge>
                        )}
                        {audioUrl && (
                          <Badge variant="outline" className="text-green-500 border-green-500">
                            Voice-over ready
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  <Button 
                    onClick={handleCreateAvatarVideo} 
                    disabled={isGeneratingAvatarVideo || !avatarImage || !audioUrl || userCredits < 15}
                    className="w-full gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    {isGeneratingAvatarVideo ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating Avatar Video...
                      </>
                    ) : (
                      <>
                        <UserCircle className="h-4 w-4" />
                        Create Speaking Avatar Video (15 credits)
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

            <Separator />

            {/* Video Settings */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Video Duration (Scene-based video)</Label>
                <Select 
                  value={selectedDuration.seconds.toString()} 
                  onValueChange={(val) => setSelectedDuration(VIDEO_DURATIONS.find(d => d.seconds.toString() === val) || VIDEO_DURATIONS[1])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VIDEO_DURATIONS.map((duration) => (
                      <SelectItem key={duration.seconds} value={duration.seconds.toString()}>
                        {duration.label} - {duration.credits} credits
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  You have {userCredits} credits. Selected: {selectedDuration.credits} credits
                </p>
              </div>

              <Button onClick={() => handleCreateVideo(false)} disabled={isLoading || userCredits < selectedDuration.credits} className="w-full gap-2">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
                Create Scene Video ({selectedDuration.credits} credits)
              </Button>

              {/* Video Output Section */}
              {videoUrl && (
                <div className="mt-6 p-4 rounded-lg border bg-muted/30 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium flex items-center gap-2">
                      <Video className="h-5 w-5 text-green-500" />
                      Video Created!
                    </h4>
                    <Badge variant="secondary">Ready</Badge>
                  </div>

                  {/* Video Preview Thumbnail */}
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-black/50 border">
                    <video 
                      src={videoUrl} 
                      className="w-full h-full object-contain"
                      poster={generatedImages[0]}
                    />
                    <button 
                      onClick={() => setShowVideoPreview(true)}
                      className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
                    >
                      <div className="p-4 rounded-full bg-primary/90 text-primary-foreground">
                        <Play className="h-8 w-8" />
                      </div>
                    </button>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <Button onClick={() => setShowVideoPreview(true)} variant="outline" className="gap-2">
                      <Eye className="h-4 w-4" />
                      Preview Video
                    </Button>
                    <Button onClick={handleDownloadVideo} variant="outline" className="gap-2">
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                  </div>

                  <Separator />

                  {/* Editing Options */}
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">Need changes? Regenerate with credits:</p>
                    <div className="grid grid-cols-2 gap-3">
                      <Button 
                        onClick={handleRegenerateImages} 
                        variant="secondary" 
                        disabled={isRegeneratingImages || userCredits < 5}
                        className="gap-2"
                      >
                        {isRegeneratingImages ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        New Images (5 cr)
                      </Button>
                      <Button 
                        onClick={() => handleCreateVideo(true)} 
                        variant="secondary" 
                        disabled={isRegeneratingVideo || userCredits < selectedDuration.credits}
                        className="gap-2"
                      >
                        {isRegeneratingVideo ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        New Video ({selectedDuration.credits} cr)
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Button onClick={() => setCurrentStep(6)} variant="outline" className="w-full">
              Next: Publish <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 6: Download & Share */}
      {currentStep === 6 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              Step 6: Download & Share
            </CardTitle>
            <CardDescription>
              Download your video and upload it to your favorite social media platforms
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!videoUrl && generatedImages.length === 0 ? (
              <div className="p-6 text-center border rounded-lg bg-muted/30">
                <Video className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  Create a video or generate images first to download
                </p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setCurrentStep(5)}
                >
                  Go to Video Creation
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Video Download Section */}
                {videoUrl && (
                  <div className="p-4 rounded-lg border bg-muted/30 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium flex items-center gap-2">
                        <Video className="h-4 w-4" />
                        Your Video
                      </h4>
                      <Badge variant="secondary">Ready to Download</Badge>
                    </div>
                    
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-black/50 border max-w-md">
                      <video 
                        src={videoUrl} 
                        className="w-full h-full object-contain"
                        poster={generatedImages[0]}
                      />
                      <button 
                        onClick={() => setShowVideoPreview(true)}
                        className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
                      >
                        <div className="p-3 rounded-full bg-primary/90 text-primary-foreground">
                          <Play className="h-6 w-6" />
                        </div>
                      </button>
                    </div>
                    
                    <div className="flex gap-3">
                      <Button onClick={() => setShowVideoPreview(true)} variant="outline" className="gap-2 flex-1">
                        <Eye className="h-4 w-4" />
                        Preview
                      </Button>
                      <Button onClick={handleDownloadVideo} className="gap-2 flex-1">
                        <Download className="h-4 w-4" />
                        Download Video
                      </Button>
                    </div>
                  </div>
                )}

                {/* Images Download Section */}
                {generatedImages.length > 0 && (
                  <div className="p-4 rounded-lg border bg-muted/30 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" />
                        Generated Images ({generatedImages.length})
                      </h4>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2">
                      {generatedImages.slice(0, 6).map((img, idx) => (
                        <a 
                          key={idx} 
                          href={img} 
                          download={`image-${idx + 1}.png`}
                          className="aspect-video rounded border overflow-hidden hover:ring-2 ring-primary transition-all"
                        >
                          <img src={img} alt={`Scene ${idx + 1}`} className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Click any image to download
                    </p>
                  </div>
                )}

                <Separator />

                {/* Social Media Publisher */}
                <div className="p-4 rounded-lg border bg-gradient-to-br from-primary/10 via-purple-500/5 to-pink-500/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium flex items-center gap-2">
                        <Send className="h-4 w-4 text-primary" />
                        Publish to Social Media
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Upload directly to YouTube, Facebook, TikTok, and Instagram
                      </p>
                    </div>
                    <Button 
                      onClick={() => setShowSocialPublisher(true)}
                      className="gap-2"
                      disabled={!videoUrl}
                    >
                      <Upload className="h-4 w-4" />
                      <span className="hidden sm:inline">Publish Now</span>
                      <span className="sm:hidden">Publish</span>
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { name: 'YouTube', icon: '▶️', color: 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20' },
                      { name: 'Facebook', icon: '📘', color: 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20' },
                      { name: 'TikTok', icon: '🎵', color: 'bg-pink-500/10 border-pink-500/30 hover:bg-pink-500/20' },
                      { name: 'Instagram', icon: '📷', color: 'bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20' },
                    ].map(({ name, icon, color }) => (
                      <div
                        key={name}
                        className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors ${color}`}
                      >
                        <span className="text-xl">{icon}</span>
                        <span className="text-xs font-medium">{name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Script Info for Posting */}
                {script && (
                  <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
                    <h4 className="font-medium text-sm">Copy for Your Post</h4>
                    <div className="space-y-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Title</Label>
                        <p className="text-sm font-medium">{script.title}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Description</Label>
                        <p className="text-sm">{script.description}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Hashtags</Label>
                        <p className="text-sm text-primary">
                          {script.hashtags?.map(h => `#${h}`).join(' ')}
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full gap-2"
                      onClick={() => {
                        const text = `${script.title}\n\n${script.description}\n\n${script.hashtags?.map(h => `#${h}`).join(' ')}`;
                        navigator.clipboard.writeText(text);
                        toast.success('Copied to clipboard!');
                      }}
                    >
                      Copy All Text
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Video Preview Dialog */}
      <Dialog open={showVideoPreview} onOpenChange={setShowVideoPreview}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>{script?.title || 'Video Preview'}</DialogTitle>
          </DialogHeader>
          <div className="aspect-video bg-black">
            {videoUrl && (
              <video 
                src={videoUrl} 
                controls 
                autoPlay
                className="w-full h-full object-contain"
              />
            )}
          </div>
          <div className="p-4 flex gap-3 justify-end">
            <Button onClick={handleDownloadVideo} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Download Video
            </Button>
            <Button onClick={() => setShowVideoPreview(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Social Media Publisher Dialog */}
      <SocialMediaPublisher
        open={showSocialPublisher}
        onOpenChange={setShowSocialPublisher}
        videoUrl={videoUrl}
        defaultTitle={script?.title || ''}
        defaultDescription={script?.description || ''}
        defaultHashtags={script?.hashtags || []}
        thumbnailOptions={generatedImages}
      />
    </div>
  );
};

export default ContentCreator;
