import React, { useState, memo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  ImageIcon, 
  VideoIcon, 
  TypeIcon, 
  Sparkles, 
  Upload, 
  Loader2,
  Download,
  Copy,
  Wand2
} from 'lucide-react';

const AIHub = memo(() => {
  const [activeTab, setActiveTab] = useState('text-to-image');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageDescription, setImageDescription] = useState<string | null>(null);
  const [uploadedVideo, setUploadedVideo] = useState<string | null>(null);
  const [videoDescription, setVideoDescription] = useState<string | null>(null);

  const handleTextToImage = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    setGeneratedImage(null);

    try {
      const { data, error } = await supabase.functions.invoke('ai-generate', {
        body: { 
          type: 'text-to-image',
          prompt: prompt.trim()
        }
      });

      if (error) throw error;

      if (data?.imageUrl) {
        setGeneratedImage(data.imageUrl);
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      if (type === 'image') {
        setUploadedImage(base64);
        setImageDescription(null);
      } else {
        setUploadedVideo(base64);
        setVideoDescription(null);
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
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    toast.info('Text-to-video generation coming soon! Currently in development.');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-24">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-purple-500/10 to-pink-500/10 blur-3xl" />
        <div className="relative container mx-auto px-4 py-12">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">AI-Powered Creation</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
              AI Hub
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Transform your ideas into stunning visuals. Generate images from text, analyze images and videos with AI.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 -mt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl mx-auto bg-background/50 backdrop-blur-sm border">
            <TabsTrigger value="text-to-image" className="gap-2 text-xs sm:text-sm">
              <Wand2 className="h-4 w-4" />
              <span className="hidden sm:inline">Text to Image</span>
              <span className="sm:hidden">T→I</span>
            </TabsTrigger>
            <TabsTrigger value="image-to-text" className="gap-2 text-xs sm:text-sm">
              <ImageIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Image to Text</span>
              <span className="sm:hidden">I→T</span>
            </TabsTrigger>
            <TabsTrigger value="text-to-video" className="gap-2 text-xs sm:text-sm">
              <VideoIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Text to Video</span>
              <span className="sm:hidden">T→V</span>
            </TabsTrigger>
            <TabsTrigger value="video-to-text" className="gap-2 text-xs sm:text-sm">
              <TypeIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Video to Text</span>
              <span className="sm:hidden">V→T</span>
            </TabsTrigger>
          </TabsList>

          {/* Text to Image */}
          <TabsContent value="text-to-image">
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5 text-primary" />
                  Text to Image
                </CardTitle>
                <CardDescription>
                  Describe what you want to create and let AI generate it for you
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Your Prompt</Label>
                  <Textarea
                    placeholder="A majestic dragon flying over a crystal lake at sunset, fantasy art style, highly detailed..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="min-h-[120px] resize-none"
                  />
                </div>
                <Button 
                  onClick={handleTextToImage} 
                  disabled={isGenerating || !prompt.trim()}
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
                  <div className="space-y-3 animate-in fade-in">
                    <div className="relative rounded-lg overflow-hidden border">
                      <img 
                        src={generatedImage} 
                        alt="Generated" 
                        className="w-full max-h-[500px] object-contain bg-muted"
                      />
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
                  </div>
                )}
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
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'image')}
                      className="hidden"
                      id="image-upload"
                    />
                    <label htmlFor="image-upload" className="cursor-pointer space-y-2">
                      {uploadedImage ? (
                        <img src={uploadedImage} alt="Uploaded" className="max-h-64 mx-auto rounded-lg" />
                      ) : (
                        <>
                          <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">Click to upload an image</p>
                        </>
                      )}
                    </label>
                  </div>
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
                  <div className="space-y-3 animate-in fade-in">
                    <div className="p-4 rounded-lg bg-muted/50 border">
                      <p className="text-sm leading-relaxed">{imageDescription}</p>
                    </div>
                    <Button variant="outline" className="w-full gap-2" onClick={() => copyToClipboard(imageDescription)}>
                      <Copy className="h-4 w-4" />
                      Copy Description
                    </Button>
                  </div>
                )}
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
                </CardTitle>
                <CardDescription>
                  Generate videos from text descriptions (Coming Soon)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Your Prompt</Label>
                  <Textarea
                    placeholder="A peaceful river flowing through a forest, with sunlight filtering through the trees..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="min-h-[120px] resize-none"
                  />
                </div>
                <Button 
                  onClick={handleTextToVideo} 
                  disabled={isGenerating || !prompt.trim()}
                  className="w-full gap-2"
                  size="lg"
                >
                  <VideoIcon className="h-4 w-4" />
                  Generate Video (Coming Soon)
                </Button>
                <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
                  <p className="text-sm text-amber-600">
                    Text-to-video generation is in development. Stay tuned!
                  </p>
                </div>
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
                    <Input
                      type="file"
                      accept="video/*"
                      onChange={(e) => handleImageUpload(e, 'video')}
                      className="hidden"
                      id="video-upload"
                    />
                    <label htmlFor="video-upload" className="cursor-pointer space-y-2">
                      {uploadedVideo ? (
                        <video src={uploadedVideo} controls className="max-h-64 mx-auto rounded-lg" />
                      ) : (
                        <>
                          <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">Click to upload a video</p>
                        </>
                      )}
                    </label>
                  </div>
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
                  <div className="space-y-3 animate-in fade-in">
                    <div className="p-4 rounded-lg bg-muted/50 border">
                      <p className="text-sm leading-relaxed">{videoDescription}</p>
                    </div>
                    <Button variant="outline" className="w-full gap-2" onClick={() => copyToClipboard(videoDescription)}>
                      <Copy className="h-4 w-4" />
                      Copy Description
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
});

AIHub.displayName = 'AIHub';

export default AIHub;
