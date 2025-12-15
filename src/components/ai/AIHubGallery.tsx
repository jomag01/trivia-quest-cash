import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Plus, Mic, ArrowUp, Sparkles, Clock, Film, ImageIcon, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIHubGalleryProps {
  onNavigate: (tab: string, prompt?: string) => void;
  userCredits: number;
}

// Sample gallery items - in production these would come from DB
const SAMPLE_GALLERY = [
  { id: '1', type: 'image', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=600&fit=crop', category: 'Portrait', prompt: 'Beautiful portrait with golden hour lighting' },
  { id: '2', type: 'video', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&h=500&fit=crop', category: 'Nature', prompt: 'Ethereal forest with magical light' },
  { id: '3', type: 'image', url: 'https://images.unsplash.com/photo-1604076913837-52ab5629fba9?w=400&h=400&fit=crop', category: 'Product', prompt: 'Elegant nail art photography' },
  { id: '4', type: 'image', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=600&fit=crop', category: 'Fashion', prompt: 'Fashion model in vintage setting' },
  { id: '5', type: 'video', url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=400&h=500&fit=crop', category: 'Festive', prompt: 'Christmas holiday shopping scene' },
  { id: '6', type: 'image', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=450&fit=crop', category: 'Portrait', prompt: 'Professional headshot with studio lighting' },
  { id: '7', type: 'image', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&h=550&fit=crop', category: 'Nature', prompt: 'Mystical landscape with northern lights' },
  { id: '8', type: 'video', url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&h=400&fit=crop', category: 'Event', prompt: 'Celebration with confetti and lights' },
  { id: '9', type: 'image', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=600&fit=crop', category: 'Fashion', prompt: 'Editorial fashion photography' },
  { id: '10', type: 'image', url: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=500&fit=crop', category: 'Portrait', prompt: 'Cinematic portrait with dramatic lighting' },
  { id: '11', type: 'video', url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=450&fit=crop', category: 'Nature', prompt: 'Serene mountain landscape timelapse' },
  { id: '12', type: 'image', url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=550&fit=crop', category: 'Fashion', prompt: 'High fashion editorial shoot' },
];

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'portrait', label: 'Portrait' },
  { id: 'fashion', label: 'Fashion' },
  { id: 'nature', label: 'Nature' },
  { id: 'product', label: 'Product' },
  { id: 'festive', label: 'Festive' },
  { id: 'cinematic', label: 'Cinematic' },
];

const VIDEO_QUALITY_OPTIONS = [
  { value: '480p', label: '480P' },
  { value: '720p', label: '720P' },
  { value: '1080p', label: '1080P' },
];

const DURATION_OPTIONS = [
  { value: '5', label: '5s' },
  { value: '10', label: '10s' },
  { value: '15', label: '15s' },
];

const AIHubGallery: React.FC<AIHubGalleryProps> = ({ onNavigate, userCredits }) => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeMode, setActiveMode] = useState<'discover' | 'effects'>('discover');
  const [promptValue, setPromptValue] = useState('');
  const [videoQuality, setVideoQuality] = useState('720p');
  const [videoDuration, setVideoDuration] = useState('5');
  const [generationType, setGenerationType] = useState<'image' | 'video'>('video');
  const [showFloatingInput, setShowFloatingInput] = useState(false);
  const galleryRef = useRef<HTMLDivElement>(null);

  // Track scroll to show/hide floating input
  useEffect(() => {
    const handleScroll = () => {
      if (galleryRef.current) {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        setShowFloatingInput(scrollTop > 200);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const filteredGallery = activeCategory === 'all' 
    ? SAMPLE_GALLERY 
    : SAMPLE_GALLERY.filter(item => item.category.toLowerCase() === activeCategory);

  const handleSubmit = () => {
    if (!promptValue.trim()) return;
    
    if (generationType === 'video') {
      onNavigate('text-to-video', promptValue);
    } else {
      onNavigate('text-to-image', promptValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div ref={galleryRef} className="relative min-h-screen pb-32">
      {/* Header Tabs */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="flex items-center justify-center gap-2 py-3">
          <button
            onClick={() => setActiveMode('discover')}
            className={cn(
              "px-6 py-2 rounded-full text-sm font-medium transition-all",
              activeMode === 'discover' 
                ? "bg-muted text-foreground" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Discover
          </button>
          <button
            onClick={() => setActiveMode('effects')}
            className={cn(
              "px-6 py-2 rounded-full text-sm font-medium transition-all",
              activeMode === 'effects' 
                ? "bg-muted text-foreground" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Effects
          </button>
        </div>

        {/* Category Pills */}
        <ScrollArea className="w-full pb-3">
          <div className="flex items-center gap-2 px-4">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-all border",
                  activeCategory === cat.id 
                    ? "bg-foreground text-background border-foreground" 
                    : "bg-transparent text-foreground border-border hover:border-foreground/50"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Masonry Gallery Grid */}
      <div className="p-4">
        <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
          {filteredGallery.map((item) => (
            <div 
              key={item.id}
              className="break-inside-avoid relative group cursor-pointer rounded-xl overflow-hidden"
              onClick={() => {
                setPromptValue(item.prompt);
                setGenerationType(item.type === 'video' ? 'video' : 'image');
              }}
            >
              <img 
                src={item.url} 
                alt={item.prompt}
                className="w-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
              
              {/* Video indicator */}
              {item.type === 'video' && (
                <div className="absolute top-3 left-3">
                  <Badge variant="secondary" className="bg-black/60 text-white border-0 gap-1">
                    <Play className="h-3 w-3 fill-current" />
                    Video
                  </Badge>
                </div>
              )}

              {/* Hover overlay with prompt */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-white text-xs line-clamp-2">{item.prompt}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Input Bar - Always visible at bottom */}
      <div className={cn(
        "fixed bottom-20 md:bottom-6 left-0 right-0 z-50 px-4 transition-all duration-300",
        showFloatingInput ? "translate-y-0 opacity-100" : "translate-y-0 opacity-100"
      )}>
        <div className="max-w-2xl mx-auto">
          <div className="bg-background/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl p-3">
            {/* Type Toggle */}
            <div className="flex items-center gap-2 mb-3">
              <Button
                variant={generationType === 'video' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setGenerationType('video')}
                className="gap-1.5 rounded-full"
              >
                <Sparkles className="h-3.5 w-3.5" />
                AI Video
              </Button>
              <Button
                variant={generationType === 'image' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setGenerationType('image')}
                className="gap-1.5 rounded-full"
              >
                <ImageIcon className="h-3.5 w-3.5" />
                AI Image
              </Button>
              <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                <Crown className="h-3 w-3 text-yellow-500" />
                {userCredits}
              </div>
            </div>

            {/* Input Row */}
            <div className="flex items-center gap-2">
              <Input
                placeholder={generationType === 'video' 
                  ? "Describe the video you want to create, such as a cyberpunk city at night with flying cars."
                  : "Describe the image you want to create..."
                }
                value={promptValue}
                onChange={(e) => setPromptValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 border-0 bg-transparent focus-visible:ring-0 text-sm placeholder:text-muted-foreground/60"
              />
              <Button 
                onClick={handleSubmit}
                disabled={!promptValue.trim()}
                size="icon" 
                className="h-9 w-9 rounded-full bg-primary hover:bg-primary/90 shrink-0"
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
            </div>

            {/* Options Row */}
            <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1">
              <Button variant="outline" size="sm" className="gap-1.5 rounded-full shrink-0 h-8">
                <Plus className="h-3.5 w-3.5" />
              </Button>
              
              {generationType === 'video' && (
                <>
                  <Select value={videoQuality} onValueChange={setVideoQuality}>
                    <SelectTrigger className="h-8 w-auto gap-1.5 rounded-full border-border/50 text-xs">
                      <Film className="h-3.5 w-3.5" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VIDEO_QUALITY_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={videoDuration} onValueChange={setVideoDuration}>
                    <SelectTrigger className="h-8 w-auto gap-1.5 rounded-full border-border/50 text-xs">
                      <Clock className="h-3.5 w-3.5" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DURATION_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}

              <Button variant="outline" size="sm" className="gap-1.5 rounded-full shrink-0 h-8">
                <Mic className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIHubGallery;
