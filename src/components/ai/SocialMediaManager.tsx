import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { rateLimiter } from '@/lib/performance/RateLimiter';
import { 
  Youtube, 
  Facebook,
  Loader2, 
  Plus,
  Trash2,
  Calendar,
  Send,
  Sparkles,
  Lock,
  Crown,
  Users,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  Copy,
  Instagram,
  Twitter,
  Linkedin,
  Music2,
  MessageCircle,
  Globe,
  Zap,
  TrendingUp,
  RefreshCw
} from 'lucide-react';

// Platform icons
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const PinterestIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/>
  </svg>
);

const SnapchatIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 4.791 4.014.255.044.435.27.42.509 0 .075-.015.149-.045.225-.24.569-1.273.988-3.146 1.271-.059.091-.12.375-.164.57-.029.179-.074.36-.134.553-.076.271-.27.405-.555.405h-.03c-.135 0-.313-.031-.538-.076-.495-.089-1.17-.209-1.973-.209-.359 0-.705.029-1.019.09-.96.209-1.949.899-3.179 1.799-1.393.899-2.835 1.799-4.326 1.799h-.076c-1.506 0-2.948-.899-4.341-1.799-1.229-.899-2.22-1.59-3.18-1.799-.314-.061-.659-.09-1.019-.09-.809 0-1.493.12-1.988.209-.24.045-.435.076-.569.076-.285 0-.465-.164-.54-.404-.06-.195-.104-.375-.135-.554-.044-.195-.12-.48-.18-.57-1.872-.283-2.92-.702-3.146-1.271-.029-.075-.044-.15-.044-.225-.015-.24.164-.465.42-.509 3.264-.54 4.73-3.879 4.791-4.02l.015-.015c.181-.344.21-.644.119-.868-.195-.449-.884-.674-1.332-.81-.136-.044-.256-.09-.346-.119-.823-.329-1.227-.719-1.212-1.168 0-.359.285-.689.734-.838.149-.06.329-.09.509-.09.12 0 .3.016.465.104.374.18.735.285 1.034.301.197 0 .33-.045.404-.091-.008-.164-.019-.329-.03-.509l-.002-.06c-.105-1.627-.225-3.654.299-4.846 1.582-3.545 4.938-3.821 5.928-3.821h.088z"/>
  </svg>
);

const ThreadsIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01c-.006-.761-.007-1.527.001-2.289.072-3.594.928-6.471 2.548-8.559C5.89-.896 8.656-2.086 12.251-2.086h.007c2.132 0 3.977.468 5.48 1.388 1.42.873 2.542 2.148 3.334 3.786a15.3 15.3 0 0 1 1.25 4.042 20.588 20.588 0 0 1 .313 3.599c.015 1.21-.059 2.462-.205 3.726-.157 1.348-.43 2.718-.822 4.077-.18.622-.36 1.152-.541 1.6l-.128.308c-.4.926-.862 1.55-1.405 1.906-.478.313-1.044.472-1.682.472-.575 0-1.102-.145-1.568-.432-.413-.255-.752-.625-1.01-1.1-.196-.362-.33-.773-.4-1.22-.097-.61-.117-1.268-.059-1.958.102-1.203.41-2.518.925-3.926.395-1.079.872-2.18 1.42-3.28a40.66 40.66 0 0 1 1.69-3.134 35.58 35.58 0 0 1 1.695-2.672 28.04 28.04 0 0 1 1.474-1.963c.395-.476.79-.889 1.175-1.237-.011-.03-.022-.06-.034-.089-.384-.94-.89-1.713-1.506-2.296-1.13-1.07-2.656-1.614-4.536-1.614h-.007c-2.896 0-5.098.987-6.548 2.937-1.358 1.822-2.054 4.406-2.069 7.678-.008.724-.007 1.441.001 2.152.024 3.177.756 5.664 2.177 7.392 1.358 1.649 3.466 2.485 6.267 2.485h.007c1.73 0 3.235-.313 4.477-.93 1.158-.577 2.087-1.39 2.765-2.423.613-.934 1.055-2.025 1.312-3.24.223-1.06.32-2.205.288-3.405-.048-1.787-.357-3.467-.917-4.993-.478-1.304-1.117-2.385-1.9-3.213-1.483-1.573-3.454-2.371-5.86-2.371h-.007c-2.27 0-4.173.789-5.661 2.348-1.393 1.457-2.25 3.5-2.546 6.079-.052.445-.08.922-.085 1.421-.004.499.009.977.038 1.437.128 2.037.61 3.77 1.433 5.147.756 1.263 1.77 2.224 3.014 2.854 1.144.578 2.456.872 3.9.872h.007c.847 0 1.73-.104 2.624-.311.829-.192 1.49-.417 1.967-.67l-.395-1.674c-.324.17-.812.343-1.451.511-.756.199-1.49.3-2.185.3h-.007c-2.11 0-3.762-.67-4.91-1.993-.992-1.144-1.575-2.72-1.732-4.682-.033-.412-.048-.84-.044-1.277.004-.437.03-.86.078-1.263.236-2.003.868-3.565 1.879-4.64 1.072-1.137 2.533-1.713 4.346-1.713h.007c1.884 0 3.351.597 4.363 1.776.576.67 1.035 1.505 1.365 2.48.372 1.099.568 2.363.581 3.761.013 1.1-.073 2.116-.257 3.02-.216 1.063-.56 1.955-.992 2.65-.474.762-1.116 1.38-1.908 1.835-.887.508-1.96.766-3.19.766h-.007c-2.188 0-3.9-.672-5.091-1.997-.99-1.101-1.572-2.577-1.731-4.393-.015-.174-.026-.35-.034-.527l1.996-.061c.008.14.018.28.03.421.116 1.31.516 2.325 1.19 3.018.75.773 1.87 1.164 3.33 1.164h.007c.934 0 1.736-.188 2.385-.558.58-.332 1.045-.786 1.382-1.352.313-.526.546-1.203.692-2.012.14-.775.203-1.614.189-2.497-.016-1.154-.173-2.17-.467-3.02-.26-.753-.611-1.35-1.045-1.772-.689-.673-1.617-1.013-2.76-1.013h-.007c-1.305 0-2.313.396-3.002 1.177-.648.735-1.033 1.837-1.143 3.276-.026.349-.032.716-.018 1.097.015.381.05.763.106 1.138.186 1.25.568 2.246 1.134 2.957.63.791 1.534 1.193 2.688 1.193h.007c.41 0 .835-.05 1.264-.149.389-.089.716-.201.974-.333l.376 1.64c-.387.19-.84.345-1.347.462-.571.132-1.151.199-1.724.199h-.007c-1.777 0-3.184-.627-4.184-1.864-.872-1.078-1.387-2.535-1.53-4.328-.032-.404-.044-.829-.034-1.267.01-.439.044-.876.101-1.307.207-1.562.625-2.893 1.243-3.956.688-1.181 1.613-2.058 2.75-2.604.992-.477 2.139-.72 3.41-.72h.007c1.647 0 3.024.374 4.097 1.112.943.65 1.686 1.58 2.207 2.764.494 1.124.817 2.475.958 4.017.036.388.056.8.061 1.226z"/>
  </svg>
);

// All supported platforms
const ALL_PLATFORMS = [
  { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'text-blue-600' },
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'text-pink-500' },
  { id: 'youtube', name: 'YouTube', icon: Youtube, color: 'text-red-500' },
  { id: 'tiktok', name: 'TikTok', icon: TikTokIcon, color: 'text-foreground' },
  { id: 'twitter', name: 'X (Twitter)', icon: Twitter, color: 'text-foreground' },
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: 'text-blue-700' },
  { id: 'pinterest', name: 'Pinterest', icon: PinterestIcon, color: 'text-red-600' },
  { id: 'snapchat', name: 'Snapchat', icon: SnapchatIcon, color: 'text-yellow-400' },
  { id: 'threads', name: 'Threads', icon: ThreadsIcon, color: 'text-foreground' },
  { id: 'whatsapp', name: 'WhatsApp Business', icon: MessageCircle, color: 'text-green-500' },
  { id: 'telegram', name: 'Telegram', icon: Send, color: 'text-blue-500' },
  { id: 'discord', name: 'Discord', icon: MessageCircle, color: 'text-indigo-500' },
  { id: 'twitch', name: 'Twitch', icon: Music2, color: 'text-purple-500' },
  { id: 'reddit', name: 'Reddit', icon: Globe, color: 'text-orange-500' },
  { id: 'tumblr', name: 'Tumblr', icon: Globe, color: 'text-blue-400' }
];

