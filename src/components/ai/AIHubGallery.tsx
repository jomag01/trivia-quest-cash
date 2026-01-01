import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Plus, Mic, ArrowUp, Sparkles, Clock, Film, ImageIcon, Crown, Search, ShoppingCart, DollarSign, Cpu } from 'lucide-react';
import { cn } from '@/lib/utils';

// Import bee-themed images
import beeWorkingHive from '@/assets/bee-working-hive.png';
import beeShoppingOnline from '@/assets/bee-shopping-online.png';
import beeEarningMoney from '@/assets/bee-earning-money.png';
import beeAiTech from '@/assets/bee-ai-tech.png';

interface AIHubGalleryProps {
  onNavigate: (tab: string, prompt?: string) => void;
  userCredits: number;
}

// TriviaBees themed gallery items
const SAMPLE_GALLERY = [
  { id: '1', type: 'image', url: beeWorkingHive, category: 'Work', prompt: 'Adorable bees working together in a golden honeycomb hive, wearing hard hats and carrying honey jars' },
  { id: '2', type: 'image', url: beeShoppingOnline, category: 'Shopping', prompt: 'Cute bee shopping online with laptop and shopping cart, surrounded by gift boxes' },
  { id: '3', type: 'image', url: beeEarningMoney, category: 'Earning', prompt: 'Happy bee holding money and gold coins, successful entrepreneur bee with dollar bills' },
  { id: '4', type: 'image', url: beeAiTech, category: 'AI', prompt: 'Bee scientist using AI technology with holographic brain displays in futuristic lab' },
  { id: '5', type: 'video', url: beeWorkingHive, category: 'Work', prompt: 'Animated bees building honeycomb cells and producing sweet honey together' },
  { id: '6', type: 'image', url: beeShoppingOnline, category: 'Shopping', prompt: 'Bee mascot browsing online marketplace on honeycomb styled e-commerce platform' },
  { id: '7', type: 'video', url: beeEarningMoney, category: 'Earning', prompt: 'Celebration of success with coins raining on happy bee characters' },
  { id: '8', type: 'image', url: beeAiTech, category: 'AI', prompt: 'Smart bee analyzing data and generating content with artificial intelligence' },
  { id: '9', type: 'image', url: beeWorkingHive, category: 'Work', prompt: 'Team of worker bees collaborating in a beautiful amber-lit beehive' },
  { id: '10', type: 'video', url: beeShoppingOnline, category: 'Shopping', prompt: 'Buzzing bee adding products to cart in online honey store' },
  { id: '11', type: 'image', url: beeEarningMoney, category: 'Earning', prompt: 'Bee entrepreneur celebrating affiliate commissions and passive income' },
  { id: '12', type: 'image', url: beeAiTech, category: 'AI', prompt: 'TriviaBees AI assistant helping create images and videos with magic' },
];

