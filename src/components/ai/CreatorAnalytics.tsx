import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Youtube, 
  Facebook,
  Globe,
  Loader2, 
  Search, 
  DollarSign,
  TrendingUp,
  Users,
  Eye,
  Video,
  BarChart3,
  Info,
  Lock,
  Crown,
  Sparkles,
  CheckCircle2,
  Heart,
  MessageCircle,
  Image as ImageIcon,
  Music
} from 'lucide-react';

// TikTok icon component
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

// Instagram icon component
const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

// Twitter/X icon component
const TwitterIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

interface RecentVideo {
  id: string;
  title: string;
  thumbnail: string;
  views: number;
  likes: number;
  comments: number;
  publishedAt: string;
}

interface YouTubeStats {
  channelName: string;
  channelHandle?: string;
  channelImage?: string;
  bannerImage?: string;
  description?: string;
  country?: string;
  publishedAt?: string;
  subscribers: number;
  totalViews: number;
  videoCount: number;
  averageViews: number;
  estimatedMonthlyViews?: number;
  estimatedMonthlyEarnings: { low: number; high: number };
  estimatedYearlyEarnings: { low: number; high: number };
  cpm: { low: number; high: number };
  grade: string;
  category: string;
  recentVideos?: RecentVideo[];
  verified?: boolean;
}

interface FacebookStats {
  pageName: string;
  pageImage?: string;
  coverImage?: string;
  followers: number;
  likes?: number;
  estimatedReach: number;
  engagementRate: number;
  verified?: boolean;
  about?: string;
  estimatedMonthlyEarnings: { low: number; high: number };
  estimatedPerPost: { low: number; high: number };
  grade: string;
}

interface TikTokStats {
  username: string;
  nickname: string;
  profileImage?: string;
  followers: number;
  following: number;
  likes: number;
  videos: number;
  verified: boolean;
  bio?: string;
  region?: string;
  engagementRate: number;
  estimatedMonthlyViews: number;
  estimatedCreatorFund: { low: number; high: number };
  estimatedPerPost: { low: number; high: number };
  estimatedMonthlyEarnings: { low: number; high: number };
  cpm: { low: number; high: number };
  grade: string;
  niche: string;
}

interface InstagramStats {
  username: string;
  fullName: string;
  profileImage?: string;
  followers: number;
  following: number;
  posts: number;
  verified: boolean;
  bio?: string;
  isPrivate?: boolean;
  category?: string;
  engagementRate: number;
  estimatedPerPost: { low: number; high: number };
  estimatedPerStory: { low: number; high: number };
  estimatedPerReel: { low: number; high: number };
  estimatedMonthlyEarnings: { low: number; high: number };
  grade: string;
  niche: string;
}

interface TwitterStats {
  username: string;
  displayName: string;
  profileImage?: string;
  bannerImage?: string;
  followers: number;
  following: number;
  tweets: number;
  verified: boolean;
  bio?: string;
  joinedDate?: string;
  engagementRate: number;
  estimatedPerTweet: { low: number; high: number };
  estimatedPerThread: { low: number; high: number };
  estimatedPremiumRevenue: { low: number; high: number };
  estimatedMonthlyEarnings: { low: number; high: number };
  grade: string;
  niche: string;
}

interface AdSenseStats {
  websiteUrl: string;
  websiteFavicon?: string;
  estimatedMonthlyVisitors: number;
  estimatedPageViews: number;
  estimatedCTR: number;
  estimatedCPC: number;
  estimatedMonthlyEarnings: { low: number; high: number };
  estimatedYearlyEarnings: { low: number; high: number };
  niche: string;
  grade: string;
}

interface ChannelSuggestion {
  id: string;
  name: string;
  image: string;
  subscribers?: string;
  platform: 'youtube' | 'facebook' | 'website';
  category?: string;
  verified?: boolean;
}

interface CreatorAnalyticsProps {
  userCredits: number;
  onCreditsChange: () => void;
}

// Popular channels database for suggestions
const POPULAR_YOUTUBE_CHANNELS: ChannelSuggestion[] = [
  { id: 'pewdiepie', name: 'PewDiePie', image: 'https://yt3.googleusercontent.com/5oUY3tashyxfqsjO5SGhjT4dus8FkN9CsAHwXWISFrdPYii1FudD4ICtLfuCw6-THJsJbgoY=s176-c-k-c0x00ffffff-no-rj', subscribers: '111M', platform: 'youtube', category: 'Gaming', verified: true },
  { id: 'mrbeast', name: 'MrBeast', image: 'https://yt3.googleusercontent.com/ytc/AIdro_lGRc-05M2XYOU6Ap_6qCnl3FqSri1U73xJnDhR_XNpnsc=s176-c-k-c0x00ffffff-no-rj', subscribers: '336M', platform: 'youtube', category: 'Entertainment', verified: true },
  { id: 'tseries', name: 'T-Series', image: 'https://yt3.googleusercontent.com/ytc/AIdro_k1rxb0z_VkeohdA8WT9WaXiNK0McrXRZ4MTOWGEq5LJ6k=s176-c-k-c0x00ffffff-no-rj', subscribers: '278M', platform: 'youtube', category: 'Music', verified: true },
  { id: 'cocomelon', name: 'Cocomelon', image: 'https://yt3.googleusercontent.com/ytc/AIdro_nJMlhF7Q8IK-pCPkQAqvkHPwTl-xk3CZDqTVMnXQd0HOM=s176-c-k-c0x00ffffff-no-rj', subscribers: '180M', platform: 'youtube', category: 'Education', verified: true },
  { id: 'setindia', name: 'SET India', image: 'https://yt3.googleusercontent.com/ytc/AIdro_nTjMZBZ7iHvZOpKR9bDzCYg4qBNEdTj5Fm_1MH4g=s176-c-k-c0x00ffffff-no-rj', subscribers: '176M', platform: 'youtube', category: 'Entertainment', verified: true },
  { id: 'kidsdianashow', name: 'Kids Diana Show', image: 'https://yt3.googleusercontent.com/ytc/AIdro_m1zG0kH1P9XvwRQ6G9A9HF1LqrPR6UXRQ=s176-c-k-c0x00ffffff-no-rj', subscribers: '125M', platform: 'youtube', category: 'Kids', verified: true },
  { id: 'likenastasiavlog', name: 'Like Nastya', image: 'https://yt3.googleusercontent.com/ytc/AIdro_mGNkE_AyqYMRO5k9_TYwZPHQGb2JZxVMG=s176-c-k-c0x00ffffff-no-rj', subscribers: '117M', platform: 'youtube', category: 'Kids', verified: true },
  { id: 'wwe', name: 'WWE', image: 'https://yt3.googleusercontent.com/ytc/AIdro_mGvGLB7KG9xZ6YFJ5j5QZ5cqzSN4g=s176-c-k-c0x00ffffff-no-rj', subscribers: '102M', platform: 'youtube', category: 'Sports', verified: true },
  { id: 'blackpink', name: 'BLACKPINK', image: 'https://yt3.googleusercontent.com/ytc/AIdro_k7E8D5C5qDZ1n_E5n6s0Y7X5=s176-c-k-c0x00ffffff-no-rj', subscribers: '97M', platform: 'youtube', category: 'Music', verified: true },
  { id: 'justinbieber', name: 'Justin Bieber', image: 'https://yt3.googleusercontent.com/ytc/AIdro_mXRQRqhR0q2q0KqGQ=s176-c-k-c0x00ffffff-no-rj', subscribers: '73M', platform: 'youtube', category: 'Music', verified: true },
  { id: 'markiplier', name: 'Markiplier', image: 'https://yt3.googleusercontent.com/ytc/AIdro_k-qPKq_ZA8qZC=s176-c-k-c0x00ffffff-no-rj', subscribers: '37M', platform: 'youtube', category: 'Gaming', verified: true },
  { id: 'jacksepticeye', name: 'jacksepticeye', image: 'https://yt3.googleusercontent.com/ytc/AIdro_mVZ7yA8zQxVN=s176-c-k-c0x00ffffff-no-rj', subscribers: '31M', platform: 'youtube', category: 'Gaming', verified: true },
  { id: 'dude-perfect', name: 'Dude Perfect', image: 'https://yt3.googleusercontent.com/ytc/AIdro_k8xYqZZ=s176-c-k-c0x00ffffff-no-rj', subscribers: '60M', platform: 'youtube', category: 'Sports', verified: true },
  { id: 'marshmello', name: 'Marshmello', image: 'https://yt3.googleusercontent.com/ytc/AIdro_mPPxz=s176-c-k-c0x00ffffff-no-rj', subscribers: '57M', platform: 'youtube', category: 'Music', verified: true },
  { id: 'eminem', name: 'Eminem', image: 'https://yt3.googleusercontent.com/ytc/AIdro_kmqR=s176-c-k-c0x00ffffff-no-rj', subscribers: '58M', platform: 'youtube', category: 'Music', verified: true },
];