interface ClientAccount {
  id: string;
  user_id: string;
  platform: string;
  account_name: string;
  account_id: string | null;
  client_name: string;
  client_email: string | null;
  monthly_fee: number;
  status: string;
  metadata: any;
  created_at: string;
  updated_at: string;
}

interface ScheduledPost {
  id: string;
  user_id: string;
  client_account_id: string;
  content: string;
  media_type: string;
  media_urls: string[];
  scheduled_for: string;
  status: string;
  platform: string;
  post_result: any;
  error_message: string | null;
  retry_count: number;
  created_at: string;
}

interface SocialMediaManagerProps {
  userCredits: number;
  onCreditsChange: () => void;
}

const SocialMediaManager: React.FC<SocialMediaManagerProps> = ({ userCredits, onCreditsChange }) => {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState('clients');
  const [clients, setClients] = useState<ClientAccount[]>([]);
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingClients, setLoadingClients] = useState(true);
  const [creditCost, setCreditCost] = useState(10);
  
  // Pagination for scalability
  const [clientPage, setClientPage] = useState(0);
  const [postPage, setPostPage] = useState(0);
  const [hasMoreClients, setHasMoreClients] = useState(true);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const PAGE_SIZE = 20;
  
  // New client form
  const [showAddClient, setShowAddClient] = useState(false);
  const [newClient, setNewClient] = useState({
    platform: 'facebook',
    account_name: '',
    account_id: '',
    client_name: '',
    client_email: '',
    monthly_fee: 0
  });

  // Content generation
  const [generatePrompt, setGeneratePrompt] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('smm_realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'smm_scheduled_posts',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setScheduledPosts(prev => [payload.new as ScheduledPost, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setScheduledPosts(prev => prev.map(p => p.id === payload.new.id ? payload.new as ScheduledPost : p));
        } else if (payload.eventType === 'DELETE') {
          setScheduledPosts(prev => prev.filter(p => p.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchCreditCost();
      loadClients();
      loadPosts();
    }
  }, [user]);

  const fetchCreditCost = async () => {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'ai_social_media_credit_cost')
        .maybeSingle();
      
      if (data?.value) {
        setCreditCost(parseInt(data.value));
      }
    } catch (error) {
      console.error('Error fetching credit cost:', error);
    }
  };

  const loadClients = useCallback(async (page = 0, append = false) => {
    if (!user) return;
    
    setLoadingClients(true);
    try {
      const { data, error } = await supabase
        .from('smm_client_accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (error) throw error;
      
      if (data) {
        if (append) {
          setClients(prev => [...prev, ...data as ClientAccount[]]);
        } else {
          setClients(data as ClientAccount[]);
        }
        setHasMoreClients(data.length === PAGE_SIZE);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
      toast.error('Failed to load clients');
    } finally {
      setLoadingClients(false);
    }
  }, [user]);

  const loadPosts = useCallback(async (page = 0, append = false) => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('smm_scheduled_posts')
        .select('*')
        .eq('user_id', user.id)
        .order('scheduled_for', { ascending: true })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (error) throw error;
      
      if (data) {
        if (append) {
          setScheduledPosts(prev => [...prev, ...data as ScheduledPost[]]);
        } else {
          setScheduledPosts(data as ScheduledPost[]);
        }
        setHasMorePosts(data.length === PAGE_SIZE);
      }
    } catch (error) {
      console.error('Error loading posts:', error);
    }
  }, [user]);

  const loadMoreClients = () => {
    const nextPage = clientPage + 1;
    setClientPage(nextPage);
    loadClients(nextPage, true);
  };

  const loadMorePosts = () => {
    const nextPage = postPage + 1;
    setPostPage(nextPage);
    loadPosts(nextPage, true);
  };

  const deductCredits = async (amount: number): Promise<boolean> => {
    if (!user) return false;
    if (userCredits < amount) {
      toast.error(`Insufficient credits. You need ${amount} credits.`);
      return false;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ credits: userCredits - amount })
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

  const hasAICredits = userCredits > 0 || (profile as any)?.total_credits > 0;

  const handleAddClient = async () => {
    if (!user || !newClient.account_name || !newClient.client_name) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('smm_client_accounts')
        .insert({
          user_id: user.id,
          platform: newClient.platform,
          account_name: newClient.account_name,
          account_id: newClient.account_id || null,
          client_name: newClient.client_name,
          client_email: newClient.client_email || null,
          monthly_fee: newClient.monthly_fee,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      setClients(prev => [data, ...prev]);
      setNewClient({
        platform: 'facebook',
        account_name: '',
        account_id: '',
        client_name: '',
        client_email: '',
        monthly_fee: 0
      });
      setShowAddClient(false);
      toast.success('Client added successfully!');
    } catch (error: any) {
      console.error('Error adding client:', error);
      toast.error('Failed to add client');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    try {
      const { error } = await supabase
        .from('smm_client_accounts')
        .delete()
        .eq('id', clientId);

      if (error) throw error;
      
      setClients(prev => prev.filter(c => c.id !== clientId));
      toast.success('Client removed');
    } catch (error) {
      console.error('Error deleting client:', error);
      toast.error('Failed to delete client');
    }
  };

  const handleGenerateContent = async () => {
    if (!generatePrompt.trim()) {
      toast.error('Please enter a content idea or topic');
      return;
    }

    if (!selectedClient) {
      toast.error('Please select a client account');
      return;
    }

    // Rate limit check
    if (!rateLimiter.canMakeRequest('ai')) {
      const resetTime = Math.ceil(rateLimiter.getResetTime('ai') / 1000);
      toast.error(`Rate limited. Please wait ${resetTime} seconds.`);
      return;
    }

    if (userCredits < creditCost) {
      toast.error(`You need ${creditCost} credits to generate content`);
      return;
    }

    const deducted = await deductCredits(creditCost);
    if (!deducted) return;

    setIsGenerating(true);
    setGeneratedContent('');

    try {
      const client = clients.find(c => c.id === selectedClient);
      const platform = ALL_PLATFORMS.find(p => p.id === client?.platform);
      const platformName = platform?.name || 'social media';

      const { data, error } = await rateLimiter.execute('ai', () =>
        supabase.functions.invoke('ai-generate', {
          body: {
            type: 'text',
            prompt: `You are a professional social media manager. Create an engaging ${platformName} post based on this topic/idea: "${generatePrompt}"
            
Requirements:
- Make it engaging and suitable for ${platformName}
- Include relevant hashtags
- Keep it concise but impactful
- Add a call-to-action if appropriate
- Consider ${platformName}'s best practices and character limits

Generate only the post content, nothing else.`
          }
        })
      );

      if (error) throw error;

      if (data?.text) {
        setGeneratedContent(data.text);
        toast.success('Content generated!');
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error('Failed to generate content');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSchedulePost = async () => {
    if (!user || !generatedContent || !selectedClient || !scheduleDate || !scheduleTime) {
      toast.error('Please fill in all fields');
      return;
    }

    const client = clients.find(c => c.id === selectedClient);
    if (!client) {
      toast.error('Invalid client selected');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('smm_scheduled_posts')
        .insert({
          user_id: user.id,
          client_account_id: selectedClient,
          content: generatedContent,
          media_type: 'text',
          media_urls: [],
          scheduled_for: `${scheduleDate}T${scheduleTime}:00`,
          status: 'scheduled',
          platform: client.platform
        });

      if (error) throw error;
      
      setGeneratedContent('');
      setGeneratePrompt('');
      setScheduleDate('');
      setScheduleTime('');
      toast.success('Post scheduled successfully!');
    } catch (error: any) {
      console.error('Error scheduling post:', error);
      toast.error('Failed to schedule post');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('smm_scheduled_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;
      
      setScheduledPosts(prev => prev.filter(p => p.id !== postId));
      toast.success('Post deleted');
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    }
  };

  const copyContent = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Content copied to clipboard!');
  };

  const getPlatformInfo = useCallback((platformId: string) => {
    return ALL_PLATFORMS.find(p => p.id === platformId) || ALL_PLATFORMS[0];
  }, []);

  const getPlatformIcon = useCallback((platformId: string) => {
    const platform = getPlatformInfo(platformId);
    const IconComponent = platform.icon;
    return <IconComponent className={`h-4 w-4 ${platform.color}`} />;
  }, [getPlatformInfo]);

  // Memoized stats
  const stats = useMemo(() => ({
    totalClients: clients.length,
    activeClients: clients.filter(c => c.status === 'active').length,
    scheduledPosts: scheduledPosts.filter(p => p.status === 'scheduled').length,
    postedPosts: scheduledPosts.filter(p => p.status === 'posted').length,
    monthlyRevenue: clients.reduce((sum, c) => sum + (c.monthly_fee || 0), 0)
  }), [clients, scheduledPosts]);

  if (!hasAICredits) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-primary" />
            AI Social Media Manager
            <Badge variant="secondary" className="ml-2 gap-1">
              <Crown className="h-3 w-3" />
              Premium
            </Badge>
          </CardTitle>
          <CardDescription>
            Manage all social media accounts for clients with AI-powered content generation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-4">
            <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">This feature is available only to users who have purchased AI credits</p>
            <p className="text-sm text-muted-foreground">Purchase AI credits to unlock social media management for 100M+ users</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="bg-muted/30">
          <CardContent className="p-3 text-center">
            <Users className="h-5 w-5 mx-auto text-primary" />
            <p className="text-2xl font-bold">{stats.totalClients}</p>
            <p className="text-xs text-muted-foreground">Total Clients</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-3 text-center">
            <CheckCircle className="h-5 w-5 mx-auto text-green-500" />
            <p className="text-2xl font-bold">{stats.activeClients}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-3 text-center">
            <Clock className="h-5 w-5 mx-auto text-yellow-500" />
            <p className="text-2xl font-bold">{stats.scheduledPosts}</p>
            <p className="text-xs text-muted-foreground">Scheduled</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-3 text-center">
            <TrendingUp className="h-5 w-5 mx-auto text-blue-500" />
            <p className="text-2xl font-bold">{stats.postedPosts}</p>
            <p className="text-xs text-muted-foreground">Posted</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-3 text-center">
            <DollarSign className="h-5 w-5 mx-auto text-green-500" />
            <p className="text-2xl font-bold">₱{stats.monthlyRevenue.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Monthly</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-primary" />
            AI Social Media Manager
            <Badge variant="secondary" className="ml-2 gap-1">
              <Crown className="h-3 w-3" />
              Premium
            </Badge>
            <Badge variant="outline" className="ml-2 gap-1">
              <Zap className="h-3 w-3" />
              100M+ Scale
            </Badge>
          </CardTitle>
          <CardDescription>
            Manage {ALL_PLATFORMS.length}+ social platforms for unlimited clients
          </CardDescription>
          <Badge variant="outline" className="w-fit mt-2">{creditCost} credits per AI-generated post</Badge>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="clients" className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                Clients
              </TabsTrigger>
              <TabsTrigger value="create" className="flex items-center gap-1">
                <Sparkles className="h-4 w-4" />
                Create
              </TabsTrigger>
              <TabsTrigger value="scheduled" className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Queue
              </TabsTrigger>
            </TabsList>

            {/* Clients Tab */}
            <TabsContent value="clients" className="mt-4 space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  {stats.totalClients} clients across {ALL_PLATFORMS.length} platforms
                </p>
                <Dialog open={showAddClient} onOpenChange={setShowAddClient}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Client
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Add New Client</DialogTitle>
                      <DialogDescription>
                        Add a client's social media account to manage
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Platform</Label>
                        <Select
                          value={newClient.platform}
                          onValueChange={(v) => setNewClient({...newClient, platform: v})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ALL_PLATFORMS.map(platform => (
                              <SelectItem key={platform.id} value={platform.id}>
                                <div className="flex items-center gap-2">
                                  <platform.icon className={`h-4 w-4 ${platform.color}`} />
                                  {platform.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Account Name *</Label>
                        <Input
                          placeholder="e.g., My Brand Page"
                          value={newClient.account_name}
                          onChange={(e) => setNewClient({...newClient, account_name: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Account ID/URL</Label>
                        <Input
                          placeholder="e.g., @mybrand or page URL"
                          value={newClient.account_id}
                          onChange={(e) => setNewClient({...newClient, account_id: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Client Name *</Label>
                        <Input
                          placeholder="Client's name"
                          value={newClient.client_name}
                          onChange={(e) => setNewClient({...newClient, client_name: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Client Email</Label>
                        <Input
                          type="email"
                          placeholder="client@email.com"
                          value={newClient.client_email}
                          onChange={(e) => setNewClient({...newClient, client_email: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Monthly Fee (₱)</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={newClient.monthly_fee || ''}
                          onChange={(e) => setNewClient({...newClient, monthly_fee: parseFloat(e.target.value) || 0})}
                        />
                      </div>
                      <Button onClick={handleAddClient} className="w-full" disabled={loading}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Add Client
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {loadingClients ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mt-2">Loading clients...</p>
                </div>
              ) : clients.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No clients added yet</p>
                  <p className="text-xs">Add your first client to start managing their social media</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="grid gap-3 pr-4">
                    {clients.map((client) => (
                      <Card key={client.id} className="bg-muted/30">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {getPlatformIcon(client.platform)}
                              <div>
                                <p className="font-medium">{client.account_name}</p>
                                <p className="text-xs text-muted-foreground">{client.client_name}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                                {client.status}
                              </Badge>
                              {client.monthly_fee > 0 && (
                                <Badge variant="outline" className="gap-1">
                                  <DollarSign className="h-3 w-3" />
                                  ₱{client.monthly_fee}/mo
                                </Badge>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteClient(client.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  {hasMoreClients && (
                    <Button 
                      variant="outline" 
                      className="w-full mt-4" 
                      onClick={loadMoreClients}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Load More Clients
                    </Button>
                  )}
                </ScrollArea>
              )}
            </TabsContent>

            {/* Create Content Tab */}
            <TabsContent value="create" className="mt-4 space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Client Account</Label>
                  <Select value={selectedClient} onValueChange={setSelectedClient}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a client account" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          <div className="flex items-center gap-2">
                            {getPlatformIcon(client.platform)}
                            {client.account_name} - {client.client_name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Content Topic/Idea</Label>
                  <Textarea
                    placeholder="Describe what you want to post about..."
                    value={generatePrompt}
                    onChange={(e) => setGeneratePrompt(e.target.value)}
                    rows={3}
                  />
                </div>

                <Button 
                  onClick={handleGenerateContent} 
                  disabled={isGenerating || !selectedClient || !generatePrompt}
                  className="w-full gap-2"
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Generate Content ({creditCost} credits)
                </Button>

                {generatedContent && (
                  <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                    <div className="flex items-center justify-between">
                      <Label>Generated Content</Label>
                      <Button variant="ghost" size="sm" onClick={() => copyContent(generatedContent)}>
                        <Copy className="h-4 w-4 mr-1" />
                        Copy
                      </Button>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{generatedContent}</p>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Schedule Date</Label>
                        <Input
                          type="date"
                          value={scheduleDate}
                          onChange={(e) => setScheduleDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Schedule Time</Label>
                        <Input
                          type="time"
                          value={scheduleTime}
                          onChange={(e) => setScheduleTime(e.target.value)}
                        />
                      </div>
                    </div>

                    <Button 
                      onClick={handleSchedulePost} 
                      className="w-full gap-2"
                      disabled={loading || !scheduleDate || !scheduleTime}
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
                      Schedule Post
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Scheduled Posts Tab */}
            <TabsContent value="scheduled" className="mt-4 space-y-4">
              {scheduledPosts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No scheduled posts</p>
                  <p className="text-xs">Generate content and schedule it to see it here</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3 pr-4">
                    {scheduledPosts.map((post) => {
                      const client = clients.find(c => c.id === post.client_account_id);
                      return (
                        <Card key={post.id} className="bg-muted/30">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  {getPlatformIcon(post.platform)}
                                  <span className="text-sm font-medium">{client?.account_name || 'Unknown'}</span>
                                  <Badge variant={
                                    post.status === 'posted' ? 'default' :
                                    post.status === 'failed' ? 'destructive' : 'secondary'
                                  }>
                                    {post.status === 'scheduled' && <Clock className="h-3 w-3 mr-1" />}
                                    {post.status === 'posted' && <CheckCircle className="h-3 w-3 mr-1" />}
                                    {post.status === 'failed' && <AlertCircle className="h-3 w-3 mr-1" />}
                                    {post.status}
                                  </Badge>
                                </div>
                                <p className="text-sm line-clamp-2">{post.content}</p>
                                <p className="text-xs text-muted-foreground mt-2">
                                  {new Date(post.scheduled_for).toLocaleString()}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => copyContent(post.content)}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeletePost(post.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                  {hasMorePosts && (
                    <Button 
                      variant="outline" 
                      className="w-full mt-4" 
                      onClick={loadMorePosts}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Load More Posts
                    </Button>
                  )}
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Supported Platforms */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Supported Platforms ({ALL_PLATFORMS.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {ALL_PLATFORMS.map(platform => (
              <Badge key={platform.id} variant="outline" className="gap-1">
                <platform.icon className={`h-3 w-3 ${platform.color}`} />
                {platform.name}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SocialMediaManager;