const CATEGORIES = [
  { id: 'all', label: '🐝 All', icon: null },
  { id: 'work', label: '🏗️ Work', icon: null },
  { id: 'shopping', label: '🛒 Shopping', icon: ShoppingCart },
  { id: 'earning', label: '💰 Earning', icon: DollarSign },
  { id: 'ai', label: '🤖 AI Tech', icon: Cpu },
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
  const [generationType, setGenerationType] = useState<'image' | 'video' | 'research'>('video');
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
    } else if (generationType === 'research') {
      onNavigate('deep-research', promptValue);
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
    <div ref={galleryRef} className="relative min-h-screen pb-32 beehive-bg">
      {/* Hero Section with TriviaBees branding */}
      <div className="relative px-4 py-6 md:py-10 overflow-hidden">
        {/* Animated honeycomb background */}
        <div className="absolute inset-0 honeycomb-pattern opacity-20" />
        
        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-4">
          <div className="flex items-center justify-center gap-3 animate-float">
            <span className="text-4xl md:text-5xl">🐝</span>
            <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 bg-clip-text text-transparent">
              TriviaBees AI Hub
            </h1>
            <span className="text-4xl md:text-5xl">🍯</span>
          </div>
          <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
            Create stunning AI images, videos, and more. Join our hive of creators earning while they create!
          </p>
          
          {/* Feature highlights */}
          <div className="flex flex-wrap justify-center gap-2 md:gap-3 pt-2">
            <Badge variant="secondary" className="bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1.5 py-1.5 px-3">
              <ShoppingCart className="h-3.5 w-3.5" />
              Shop & Earn
            </Badge>
            <Badge variant="secondary" className="bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30 gap-1.5 py-1.5 px-3">
              <DollarSign className="h-3.5 w-3.5" />
              Affiliate Rewards
            </Badge>
            <Badge variant="secondary" className="bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/30 gap-1.5 py-1.5 px-3">
              <Sparkles className="h-3.5 w-3.5" />
              AI Powered
            </Badge>
          </div>
        </div>
      </div>

      {/* Header Tabs */}
      <div className="sticky top-0 z-20 bg-gradient-to-r from-amber-50/95 via-orange-50/90 to-yellow-50/95 dark:from-amber-950/95 dark:via-orange-950/90 dark:to-yellow-950/95 backdrop-blur-xl border-b border-amber-500/20">
        <div className="flex items-center justify-center gap-2 py-3">
          <button
            onClick={() => setActiveMode('discover')}
            className={cn(
              "px-6 py-2 rounded-full text-sm font-medium transition-all",
              activeMode === 'discover' 
                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25" 
                : "text-muted-foreground hover:text-foreground hover:bg-amber-500/10"
            )}
          >
            🐝 Discover
          </button>
          <button
            onClick={() => setActiveMode('effects')}
            className={cn(
              "px-6 py-2 rounded-full text-sm font-medium transition-all",
              activeMode === 'effects' 
                ? "bg-gradient-to-r from-yellow-500 to-amber-500 text-white shadow-lg shadow-yellow-500/25" 
                : "text-muted-foreground hover:text-foreground hover:bg-yellow-500/10"
            )}
          >
            ✨ Effects
          </button>
        </div>

        {/* Category Pills */}
        <ScrollArea className="w-full pb-3">
          <div className="flex items-center gap-2 px-4">
            {CATEGORIES.map((cat, index) => {
              const colors = ['from-amber-500 to-orange-500', 'from-yellow-500 to-amber-500', 'from-orange-500 to-red-500', 'from-green-500 to-emerald-500', 'from-purple-500 to-indigo-500'];
              const gradientColor = colors[index % colors.length];
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-all border",
                    activeCategory === cat.id 
                      ? `bg-gradient-to-r ${gradientColor} text-white border-transparent shadow-lg` 
                      : "bg-amber-500/5 text-foreground border-amber-500/30 hover:border-amber-500/50 hover:bg-amber-500/10"
                  )}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Masonry Gallery Grid */}
      <div className="p-3 md:p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 md:gap-3">
          {filteredGallery.map((item) => (
            <div 
              key={item.id}
              className="relative group cursor-pointer rounded-xl md:rounded-2xl overflow-hidden shadow-lg shadow-amber-500/10 hover:shadow-xl hover:shadow-amber-500/20 transition-all duration-300 border-2 border-amber-500/20 hover:border-amber-500/40"
              onClick={() => {
                setPromptValue(item.prompt);
                setGenerationType(item.type === 'video' ? 'video' : 'image');
              }}
            >
              <div className="aspect-square">
                <img 
                  src={item.url} 
                  alt={item.prompt}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              
              {/* Video indicator */}
              {item.type === 'video' && (
                <div className="absolute top-2 left-2">
                  <Badge variant="secondary" className="bg-amber-500/90 text-white border-0 gap-1 text-xs">
                    <Play className="h-2.5 w-2.5 fill-current" />
                    Video
                  </Badge>
                </div>
              )}

              {/* Category badge */}
              <div className="absolute top-2 right-2">
                <Badge variant="secondary" className="bg-black/60 text-white border-0 text-xs">
                  {item.category}
                </Badge>
              </div>

              {/* Hover overlay with prompt */}
              <div className="absolute inset-0 bg-gradient-to-t from-amber-900/90 via-amber-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute bottom-0 left-0 right-0 p-2 md:p-3">
                  <p className="text-white text-xs line-clamp-2">{item.prompt}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Input Bar - Always visible at bottom */}
      <div className={cn(
        "fixed bottom-20 md:bottom-6 left-0 right-0 z-50 px-3 md:px-4 transition-all duration-300",
        showFloatingInput ? "translate-y-0 opacity-100" : "translate-y-0 opacity-100"
      )}>
        <div className="max-w-2xl mx-auto">
          <div className="bg-gradient-to-r from-amber-50/98 via-orange-50/98 to-yellow-50/98 dark:from-amber-950/98 dark:via-orange-950/98 dark:to-yellow-950/98 backdrop-blur-xl border-2 border-amber-500/30 rounded-2xl shadow-2xl shadow-amber-500/20 p-2 md:p-3">
            {/* Type Toggle */}
            <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3 overflow-x-auto scrollbar-hide">
              <Button
                variant={generationType === 'video' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setGenerationType('video')}
                className={cn(
                  "gap-1 md:gap-1.5 rounded-full shrink-0 text-xs md:text-sm h-7 md:h-8 px-2 md:px-3",
                  generationType === 'video' && "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0"
                )}
              >
                <Sparkles className="h-3 w-3 md:h-3.5 md:w-3.5" />
                <span className="hidden sm:inline">AI</span> Video
              </Button>
              <Button
                variant={generationType === 'image' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setGenerationType('image')}
                className={cn(
                  "gap-1 md:gap-1.5 rounded-full shrink-0 text-xs md:text-sm h-7 md:h-8 px-2 md:px-3",
                  generationType === 'image' && "bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white border-0"
                )}
              >
                <ImageIcon className="h-3 w-3 md:h-3.5 md:w-3.5" />
                <span className="hidden sm:inline">AI</span> Image
              </Button>
              <Button
                variant={generationType === 'research' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setGenerationType('research')}
                className={cn(
                  "gap-1 md:gap-1.5 rounded-full shrink-0 text-xs md:text-sm h-7 md:h-8 px-2 md:px-3",
                  generationType === 'research' && "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-0"
                )}
              >
                <Search className="h-3 w-3 md:h-3.5 md:w-3.5" />
                Research
              </Button>
              <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground shrink-0 bg-gradient-to-r from-amber-500/20 to-orange-500/20 px-2 py-1 rounded-full">
                <Crown className="h-3 w-3 text-amber-500" />
                <span className="font-semibold text-amber-600">{userCredits}</span>
              </div>
            </div>

            {/* Input Row */}
            <div className="flex items-center gap-2">
              <Input
                placeholder={generationType === 'video' 
                  ? "Describe your bee-utiful video..."
                  : generationType === 'research'
                  ? "Research any topic with GPT-5..."
                  : "Describe your bee-utiful image..."
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
                className="h-8 w-8 md:h-9 md:w-9 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shrink-0 shadow-lg shadow-amber-500/25"
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
            </div>

            {/* Options Row */}
            <div className="flex items-center gap-1.5 md:gap-2 mt-2 md:mt-3 overflow-x-auto pb-1 scrollbar-hide">
              <Button variant="outline" size="sm" className="gap-1.5 rounded-full shrink-0 h-7 md:h-8 border-amber-500/30 hover:border-amber-500 hover:bg-amber-500/5">
                <Plus className="h-3.5 w-3.5" />
              </Button>
              
              {generationType === 'video' && (
                <>
                  <Select value={videoQuality} onValueChange={setVideoQuality}>
                    <SelectTrigger className="h-7 md:h-8 w-auto gap-1.5 rounded-full border-amber-500/30 bg-amber-500/5 text-xs">
                      <Film className="h-3.5 w-3.5 text-amber-500" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VIDEO_QUALITY_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={videoDuration} onValueChange={setVideoDuration}>
                    <SelectTrigger className="h-7 md:h-8 w-auto gap-1.5 rounded-full border-orange-500/30 bg-orange-500/5 text-xs">
                      <Clock className="h-3.5 w-3.5 text-orange-500" />
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

              <Button variant="outline" size="sm" className="gap-1.5 rounded-full shrink-0 h-7 md:h-8 border-yellow-500/30 bg-yellow-500/5 hover:bg-yellow-500/10">
                <Mic className="h-3.5 w-3.5 text-yellow-600" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIHubGallery;
