import { useState } from 'react';
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
import { 
  Sparkles, 
  FileText, 
  Mic, 
  Image, 
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
  Eye
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
}

const VOICES = [
  { name: 'Sarah', id: 'EXAVITQu4vr4xnSDxMaL' },
  { name: 'Charlie', id: 'IKne3meq5aSn9XLyUdCD' },
  { name: 'George', id: 'JBFqnCBsd6RMkjVDRZzb' },
  { name: 'Emily', id: 'LcfcDJNUP1GQjkzn1xUU' },
  { name: 'Liam', id: 'TX3LPaxmHKxFdv7VOQHJ' },
  { name: 'Charlotte', id: 'XB0fDUnXU5powFXDhCwa' },
  { name: 'Alice', id: 'Xb7hH8MSUJpSbSDYk0k2' },
  { name: 'Daniel', id: 'onwK4e9ZLuTAKqWW03F9' },
  { name: 'Lily', id: 'pFZP5JQG7iQjIQuC4Bku' },
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

const ContentCreator = ({ userCredits, onCreditsChange }: ContentCreatorProps) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  // Step 1: Topic
  const [topic, setTopic] = useState('');
  const [research, setResearch] = useState<string | null>(null);
  
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
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const isPaidUser = userCredits >= 10;

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
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('elevenlabs-voiceover', {
        body: { 
          action: 'generate',
          text: fullText,
          voiceId: selectedVoice,
          language: selectedLanguage
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

      // Generate images for each scene
      const images: string[] = [];
      for (const prompt of prompts.slice(0, 5)) { // Limit to 5 images
        const { data, error } = await supabase.functions.invoke('ai-generate', {
          body: { type: 'text-to-image', prompt }
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

    if (userCredits < selectedDuration.credits) {
      toast.error(`You need ${selectedDuration.credits} credits for this video length`);
      return;
    }

    if (isRegenerate) {
      setIsRegeneratingVideo(true);
    } else {
      setIsLoading(true);
    }

    try {
      // Deduct credits
      const { error: creditError } = await supabase
        .from('profiles')
        .update({ credits: userCredits - selectedDuration.credits })
        .eq('id', user?.id);

      if (creditError) throw creditError;

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
    if (userCredits < regenerateCost) {
      toast.error(`You need ${regenerateCost} credits to regenerate images`);
      return;
    }

    setIsRegeneratingImages(true);
    try {
      // Deduct credits
      const { error: creditError } = await supabase
        .from('profiles')
        .update({ credits: userCredits - regenerateCost })
        .eq('id', user?.id);

      if (creditError) throw creditError;

      // Generate new images
      const images: string[] = [];
      const prompts = imagePrompts.length > 0 
        ? imagePrompts 
        : script.scenes.map(s => s.visualDescription);

      for (const prompt of prompts.slice(0, 5)) {
        const { data, error } = await supabase.functions.invoke('ai-generate', {
          body: { type: 'text-to-image', prompt }
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
    { num: 4, title: 'Images', icon: Image },
    { num: 5, title: 'Video', icon: Video },
    { num: 6, title: 'Publish', icon: Share2 },
  ];

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
              <Image className="h-4 w-4 text-primary" /> Generate scene images
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
              Enter a topic and we'll research trending angles and content ideas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>What's your video about?</Label>
              <Input
                placeholder="e.g., 10 productivity hacks for remote workers"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>
            
            <Button onClick={handleResearchTopic} disabled={isLoading} className="gap-2">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Research Topic
            </Button>

            {research && (
              <div className="mt-4 p-4 rounded-lg bg-muted/50 border">
                <h4 className="font-medium mb-2">Research Results:</h4>
                <pre className="text-xs whitespace-pre-wrap overflow-auto max-h-64">{research}</pre>
              </div>
            )}

            {topic && (
              <Button onClick={() => setCurrentStep(2)} variant="outline" className="mt-4">
                Next: Generate Script <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
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
                max={15}
                value={numScenes}
                onChange={(e) => setNumScenes(parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            <Button onClick={handleGenerateScript} disabled={isLoading} className="gap-2">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate Script
            </Button>

            {script && (
              <div className="mt-4 space-y-4">
                <div className="p-4 rounded-lg bg-muted/50 border">
                  <h4 className="font-bold text-lg">{script.title}</h4>
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

                <Button onClick={() => setCurrentStep(3)} variant="outline">
                  Next: Generate Voice-over <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
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
                <Button variant="outline" size="sm" className="mt-2 gap-2" asChild>
                  <a href={audioUrl} download="voiceover.mp3">
                    <Download className="h-4 w-4" /> Download Audio
                  </a>
                </Button>
              </div>
            )}

            <Button onClick={() => setCurrentStep(4)} variant="outline" disabled={!script}>
              Next: Generate Images <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Images */}
      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5 text-primary" />
              Step 4: Generate Scene Images
            </CardTitle>
            <CardDescription>
              Create AI images for each scene in your video
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleGenerateImages} disabled={isLoading || !script} className="gap-2">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Image className="h-4 w-4" />}
              Generate All Scene Images
            </Button>

            {generatedImages.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                {generatedImages.map((img, index) => (
                  <div key={index} className="relative group">
                    <img 
                      src={img} 
                      alt={`Scene ${index + 1}`} 
                      className="rounded-lg border w-full aspect-video object-cover"
                    />
                    <Badge className="absolute top-2 left-2">Scene {index + 1}</Badge>
                  </div>
                ))}
              </div>
            )}

            <Button onClick={() => setCurrentStep(5)} variant="outline">
              Next: Create Video <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
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

            {/* Video Settings */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Video Duration</Label>
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
                Create Video ({selectedDuration.credits} credits)
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

      {/* Step 6: Publish */}
      {currentStep === 6 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-primary" />
              Step 6: Publish to Social Media
            </CardTitle>
            <CardDescription>
              Upload your video to TikTok, YouTube, Facebook, and more
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['TikTok', 'YouTube', 'Facebook', 'Instagram'].map((platform) => (
                <Button key={platform} variant="outline" className="h-20 flex-col gap-2">
                  <Share2 className="h-6 w-6" />
                  <span>{platform}</span>
                </Button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Connect your social media accounts to enable one-click publishing
            </p>
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
    </div>
  );
};

export default ContentCreator;