const POPULAR_FACEBOOK_PAGES: ChannelSuggestion[] = [
  { id: 'fb-tasty', name: 'Tasty', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Tasty_Logo.svg/200px-Tasty_Logo.svg.png', subscribers: '107M', platform: 'facebook', category: 'Food', verified: true },
  { id: 'fb-ladbible', name: 'LADbible', image: 'https://yt3.googleusercontent.com/ytc/AIdro_kzxZ=s176-c-k-c0x00ffffff-no-rj', subscribers: '45M', platform: 'facebook', category: 'Entertainment', verified: true },
  { id: 'fb-unilad', name: 'UNILAD', image: 'https://yt3.googleusercontent.com/ytc/AIdro_mzK=s176-c-k-c0x00ffffff-no-rj', subscribers: '44M', platform: 'facebook', category: 'Entertainment', verified: true },
  { id: 'fb-9gag', name: '9GAG', image: 'https://yt3.googleusercontent.com/ytc/AIdro_nZq=s176-c-k-c0x00ffffff-no-rj', subscribers: '42M', platform: 'facebook', category: 'Humor', verified: true },
  { id: 'fb-buzzfeed', name: 'BuzzFeed', image: 'https://yt3.googleusercontent.com/ytc/AIdro_kBz=s176-c-k-c0x00ffffff-no-rj', subscribers: '37M', platform: 'facebook', category: 'Media', verified: true },
];

const CATEGORY_COLORS: Record<string, string> = {
  'Gaming': 'from-purple-500 to-pink-500',
  'Entertainment': 'from-orange-500 to-red-500',
  'Music': 'from-green-500 to-emerald-500',
  'Education': 'from-blue-500 to-cyan-500',
  'Kids': 'from-yellow-400 to-orange-400',
  'Sports': 'from-red-500 to-rose-500',
  'Food': 'from-amber-500 to-yellow-500',
  'Humor': 'from-pink-500 to-fuchsia-500',
  'Media': 'from-indigo-500 to-purple-500',
  'Tech': 'from-cyan-500 to-blue-500',
  'Lifestyle': 'from-rose-400 to-pink-400',
  'default': 'from-gray-500 to-slate-500'
};

const CreatorAnalytics: React.FC<CreatorAnalyticsProps> = ({ userCredits, onCreditsChange }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('youtube');
  const [analysisCreditCost, setAnalysisCreditCost] = useState(5);
  
  // YouTube state
  const [youtubeInput, setYoutubeInput] = useState('');
  const [youtubeLoading, setYoutubeLoading] = useState(false);
  const [youtubeStats, setYoutubeStats] = useState<YouTubeStats | null>(null);
  const [youtubeSuggestions, setYoutubeSuggestions] = useState<ChannelSuggestion[]>([]);
  const [showYoutubeSuggestions, setShowYoutubeSuggestions] = useState(false);
  
  // Facebook state
  const [facebookInput, setFacebookInput] = useState('');
  const [facebookFollowers, setFacebookFollowers] = useState('');
  const [facebookLoading, setFacebookLoading] = useState(false);
  const [facebookStats, setFacebookStats] = useState<FacebookStats | null>(null);
  const [facebookSuggestions, setFacebookSuggestions] = useState<ChannelSuggestion[]>([]);
  const [showFacebookSuggestions, setShowFacebookSuggestions] = useState(false);
  
  // TikTok state
  const [tiktokInput, setTiktokInput] = useState('');
  const [tiktokFollowers, setTiktokFollowers] = useState('');
  const [tiktokNiche, setTiktokNiche] = useState('entertainment');
  const [tiktokLoading, setTiktokLoading] = useState(false);
  const [tiktokStats, setTiktokStats] = useState<TikTokStats | null>(null);
  
  // Instagram state
  const [instagramInput, setInstagramInput] = useState('');
  const [instagramFollowers, setInstagramFollowers] = useState('');
  const [instagramNiche, setInstagramNiche] = useState('general');
  const [instagramLoading, setInstagramLoading] = useState(false);
  const [instagramStats, setInstagramStats] = useState<InstagramStats | null>(null);
  
  // Twitter state
  const [twitterInput, setTwitterInput] = useState('');
  const [twitterFollowers, setTwitterFollowers] = useState('');
  const [twitterNiche, setTwitterNiche] = useState('general');
  const [twitterLoading, setTwitterLoading] = useState(false);
  const [twitterStats, setTwitterStats] = useState<TwitterStats | null>(null);
  
  // AdSense state
  const [adsenseUrl, setAdsenseUrl] = useState('');
  const [monthlyVisitors, setMonthlyVisitors] = useState('');
  const [websiteNiche, setWebsiteNiche] = useState('general');
  const [adsenseLoading, setAdsenseLoading] = useState(false);
  const [adsenseStats, setAdsenseStats] = useState<AdSenseStats | null>(null);

  // Refs for click outside
  const youtubeRef = useRef<HTMLDivElement>(null);
  const facebookRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPricing();
  }, []);

  // Filter YouTube suggestions based on input
  useEffect(() => {
    if (youtubeInput.length > 0) {
      const filtered = POPULAR_YOUTUBE_CHANNELS.filter(channel =>
        channel.name.toLowerCase().includes(youtubeInput.toLowerCase())
      );
      setYoutubeSuggestions(filtered.length > 0 ? filtered : POPULAR_YOUTUBE_CHANNELS);
      setShowYoutubeSuggestions(true);
    } else {
      setYoutubeSuggestions(POPULAR_YOUTUBE_CHANNELS);
      setShowYoutubeSuggestions(false);
    }
  }, [youtubeInput]);

  // Filter Facebook suggestions based on input
  useEffect(() => {
    if (facebookInput.length > 0) {
      const filtered = POPULAR_FACEBOOK_PAGES.filter(page =>
        page.name.toLowerCase().includes(facebookInput.toLowerCase())
      );
      setFacebookSuggestions(filtered.length > 0 ? filtered : POPULAR_FACEBOOK_PAGES);
      setShowFacebookSuggestions(true);
    } else {
      setFacebookSuggestions(POPULAR_FACEBOOK_PAGES);
      setShowFacebookSuggestions(false);
    }
  }, [facebookInput]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (youtubeRef.current && !youtubeRef.current.contains(event.target as Node)) {
        setShowYoutubeSuggestions(false);
      }
      if (facebookRef.current && !facebookRef.current.contains(event.target as Node)) {
        setShowFacebookSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchPricing = async () => {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'ai_analytics_credit_cost')
        .maybeSingle();
      
      if (data?.value) {
        setAnalysisCreditCost(parseInt(data.value));
      }
    } catch (error) {
      console.error('Error fetching pricing:', error);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000000) return (num / 1000000000).toFixed(2) + 'B';
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
    return num.toString();
  };

  const formatCurrency = (num: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  const getGradeColor = (grade: string): string => {
    const colors: { [key: string]: string } = {
      'A++': 'bg-gradient-to-r from-green-500 to-emerald-500',
      'A+': 'bg-gradient-to-r from-green-500 to-emerald-400',
      'A': 'bg-gradient-to-r from-green-400 to-green-500',
      'A-': 'bg-gradient-to-r from-green-300 to-green-400',
      'B+': 'bg-gradient-to-r from-blue-500 to-indigo-500',
      'B': 'bg-gradient-to-r from-blue-400 to-blue-500',
      'B-': 'bg-gradient-to-r from-blue-300 to-blue-400',
      'C+': 'bg-gradient-to-r from-yellow-500 to-amber-500',
      'C': 'bg-gradient-to-r from-yellow-400 to-yellow-500',
      'C-': 'bg-gradient-to-r from-yellow-300 to-yellow-400',
      'D': 'bg-gradient-to-r from-orange-500 to-red-500',
      'F': 'bg-gradient-to-r from-red-500 to-rose-600'
    };
    return colors[grade] || 'bg-gradient-to-r from-gray-400 to-gray-500';
  };

  const getCategoryGradient = (category: string): string => {
    return CATEGORY_COLORS[category] || CATEGORY_COLORS['default'];
  };

  const deductCredits = async (): Promise<boolean> => {
    if (!user) return false;
    if (userCredits < analysisCreditCost) {
      toast.error(`Insufficient credits. You need ${analysisCreditCost} credits.`);
      return false;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ credits: userCredits - analysisCreditCost })
        .eq('id', user.id);

      if (error) throw error;
      onCreditsChange();
      return true;
    } catch (error) {
      console.error('Error deducting credits:', error);
      toast.error('Failed to deduct credits');
      return false;
    }
  };

  const canAnalyze = userCredits >= analysisCreditCost;

  const selectYoutubeChannel = (channel: ChannelSuggestion) => {
    setYoutubeInput(channel.name);
    setShowYoutubeSuggestions(false);
  };

  const selectFacebookPage = (page: ChannelSuggestion) => {
    setFacebookInput(page.name);
    if (page.subscribers) {
      // Convert subscriber string to number
      const subsStr = page.subscribers.replace('M', '000000').replace('K', '000');
      setFacebookFollowers(subsStr);
    }
    setShowFacebookSuggestions(false);
  };

  const handleYouTubeAnalyze = async () => {
    if (!youtubeInput.trim()) {
      toast.error('Please enter a YouTube channel URL or username');
      return;
    }

    if (!canAnalyze) {
      toast.error(`You need ${analysisCreditCost} credits to analyze`);
      return;
    }

    const deducted = await deductCredits();
    if (!deducted) return;

    setYoutubeLoading(true);
    setYoutubeStats(null);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-creator', {
        body: { 
          platform: 'youtube',
          input: youtubeInput.trim()
        }
      });

      if (error) throw error;

      if (data?.stats) {
        // Find channel image from suggestions if available
        const channel = POPULAR_YOUTUBE_CHANNELS.find(c => 
          c.name.toLowerCase() === youtubeInput.toLowerCase()
        );
        setYoutubeStats({
          ...data.stats,
          channelImage: channel?.image || data.stats.channelImage
        });
        toast.success('YouTube analytics loaded!');
      } else {
        throw new Error(data?.error || 'Failed to analyze channel');
      }
    } catch (error: any) {
      console.error('YouTube analysis error:', error);
      toast.error(error.message || 'Failed to analyze YouTube channel');
    } finally {
      setYoutubeLoading(false);
    }
  };

  const handleFacebookAnalyze = async () => {
    if (!facebookInput.trim() || !facebookFollowers.trim()) {
      toast.error('Please enter page name and follower count');
      return;
    }

    if (!canAnalyze) {
      toast.error(`You need ${analysisCreditCost} credits to analyze`);
      return;
    }

    const deducted = await deductCredits();
    if (!deducted) return;

    setFacebookLoading(true);
    setFacebookStats(null);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-creator', {
        body: { 
          platform: 'facebook',
          input: facebookInput.trim(),
          followers: parseInt(facebookFollowers)
        }
      });

      if (error) throw error;

      if (data?.stats) {
        const page = POPULAR_FACEBOOK_PAGES.find(p => 
          p.name.toLowerCase() === facebookInput.toLowerCase()
        );
        setFacebookStats({
          ...data.stats,
          pageImage: page?.image || data.stats.pageImage
        });
        toast.success('Facebook analytics loaded!');
      } else {
        throw new Error(data?.error || 'Failed to analyze page');
      }
    } catch (error: any) {
      console.error('Facebook analysis error:', error);
      toast.error(error.message || 'Failed to analyze Facebook page');
    } finally {
      setFacebookLoading(false);
    }
  };

  const handleTikTokAnalyze = async () => {
    if (!tiktokInput.trim()) {
      toast.error('Please enter a TikTok username or URL');
      return;
    }
    if (!canAnalyze) {
      toast.error(`You need ${analysisCreditCost} credits to analyze`);
      return;
    }
    const deducted = await deductCredits();
    if (!deducted) return;
    setTiktokLoading(true);
    setTiktokStats(null);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-creator', {
        body: { platform: 'tiktok', input: tiktokInput.trim(), followers: parseInt(tiktokFollowers) || undefined, niche: tiktokNiche }
      });
      if (error) throw error;
      if (data?.stats) {
        setTiktokStats(data.stats);
        toast.success('TikTok analytics loaded!');
      } else throw new Error(data?.error || 'Failed to analyze');
    } catch (error: any) {
      toast.error(error.message || 'Failed to analyze TikTok account');
    } finally {
      setTiktokLoading(false);
    }
  };

  const handleInstagramAnalyze = async () => {
    if (!instagramInput.trim()) {
      toast.error('Please enter an Instagram username or URL');
      return;
    }
    if (!canAnalyze) {
      toast.error(`You need ${analysisCreditCost} credits to analyze`);
      return;
    }
    const deducted = await deductCredits();
    if (!deducted) return;
    setInstagramLoading(true);
    setInstagramStats(null);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-creator', {
        body: { platform: 'instagram', input: instagramInput.trim(), followers: parseInt(instagramFollowers) || undefined, niche: instagramNiche }
      });
      if (error) throw error;
      if (data?.stats) {
        setInstagramStats(data.stats);
        toast.success('Instagram analytics loaded!');
      } else throw new Error(data?.error || 'Failed to analyze');
    } catch (error: any) {
      toast.error(error.message || 'Failed to analyze Instagram account');
    } finally {
      setInstagramLoading(false);
    }
  };

  const handleTwitterAnalyze = async () => {
    if (!twitterInput.trim()) {
      toast.error('Please enter a Twitter/X username or URL');
      return;
    }
    if (!canAnalyze) {
      toast.error(`You need ${analysisCreditCost} credits to analyze`);
      return;
    }
    const deducted = await deductCredits();
    if (!deducted) return;
    setTwitterLoading(true);
    setTwitterStats(null);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-creator', {
        body: { platform: 'twitter', input: twitterInput.trim(), followers: parseInt(twitterFollowers) || undefined, niche: twitterNiche }
      });
      if (error) throw error;
      if (data?.stats) {
        setTwitterStats(data.stats);
        toast.success('Twitter/X analytics loaded!');
      } else throw new Error(data?.error || 'Failed to analyze');
    } catch (error: any) {
      toast.error(error.message || 'Failed to analyze Twitter account');
    } finally {
      setTwitterLoading(false);
    }
  };

  const handleAdSenseAnalyze = async () => {
    if (!adsenseUrl.trim() || !monthlyVisitors.trim()) {
      toast.error('Please enter website URL and monthly visitors');
      return;
    }

    if (!canAnalyze) {
      toast.error(`You need ${analysisCreditCost} credits to analyze`);
      return;
    }

    const deducted = await deductCredits();
    if (!deducted) return;

    setAdsenseLoading(true);
    setAdsenseStats(null);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-creator', {
        body: { 
          platform: 'adsense',
          url: adsenseUrl.trim(),
          monthlyVisitors: parseInt(monthlyVisitors),
          niche: websiteNiche
        }
      });

      if (error) throw error;

      if (data?.stats) {
        setAdsenseStats(data.stats);
        toast.success('AdSense analytics loaded!');
      } else {
        throw new Error(data?.error || 'Failed to analyze website');
      }
    } catch (error: any) {
      console.error('AdSense analysis error:', error);
      toast.error(error.message || 'Failed to analyze website');
    } finally {
      setAdsenseLoading(false);
    }
  };

  const renderChannelSuggestion = (suggestion: ChannelSuggestion, onClick: () => void) => (
    <button
      key={suggestion.id}
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 hover:bg-accent/50 transition-all duration-200 rounded-lg group"
    >
      <div className="relative">
        <div className={`w-12 h-12 rounded-full overflow-hidden ring-2 ring-offset-2 ring-offset-background bg-gradient-to-br ${getCategoryGradient(suggestion.category || 'default')}`}>
          <img 
            src={suggestion.image} 
            alt={suggestion.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(suggestion.name)}&background=random&color=fff&size=48`;
            }}
          />
        </div>
        {suggestion.verified && (
          <div className="absolute -bottom-0.5 -right-0.5 bg-blue-500 rounded-full p-0.5">
            <CheckCircle2 className="h-3 w-3 text-white" />
          </div>
        )}
      </div>
      <div className="flex-1 text-left">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm group-hover:text-primary transition-colors">
            {suggestion.name}
          </span>
          {suggestion.platform === 'youtube' && (
            <Youtube className="h-3.5 w-3.5 text-red-500" />
          )}
          {suggestion.platform === 'facebook' && (
            <Facebook className="h-3.5 w-3.5 text-blue-600" />
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {suggestion.subscribers && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" />
              {suggestion.subscribers}
            </span>
          )}
          {suggestion.category && (
            <Badge 
              variant="secondary" 
              className={`text-xs px-1.5 py-0 bg-gradient-to-r ${getCategoryGradient(suggestion.category)} text-white border-0`}
            >
              {suggestion.category}
            </Badge>
          )}
        </div>
      </div>
      <Sparkles className="h-4 w-4 text-yellow-500 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );

  if (!canAnalyze) {
    return (
      <Card className="border-2 border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-primary" />
            Creator Analytics (Social Blade Style)
            <Badge variant="secondary" className="ml-2 gap-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0">
              <Crown className="h-3 w-3" />
              Premium
            </Badge>
          </CardTitle>
          <CardDescription>
            Estimate how much creators earn on YouTube, Facebook, and websites with AdSense
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Lock className="h-8 w-8 text-white" />
            </div>
            <p className="text-muted-foreground">You need at least {analysisCreditCost} credits to use this feature</p>
            <p className="text-sm text-muted-foreground">Current balance: {userCredits} credits</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <CardHeader className="pb-3 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-orange-500/10">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            Creator Analytics
            <Badge variant="secondary" className="ml-2 gap-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0">
              <Crown className="h-3 w-3" />
              Premium
            </Badge>
          </CardTitle>
          <CardDescription>
            Estimate earnings for YouTube, Facebook, and AdSense creators
          </CardDescription>
          <Badge variant="outline" className="w-fit mt-2 bg-background">{analysisCreditCost} credits/analysis</Badge>
        </CardHeader>
        <CardContent className="pt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-6 w-full bg-gradient-to-r from-red-500/10 via-blue-500/10 to-green-500/10">
              <TabsTrigger value="youtube" className="flex items-center gap-1 text-xs data-[state=active]:bg-red-500 data-[state=active]:text-white">
                <Youtube className="h-3 w-3" />
                <span className="hidden sm:inline">YouTube</span>
              </TabsTrigger>
              <TabsTrigger value="tiktok" className="flex items-center gap-1 text-xs data-[state=active]:bg-black data-[state=active]:text-white">
                <TikTokIcon className="h-3 w-3" />
                <span className="hidden sm:inline">TikTok</span>
              </TabsTrigger>
              <TabsTrigger value="instagram" className="flex items-center gap-1 text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white">
                <InstagramIcon className="h-3 w-3" />
                <span className="hidden sm:inline">Instagram</span>
              </TabsTrigger>
              <TabsTrigger value="facebook" className="flex items-center gap-1 text-xs data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <Facebook className="h-3 w-3" />
                <span className="hidden sm:inline">Facebook</span>
              </TabsTrigger>
              <TabsTrigger value="twitter" className="flex items-center gap-1 text-xs data-[state=active]:bg-black data-[state=active]:text-white">
                <TwitterIcon className="h-3 w-3" />
                <span className="hidden sm:inline">X/Twitter</span>
              </TabsTrigger>
              <TabsTrigger value="adsense" className="flex items-center gap-1 text-xs data-[state=active]:bg-green-600 data-[state=active]:text-white">
                <Globe className="h-3 w-3" />
                <span className="hidden sm:inline">AdSense</span>
              </TabsTrigger>
            </TabsList>

            {/* YouTube Tab */}
            <TabsContent value="youtube" className="mt-4 space-y-4">
              <div ref={youtubeRef} className="relative">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      placeholder="Search YouTube channel..."
                      value={youtubeInput}
                      onChange={(e) => setYoutubeInput(e.target.value)}
                      onFocus={() => setShowYoutubeSuggestions(true)}
                      onKeyDown={(e) => e.key === 'Enter' && handleYouTubeAnalyze()}
                      className="pr-10"
                    />
                    <Youtube className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
                  </div>
                  <Button 
                    onClick={handleYouTubeAnalyze} 
                    disabled={youtubeLoading}
                    className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                  >
                    {youtubeLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* YouTube Suggestions Dropdown */}
                {showYoutubeSuggestions && (
                  <Card className="absolute z-50 w-full mt-2 shadow-xl border-2">
                    <CardHeader className="py-2 px-3 bg-gradient-to-r from-red-500/10 to-orange-500/10">
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-yellow-500" />
                        Popular YouTube Channels
                      </p>
                    </CardHeader>
                    <ScrollArea className="max-h-[300px]">
                      <div className="p-2 space-y-1">
                        {youtubeSuggestions.map(channel => 
                          renderChannelSuggestion(channel, () => selectYoutubeChannel(channel))
                        )}
                      </div>
                    </ScrollArea>
                  </Card>
                )}
              </div>

              {youtubeStats && (
                <Card className="bg-gradient-to-br from-red-500/5 to-orange-500/5 border-red-500/20 overflow-hidden">
                  {/* Banner Image */}
                  {youtubeStats.bannerImage && (
                    <div className="w-full h-32 md:h-40 overflow-hidden">
                      <img 
                        src={youtubeStats.bannerImage} 
                        alt={`${youtubeStats.channelName} banner`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  <CardContent className="pt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {youtubeStats.channelImage && (
                          <div className="relative">
                            <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-red-500 ring-offset-2 ring-offset-background">
                              <img 
                                src={youtubeStats.channelImage} 
                                alt={youtubeStats.channelName}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            {youtubeStats.verified && (
                              <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1">
                                <CheckCircle2 className="h-4 w-4 text-white" />
                              </div>
                            )}
                          </div>
                        )}
                        <div>
                          <h3 className="font-bold text-lg flex items-center gap-2">
                            {youtubeStats.channelName}
                            <Youtube className="h-4 w-4 text-red-500" />
                          </h3>
                          {youtubeStats.channelHandle && (
                            <p className="text-sm text-muted-foreground">{youtubeStats.channelHandle}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <Badge 
                              variant="secondary" 
                              className={`bg-gradient-to-r ${getCategoryGradient(youtubeStats.category)} text-white border-0`}
                            >
                              {youtubeStats.category}
                            </Badge>
                            {youtubeStats.country && youtubeStats.country !== 'Unknown' && (
                              <Badge variant="outline" className="text-xs">
                                {youtubeStats.country}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <Badge className={`${getGradeColor(youtubeStats.grade)} text-white text-lg px-3 py-1 shadow-lg`}>
                        {youtubeStats.grade}
                      </Badge>
                    </div>

                    {/* Channel Description */}
                    {youtubeStats.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {youtubeStats.description}
                      </p>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-background rounded-lg p-3 text-center border border-red-500/20 hover:border-red-500/40 transition-colors">
                        <Users className="h-5 w-5 mx-auto mb-1 text-red-500" />
                        <p className="text-xs text-muted-foreground">Subscribers</p>
                        <p className="font-bold text-lg">{formatNumber(youtubeStats.subscribers)}</p>
                      </div>
                      <div className="bg-background rounded-lg p-3 text-center border border-blue-500/20 hover:border-blue-500/40 transition-colors">
                        <Eye className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                        <p className="text-xs text-muted-foreground">Total Views</p>
                        <p className="font-bold text-lg">{formatNumber(youtubeStats.totalViews)}</p>
                      </div>
                      <div className="bg-background rounded-lg p-3 text-center border border-purple-500/20 hover:border-purple-500/40 transition-colors">
                        <Video className="h-5 w-5 mx-auto mb-1 text-purple-500" />
                        <p className="text-xs text-muted-foreground">Videos</p>
                        <p className="font-bold text-lg">{formatNumber(youtubeStats.videoCount)}</p>
                      </div>
                      <div className="bg-background rounded-lg p-3 text-center border border-green-500/20 hover:border-green-500/40 transition-colors">
                        <TrendingUp className="h-5 w-5 mx-auto mb-1 text-green-500" />
                        <p className="text-xs text-muted-foreground">Avg Views</p>
                        <p className="font-bold text-lg">{formatNumber(youtubeStats.averageViews)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1.5 rounded-full bg-green-500/20">
                            <DollarSign className="h-4 w-4 text-green-500" />
                          </div>
                          <span className="font-medium">Est. Monthly Earnings</span>
                        </div>
                        <p className="text-2xl font-bold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">
                          {formatCurrency(youtubeStats.estimatedMonthlyEarnings.low)} - {formatCurrency(youtubeStats.estimatedMonthlyEarnings.high)}
                        </p>
                        {youtubeStats.estimatedMonthlyViews && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Based on ~{formatNumber(youtubeStats.estimatedMonthlyViews)} monthly views
                          </p>
                        )}
                      </div>
                      <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1.5 rounded-full bg-blue-500/20">
                            <DollarSign className="h-4 w-4 text-blue-500" />
                          </div>
                          <span className="font-medium">Est. Yearly Earnings</span>
                        </div>
                        <p className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">
                          {formatCurrency(youtubeStats.estimatedYearlyEarnings.low)} - {formatCurrency(youtubeStats.estimatedYearlyEarnings.high)}
                        </p>
                      </div>
                    </div>

                    {/* Recent Videos Section */}
                    {youtubeStats.recentVideos && youtubeStats.recentVideos.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                          <Video className="h-4 w-4 text-red-500" />
                          Recent Videos
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                          {youtubeStats.recentVideos.slice(0, 5).map((video) => (
                            <a
                              key={video.id}
                              href={`https://www.youtube.com/watch?v=${video.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group relative rounded-lg overflow-hidden border border-border hover:border-red-500/50 transition-all"
                            >
                              <div className="aspect-video bg-muted">
                                <img 
                                  src={video.thumbnail} 
                                  alt={video.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                              </div>
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="absolute bottom-0 left-0 right-0 p-2">
                                  <p className="text-xs text-white line-clamp-2">{video.title}</p>
                                  <p className="text-xs text-white/70 mt-0.5">
                                    {formatNumber(video.views)} views
                                  </p>
                                </div>
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="text-xs text-muted-foreground flex items-center gap-1 bg-muted/50 rounded-lg p-2">
                      <Info className="h-3 w-3" />
                      Estimated CPM: ${youtubeStats.cpm.low} - ${youtubeStats.cpm.high}. Data from YouTube API.
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* TikTok Tab */}
            <TabsContent value="tiktok" className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="relative">
                  <Input
                    placeholder="TikTok username or URL"
                    value={tiktokInput}
                    onChange={(e) => setTiktokInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleTikTokAnalyze()}
                    className="pr-10"
                  />
                  <TikTokIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4" />
                </div>
                <Input
                  placeholder="Follower count (optional)"
                  type="number"
                  value={tiktokFollowers}
                  onChange={(e) => setTiktokFollowers(e.target.value)}
                />
                <div className="flex gap-2">
                  <Select value={tiktokNiche} onValueChange={setTiktokNiche}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Niche" />
                    </SelectTrigger>
                    <SelectContent className="bg-background">
                      <SelectItem value="entertainment">Entertainment</SelectItem>
                      <SelectItem value="dance">Dance</SelectItem>
                      <SelectItem value="comedy">Comedy</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                      <SelectItem value="beauty">Beauty</SelectItem>
                      <SelectItem value="fitness">Fitness</SelectItem>
                      <SelectItem value="food">Food</SelectItem>
                      <SelectItem value="gaming">Gaming</SelectItem>
                      <SelectItem value="music">Music</SelectItem>
                      <SelectItem value="lifestyle">Lifestyle</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={handleTikTokAnalyze} 
                    disabled={tiktokLoading}
                    className="bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 hover:from-pink-600 hover:via-red-600 hover:to-yellow-600"
                  >
                    {tiktokLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {tiktokStats && (
                <Card className="bg-gradient-to-br from-pink-500/5 via-red-500/5 to-yellow-500/5 border-pink-500/20 overflow-hidden">
                  <CardContent className="pt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {tiktokStats.profileImage && (
                          <div className="relative">
                            <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-pink-500 ring-offset-2 ring-offset-background">
                              <img src={tiktokStats.profileImage} alt={tiktokStats.username} className="w-full h-full object-cover" />
                            </div>
                            {tiktokStats.verified && (
                              <div className="absolute -bottom-1 -right-1 bg-cyan-500 rounded-full p-1">
                                <CheckCircle2 className="h-4 w-4 text-white" />
                              </div>
                            )}
                          </div>
                        )}
                        <div>
                          <h3 className="font-bold text-lg flex items-center gap-2">
                            {tiktokStats.nickname || tiktokStats.username}
                            <TikTokIcon className="h-4 w-4" />
                          </h3>
                          <p className="text-sm text-muted-foreground">@{tiktokStats.username}</p>
                          <Badge variant="secondary" className={`bg-gradient-to-r ${getCategoryGradient(tiktokStats.niche)} text-white border-0 mt-1`}>
                            {tiktokStats.niche}
                          </Badge>
                        </div>
                      </div>
                      <Badge className={`${getGradeColor(tiktokStats.grade)} text-white text-lg px-3 py-1 shadow-lg`}>
                        {tiktokStats.grade}
                      </Badge>
                    </div>

                    {tiktokStats.bio && <p className="text-sm text-muted-foreground line-clamp-2">{tiktokStats.bio}</p>}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-background rounded-lg p-3 text-center border border-pink-500/20 hover:border-pink-500/40 transition-colors">
                        <Users className="h-5 w-5 mx-auto mb-1 text-pink-500" />
                        <p className="text-xs text-muted-foreground">Followers</p>
                        <p className="font-bold text-lg">{formatNumber(tiktokStats.followers)}</p>
                      </div>
                      <div className="bg-background rounded-lg p-3 text-center border border-red-500/20 hover:border-red-500/40 transition-colors">
                        <Heart className="h-5 w-5 mx-auto mb-1 text-red-500" />
                        <p className="text-xs text-muted-foreground">Likes</p>
                        <p className="font-bold text-lg">{formatNumber(tiktokStats.likes)}</p>
                      </div>
                      <div className="bg-background rounded-lg p-3 text-center border border-purple-500/20 hover:border-purple-500/40 transition-colors">
                        <Video className="h-5 w-5 mx-auto mb-1 text-purple-500" />
                        <p className="text-xs text-muted-foreground">Videos</p>
                        <p className="font-bold text-lg">{formatNumber(tiktokStats.videos)}</p>
                      </div>
                      <div className="bg-background rounded-lg p-3 text-center border border-green-500/20 hover:border-green-500/40 transition-colors">
                        <TrendingUp className="h-5 w-5 mx-auto mb-1 text-green-500" />
                        <p className="text-xs text-muted-foreground">Engagement</p>
                        <p className="font-bold text-lg">{tiktokStats.engagementRate}%</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1.5 rounded-full bg-green-500/20"><DollarSign className="h-4 w-4 text-green-500" /></div>
                          <span className="font-medium">Est. Monthly Earnings</span>
                        </div>
                        <p className="text-2xl font-bold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">
                          {formatCurrency(tiktokStats.estimatedMonthlyEarnings.low)} - {formatCurrency(tiktokStats.estimatedMonthlyEarnings.high)}
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-pink-500/10 to-red-500/10 border border-pink-500/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1.5 rounded-full bg-pink-500/20"><DollarSign className="h-4 w-4 text-pink-500" /></div>
                          <span className="font-medium">Est. Per Sponsored Post</span>
                        </div>
                        <p className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-red-500 bg-clip-text text-transparent">
                          {formatCurrency(tiktokStats.estimatedPerPost.low)} - {formatCurrency(tiktokStats.estimatedPerPost.high)}
                        </p>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground flex items-center gap-1 bg-muted/50 rounded-lg p-2">
                      <Info className="h-3 w-3" />
                      Creator Fund CPM: ${tiktokStats.cpm.low} - ${tiktokStats.cpm.high}. Estimates based on engagement and niche rates.
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Instagram Tab */}
            <TabsContent value="instagram" className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="relative">
                  <Input
                    placeholder="Instagram username or URL"
                    value={instagramInput}
                    onChange={(e) => setInstagramInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleInstagramAnalyze()}
                    className="pr-10"
                  />
                  <InstagramIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-pink-500" />
                </div>
                <Input
                  placeholder="Follower count (optional)"
                  type="number"
                  value={instagramFollowers}
                  onChange={(e) => setInstagramFollowers(e.target.value)}
                />
                <div className="flex gap-2">
                  <Select value={instagramNiche} onValueChange={setInstagramNiche}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Niche" />
                    </SelectTrigger>
                    <SelectContent className="bg-background">
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="fashion">Fashion</SelectItem>
                      <SelectItem value="beauty">Beauty</SelectItem>
                      <SelectItem value="fitness">Fitness</SelectItem>
                      <SelectItem value="travel">Travel</SelectItem>
                      <SelectItem value="food">Food</SelectItem>
                      <SelectItem value="lifestyle">Lifestyle</SelectItem>
                      <SelectItem value="photography">Photography</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="art">Art</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={handleInstagramAnalyze} 
                    disabled={instagramLoading}
                    className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:from-purple-600 hover:via-pink-600 hover:to-orange-600"
                  >
                    {instagramLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {instagramStats && (
                <Card className="bg-gradient-to-br from-purple-500/5 via-pink-500/5 to-orange-500/5 border-pink-500/20 overflow-hidden">
                  <CardContent className="pt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {instagramStats.profileImage && (
                          <div className="relative">
                            <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-pink-500 ring-offset-2 ring-offset-background">
                              <img src={instagramStats.profileImage} alt={instagramStats.username} className="w-full h-full object-cover" />
                            </div>
                            {instagramStats.verified && (
                              <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1">
                                <CheckCircle2 className="h-4 w-4 text-white" />
                              </div>
                            )}
                          </div>
                        )}
                        <div>
                          <h3 className="font-bold text-lg flex items-center gap-2">
                            {instagramStats.fullName || instagramStats.username}
                            <InstagramIcon className="h-4 w-4 text-pink-500" />
                          </h3>
                          <p className="text-sm text-muted-foreground">@{instagramStats.username}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="secondary" className={`bg-gradient-to-r ${getCategoryGradient(instagramStats.niche)} text-white border-0`}>
                              {instagramStats.niche}
                            </Badge>
                            {instagramStats.isPrivate && <Badge variant="outline" className="text-xs">Private</Badge>}
                          </div>
                        </div>
                      </div>
                      <Badge className={`${getGradeColor(instagramStats.grade)} text-white text-lg px-3 py-1 shadow-lg`}>
                        {instagramStats.grade}
                      </Badge>
                    </div>

                    {instagramStats.bio && <p className="text-sm text-muted-foreground line-clamp-2">{instagramStats.bio}</p>}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-background rounded-lg p-3 text-center border border-pink-500/20 hover:border-pink-500/40 transition-colors">
                        <Users className="h-5 w-5 mx-auto mb-1 text-pink-500" />
                        <p className="text-xs text-muted-foreground">Followers</p>
                        <p className="font-bold text-lg">{formatNumber(instagramStats.followers)}</p>
                      </div>
                      <div className="bg-background rounded-lg p-3 text-center border border-purple-500/20 hover:border-purple-500/40 transition-colors">
                        <Users className="h-5 w-5 mx-auto mb-1 text-purple-500" />
                        <p className="text-xs text-muted-foreground">Following</p>
                        <p className="font-bold text-lg">{formatNumber(instagramStats.following)}</p>
                      </div>
                      <div className="bg-background rounded-lg p-3 text-center border border-orange-500/20 hover:border-orange-500/40 transition-colors">
                        <ImageIcon className="h-5 w-5 mx-auto mb-1 text-orange-500" />
                        <p className="text-xs text-muted-foreground">Posts</p>
                        <p className="font-bold text-lg">{formatNumber(instagramStats.posts)}</p>
                      </div>
                      <div className="bg-background rounded-lg p-3 text-center border border-green-500/20 hover:border-green-500/40 transition-colors">
                        <TrendingUp className="h-5 w-5 mx-auto mb-1 text-green-500" />
                        <p className="text-xs text-muted-foreground">Engagement</p>
                        <p className="font-bold text-lg">{instagramStats.engagementRate}%</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="bg-gradient-to-br from-pink-500/10 to-purple-500/10 border border-pink-500/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1.5 rounded-full bg-pink-500/20"><ImageIcon className="h-4 w-4 text-pink-500" /></div>
                          <span className="font-medium text-sm">Per Post</span>
                        </div>
                        <p className="text-xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                          {formatCurrency(instagramStats.estimatedPerPost.low)} - {formatCurrency(instagramStats.estimatedPerPost.high)}
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-500/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1.5 rounded-full bg-purple-500/20"><Video className="h-4 w-4 text-purple-500" /></div>
                          <span className="font-medium text-sm">Per Reel</span>
                        </div>
                        <p className="text-xl font-bold bg-gradient-to-r from-purple-500 to-indigo-500 bg-clip-text text-transparent">
                          {formatCurrency(instagramStats.estimatedPerReel.low)} - {formatCurrency(instagramStats.estimatedPerReel.high)}
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1.5 rounded-full bg-green-500/20"><DollarSign className="h-4 w-4 text-green-500" /></div>
                          <span className="font-medium text-sm">Monthly</span>
                        </div>
                        <p className="text-xl font-bold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">
                          {formatCurrency(instagramStats.estimatedMonthlyEarnings.low)} - {formatCurrency(instagramStats.estimatedMonthlyEarnings.high)}
                        </p>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground flex items-center gap-1 bg-muted/50 rounded-lg p-2">
                      <Info className="h-3 w-3" />
                      Estimates based on follower count, engagement rate, and industry sponsorship standards.
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Twitter/X Tab */}
            <TabsContent value="twitter" className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="relative">
                  <Input
                    placeholder="Twitter/X username or URL"
                    value={twitterInput}
                    onChange={(e) => setTwitterInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleTwitterAnalyze()}
                    className="pr-10"
                  />
                  <TwitterIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4" />
                </div>
                <Input
                  placeholder="Follower count (optional)"
                  type="number"
                  value={twitterFollowers}
                  onChange={(e) => setTwitterFollowers(e.target.value)}
                />
                <div className="flex gap-2">
                  <Select value={twitterNiche} onValueChange={setTwitterNiche}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Niche" />
                    </SelectTrigger>
                    <SelectContent className="bg-background">
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="tech">Tech</SelectItem>
                      <SelectItem value="crypto">Crypto/Web3</SelectItem>
                      <SelectItem value="politics">Politics</SelectItem>
                      <SelectItem value="sports">Sports</SelectItem>
                      <SelectItem value="entertainment">Entertainment</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="news">News</SelectItem>
                      <SelectItem value="comedy">Comedy</SelectItem>
                      <SelectItem value="gaming">Gaming</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={handleTwitterAnalyze} 
                    disabled={twitterLoading}
                    className="bg-black hover:bg-gray-900 text-white"
                  >
                    {twitterLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {twitterStats && (
                <Card className="bg-gradient-to-br from-gray-500/5 to-slate-500/5 border-gray-500/20 overflow-hidden">
                  {twitterStats.bannerImage && (
                    <div className="w-full h-24 md:h-32 overflow-hidden">
                      <img src={twitterStats.bannerImage} alt={`${twitterStats.displayName} banner`} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <CardContent className="pt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {twitterStats.profileImage && (
                          <div className="relative">
                            <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-gray-600 ring-offset-2 ring-offset-background">
                              <img src={twitterStats.profileImage} alt={twitterStats.username} className="w-full h-full object-cover" />
                            </div>
                            {twitterStats.verified && (
                              <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1">
                                <CheckCircle2 className="h-4 w-4 text-white" />
                              </div>
                            )}
                          </div>
                        )}
                        <div>
                          <h3 className="font-bold text-lg flex items-center gap-2">
                            {twitterStats.displayName}
                            <TwitterIcon className="h-4 w-4" />
                          </h3>
                          <p className="text-sm text-muted-foreground">@{twitterStats.username}</p>
                          <Badge variant="secondary" className={`bg-gradient-to-r ${getCategoryGradient(twitterStats.niche === 'tech' ? 'Tech' : 'default')} text-white border-0 mt-1`}>
                            {twitterStats.niche}
                          </Badge>
                        </div>
                      </div>
                      <Badge className={`${getGradeColor(twitterStats.grade)} text-white text-lg px-3 py-1 shadow-lg`}>
                        {twitterStats.grade}
                      </Badge>
                    </div>

                    {twitterStats.bio && <p className="text-sm text-muted-foreground line-clamp-2">{twitterStats.bio}</p>}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-background rounded-lg p-3 text-center border border-gray-500/20 hover:border-gray-500/40 transition-colors">
                        <Users className="h-5 w-5 mx-auto mb-1 text-gray-500" />
                        <p className="text-xs text-muted-foreground">Followers</p>
                        <p className="font-bold text-lg">{formatNumber(twitterStats.followers)}</p>
                      </div>
                      <div className="bg-background rounded-lg p-3 text-center border border-blue-500/20 hover:border-blue-500/40 transition-colors">
                        <Users className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                        <p className="text-xs text-muted-foreground">Following</p>
                        <p className="font-bold text-lg">{formatNumber(twitterStats.following)}</p>
                      </div>
                      <div className="bg-background rounded-lg p-3 text-center border border-cyan-500/20 hover:border-cyan-500/40 transition-colors">
                        <MessageCircle className="h-5 w-5 mx-auto mb-1 text-cyan-500" />
                        <p className="text-xs text-muted-foreground">Tweets</p>
                        <p className="font-bold text-lg">{formatNumber(twitterStats.tweets)}</p>
                      </div>
                      <div className="bg-background rounded-lg p-3 text-center border border-green-500/20 hover:border-green-500/40 transition-colors">
                        <TrendingUp className="h-5 w-5 mx-auto mb-1 text-green-500" />
                        <p className="text-xs text-muted-foreground">Engagement</p>
                        <p className="font-bold text-lg">{twitterStats.engagementRate}%</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="bg-gradient-to-br from-gray-500/10 to-slate-500/10 border border-gray-500/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1.5 rounded-full bg-gray-500/20"><MessageCircle className="h-4 w-4 text-gray-500" /></div>
                          <span className="font-medium text-sm">Per Tweet</span>
                        </div>
                        <p className="text-xl font-bold">
                          {formatCurrency(twitterStats.estimatedPerTweet.low)} - {formatCurrency(twitterStats.estimatedPerTweet.high)}
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1.5 rounded-full bg-blue-500/20"><Crown className="h-4 w-4 text-blue-500" /></div>
                          <span className="font-medium text-sm">Premium Revenue</span>
                        </div>
                        <p className="text-xl font-bold bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
                          {formatCurrency(twitterStats.estimatedPremiumRevenue.low)} - {formatCurrency(twitterStats.estimatedPremiumRevenue.high)}
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1.5 rounded-full bg-green-500/20"><DollarSign className="h-4 w-4 text-green-500" /></div>
                          <span className="font-medium text-sm">Monthly</span>
                        </div>
                        <p className="text-xl font-bold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">
                          {formatCurrency(twitterStats.estimatedMonthlyEarnings.low)} - {formatCurrency(twitterStats.estimatedMonthlyEarnings.high)}
                        </p>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground flex items-center gap-1 bg-muted/50 rounded-lg p-2">
                      <Info className="h-3 w-3" />
                      Includes X Premium ad revenue sharing estimates. Actual earnings depend on impressions and engagement.
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Facebook Tab */}
            <TabsContent value="facebook" className="mt-4 space-y-4">
              <div ref={facebookRef} className="relative">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="relative">
                    <Input
                      placeholder="Search Facebook page..."
                      value={facebookInput}
                      onChange={(e) => setFacebookInput(e.target.value)}
                      onFocus={() => setShowFacebookSuggestions(true)}
                      className="pr-10"
                    />
                    <Facebook className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Follower count"
                      type="number"
                      value={facebookFollowers}
                      onChange={(e) => setFacebookFollowers(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleFacebookAnalyze()}
                    />
                    <Button 
                      onClick={handleFacebookAnalyze} 
                      disabled={facebookLoading}
                      className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                    >
                      {facebookLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Facebook Suggestions Dropdown */}
                {showFacebookSuggestions && (
                  <Card className="absolute z-50 w-full md:w-1/2 mt-2 shadow-xl border-2">
                    <CardHeader className="py-2 px-3 bg-gradient-to-r from-blue-500/10 to-indigo-500/10">
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-yellow-500" />
                        Popular Facebook Pages
                      </p>
                    </CardHeader>
                    <ScrollArea className="max-h-[250px]">
                      <div className="p-2 space-y-1">
                        {facebookSuggestions.map(page => 
                          renderChannelSuggestion(page, () => selectFacebookPage(page))
                        )}
                      </div>
                    </ScrollArea>
                  </Card>
                )}
              </div>

              {facebookStats && (
                <Card className="bg-gradient-to-br from-blue-500/5 to-indigo-500/5 border-blue-500/20">
                  <CardContent className="pt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {facebookStats.pageImage && (
                          <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-blue-600 ring-offset-2 ring-offset-background">
                            <img 
                              src={facebookStats.pageImage} 
                              alt={facebookStats.pageName}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <h3 className="font-bold text-lg flex items-center gap-2">
                          {facebookStats.pageName}
                          <Facebook className="h-4 w-4 text-blue-600" />
                        </h3>
                      </div>
                      <Badge className={`${getGradeColor(facebookStats.grade)} text-white text-lg px-3 py-1 shadow-lg`}>
                        {facebookStats.grade}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-background rounded-lg p-3 text-center border border-blue-500/20 hover:border-blue-500/40 transition-colors">
                        <Users className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                        <p className="text-xs text-muted-foreground">Followers</p>
                        <p className="font-bold text-lg">{formatNumber(facebookStats.followers)}</p>
                      </div>
                      <div className="bg-background rounded-lg p-3 text-center border border-purple-500/20 hover:border-purple-500/40 transition-colors">
                        <Eye className="h-5 w-5 mx-auto mb-1 text-purple-500" />
                        <p className="text-xs text-muted-foreground">Est. Reach</p>
                        <p className="font-bold text-lg">{formatNumber(facebookStats.estimatedReach)}</p>
                      </div>
                      <div className="bg-background rounded-lg p-3 text-center border border-green-500/20 hover:border-green-500/40 transition-colors">
                        <TrendingUp className="h-5 w-5 mx-auto mb-1 text-green-500" />
                        <p className="text-xs text-muted-foreground">Engagement</p>
                        <p className="font-bold text-lg">{facebookStats.engagementRate}%</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1.5 rounded-full bg-green-500/20">
                            <DollarSign className="h-4 w-4 text-green-500" />
                          </div>
                          <span className="font-medium">Est. Monthly (Ads/Sponsorships)</span>
                        </div>
                        <p className="text-2xl font-bold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">
                          {formatCurrency(facebookStats.estimatedMonthlyEarnings.low)} - {formatCurrency(facebookStats.estimatedMonthlyEarnings.high)}
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1.5 rounded-full bg-blue-500/20">
                            <DollarSign className="h-4 w-4 text-blue-500" />
                          </div>
                          <span className="font-medium">Est. Per Sponsored Post</span>
                        </div>
                        <p className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">
                          {formatCurrency(facebookStats.estimatedPerPost.low)} - {formatCurrency(facebookStats.estimatedPerPost.high)}
                        </p>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground flex items-center gap-1 bg-muted/50 rounded-lg p-2">
                      <Info className="h-3 w-3" />
                      Estimates based on follower count, typical engagement rates, and industry sponsorship standards.
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* AdSense Tab */}
            <TabsContent value="adsense" className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="relative">
                  <Input
                    placeholder="Website URL"
                    value={adsenseUrl}
                    onChange={(e) => setAdsenseUrl(e.target.value)}
                    className="pr-10"
                  />
                  <Globe className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                </div>
                <Input
                  placeholder="Monthly visitors"
                  type="number"
                  value={monthlyVisitors}
                  onChange={(e) => setMonthlyVisitors(e.target.value)}
                />
                <div className="flex gap-2">
                  <Select value={websiteNiche} onValueChange={setWebsiteNiche}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Niche" />
                    </SelectTrigger>
                    <SelectContent className="bg-background">
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="tech">Technology</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="health">Health</SelectItem>
                      <SelectItem value="travel">Travel</SelectItem>
                      <SelectItem value="food">Food</SelectItem>
                      <SelectItem value="lifestyle">Lifestyle</SelectItem>
                      <SelectItem value="gaming">Gaming</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                      <SelectItem value="news">News</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={handleAdSenseAnalyze} 
                    disabled={adsenseLoading}
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                  >
                    {adsenseLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {adsenseStats && (
                <Card className="bg-gradient-to-br from-green-500/5 to-emerald-500/5 border-green-500/20">
                  <CardContent className="pt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-lg overflow-hidden ring-2 ring-green-500 ring-offset-2 ring-offset-background bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                          <Globe className="h-7 w-7 text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">{adsenseStats.websiteUrl}</h3>
                          <Badge 
                            variant="secondary" 
                            className={`bg-gradient-to-r ${getCategoryGradient(adsenseStats.niche === 'tech' ? 'Tech' : adsenseStats.niche === 'gaming' ? 'Gaming' : 'default')} text-white border-0`}
                          >
                            {adsenseStats.niche}
                          </Badge>
                        </div>
                      </div>
                      <Badge className={`${getGradeColor(adsenseStats.grade)} text-white text-lg px-3 py-1 shadow-lg`}>
                        {adsenseStats.grade}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-background rounded-lg p-3 text-center border border-blue-500/20 hover:border-blue-500/40 transition-colors">
                        <Users className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                        <p className="text-xs text-muted-foreground">Monthly Visitors</p>
                        <p className="font-bold text-lg">{formatNumber(adsenseStats.estimatedMonthlyVisitors)}</p>
                      </div>
                      <div className="bg-background rounded-lg p-3 text-center border border-purple-500/20 hover:border-purple-500/40 transition-colors">
                        <Eye className="h-5 w-5 mx-auto mb-1 text-purple-500" />
                        <p className="text-xs text-muted-foreground">Page Views</p>
                        <p className="font-bold text-lg">{formatNumber(adsenseStats.estimatedPageViews)}</p>
                      </div>
                      <div className="bg-background rounded-lg p-3 text-center border border-green-500/20 hover:border-green-500/40 transition-colors">
                        <TrendingUp className="h-5 w-5 mx-auto mb-1 text-green-500" />
                        <p className="text-xs text-muted-foreground">Est. CTR</p>
                        <p className="font-bold text-lg">{adsenseStats.estimatedCTR}%</p>
                      </div>
                      <div className="bg-background rounded-lg p-3 text-center border border-yellow-500/20 hover:border-yellow-500/40 transition-colors">
                        <DollarSign className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
                        <p className="text-xs text-muted-foreground">Est. CPC</p>
                        <p className="font-bold text-lg">${adsenseStats.estimatedCPC.toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1.5 rounded-full bg-green-500/20">
                            <DollarSign className="h-4 w-4 text-green-500" />
                          </div>
                          <span className="font-medium">Est. Monthly AdSense</span>
                        </div>
                        <p className="text-2xl font-bold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">
                          {formatCurrency(adsenseStats.estimatedMonthlyEarnings.low)} - {formatCurrency(adsenseStats.estimatedMonthlyEarnings.high)}
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1.5 rounded-full bg-blue-500/20">
                            <DollarSign className="h-4 w-4 text-blue-500" />
                          </div>
                          <span className="font-medium">Est. Yearly AdSense</span>
                        </div>
                        <p className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">
                          {formatCurrency(adsenseStats.estimatedYearlyEarnings.low)} - {formatCurrency(adsenseStats.estimatedYearlyEarnings.high)}
                        </p>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground flex items-center gap-1 bg-muted/50 rounded-lg p-2">
                      <Info className="h-3 w-3" />
                      Estimates based on traffic, niche CPC/CTR averages. Actual earnings vary by ad placement, audience location, and content quality.
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreatorAnalytics;
