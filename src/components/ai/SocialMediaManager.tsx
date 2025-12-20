import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
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
  RefreshCw,
  Shield,
  Eye,
  AlertTriangle,
  Target,
  BarChart3,
  Settings,
  CreditCard,
  FileText
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
    <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-2.289c.072-3.594.928-6.471 2.548-8.559C5.89-.896 8.656-2.086 12.251-2.086h.007c2.132 0 3.977.468 5.48 1.388 1.42.873 2.542 2.148 3.334 3.786a15.3 15.3 0 0 1 1.25 4.042c.157 1.348.43 2.718.822 4.077.18.622.36 1.152.541 1.6l.128.308c.4.926.862 1.55 1.405 1.906.478.313 1.044.472 1.682.472"/>
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

const AD_TYPES = [
  { id: 'feed', name: 'Feed Ad' },
  { id: 'story', name: 'Story Ad' },
  { id: 'carousel', name: 'Carousel Ad' },
  { id: 'video', name: 'Video Ad' },
  { id: 'sponsored', name: 'Sponsored Post' },
  { id: 'reel', name: 'Reel/Short Ad' },
  { id: 'search', name: 'Search Ad' },
  { id: 'display', name: 'Display Ad' }
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
  is_locked?: boolean;
  deletion_protected?: boolean;
  security_level?: string;
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

interface ServicePricing {
  id: string;
  user_id: string;
  service_type: string;
  service_name: string;
  description: string | null;
  base_price: number;
  price_per_post: number;
  price_per_ad: number;
  price_per_month: number;
  currency: string;
  is_active: boolean;
}

interface AdCampaign {
  id: string;
  user_id: string;
  client_account_id: string;
  campaign_name: string;
  platform: string;
  ad_type: string;
  budget: number;
  budget_type: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  target_audience: any;
  ad_content: any;
  performance_metrics: any;
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
  const [servicePricing, setServicePricing] = useState<ServicePricing[]>([]);
  const [adCampaigns, setAdCampaigns] = useState<AdCampaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingClients, setLoadingClients] = useState(true);
  const [creditCost, setCreditCost] = useState(10);
  const [adminCommission, setAdminCommission] = useState(15);
  const [adsCommission, setAdsCommission] = useState(10);
  
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

  // Pricing dialog
  const [showPricingDialog, setShowPricingDialog] = useState(false);
  const [newPricing, setNewPricing] = useState({
    service_name: '',
    description: '',
    base_price: 0,
    price_per_post: 0,
    price_per_ad: 0,
    price_per_month: 0
  });

  // Ads campaign dialog
  const [showAdDialog, setShowAdDialog] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    client_account_id: '',
    campaign_name: '',
    platform: 'facebook',
    ad_type: 'feed',
    budget: 0,
    budget_type: 'daily',
    start_date: '',
    end_date: '',
    target_audience: '',
    ad_content: ''
  });

  // Security audit
  const [showSecurityLog, setShowSecurityLog] = useState(false);
  const [securityLogs, setSecurityLogs] = useState<any[]>([]);

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
      fetchSettings();
      loadClients();
      loadPosts();
      loadServicePricing();
      loadAdCampaigns();
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['ai_social_media_credit_cost', 'ai_smm_commission_percent', 'ai_smm_ads_commission_percent']);
      
      if (data) {
        data.forEach(s => {
          if (s.key === 'ai_social_media_credit_cost') setCreditCost(parseInt(s.value || '10'));
          if (s.key === 'ai_smm_commission_percent') setAdminCommission(parseInt(s.value || '15'));
          if (s.key === 'ai_smm_ads_commission_percent') setAdsCommission(parseInt(s.value || '10'));
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
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

  const loadServicePricing = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('smm_service_pricing')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (data) setServicePricing(data as ServicePricing[]);
    } catch (error) {
      console.error('Error loading pricing:', error);
    }
  };

  const loadAdCampaigns = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('smm_ad_campaigns')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (data) setAdCampaigns(data as AdCampaign[]);
    } catch (error) {
      console.error('Error loading campaigns:', error);
    }
  };

  const loadSecurityLogs = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('smm_security_audit')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (data) setSecurityLogs(data);
    } catch (error) {
      console.error('Error loading security logs:', error);
    }
  };

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
          status: 'active',
          deletion_protected: true,
          security_level: 'standard'
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
      toast.success('Client added successfully with security protection enabled!');
    } catch (error: any) {
      console.error('Error adding client:', error);
      toast.error('Failed to add client');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPricing = async () => {
    if (!user || !newPricing.service_name) {
      toast.error('Please enter a service name');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('smm_service_pricing')
        .insert({
          user_id: user.id,
          service_type: 'social_management',
          service_name: newPricing.service_name,
          description: newPricing.description || null,
          base_price: newPricing.base_price,
          price_per_post: newPricing.price_per_post,
          price_per_ad: newPricing.price_per_ad,
          price_per_month: newPricing.price_per_month,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      setServicePricing(prev => [data, ...prev]);
      setNewPricing({
        service_name: '',
        description: '',
        base_price: 0,
        price_per_post: 0,
        price_per_ad: 0,
        price_per_month: 0
      });
      setShowPricingDialog(false);
      toast.success('Service pricing created!');
    } catch (error) {
      console.error('Error adding pricing:', error);
      toast.error('Failed to create pricing');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdCampaign = async () => {
    if (!user || !newCampaign.campaign_name || !newCampaign.client_account_id) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const client = clients.find(c => c.id === newCampaign.client_account_id);
      
      const { data, error } = await supabase
        .from('smm_ad_campaigns')
        .insert({
          user_id: user.id,
          client_account_id: newCampaign.client_account_id,
          campaign_name: newCampaign.campaign_name,
          platform: client?.platform || newCampaign.platform,
          ad_type: newCampaign.ad_type,
          budget: newCampaign.budget,
          budget_type: newCampaign.budget_type,
          status: 'draft',
          start_date: newCampaign.start_date || null,
          end_date: newCampaign.end_date || null,
          target_audience: { description: newCampaign.target_audience },
          ad_content: { content: newCampaign.ad_content }
        })
        .select()
        .single();

      if (error) throw error;

      setAdCampaigns(prev => [data, ...prev]);
      setNewCampaign({
        client_account_id: '',
        campaign_name: '',
        platform: 'facebook',
        ad_type: 'feed',
        budget: 0,
        budget_type: 'daily',
        start_date: '',
        end_date: '',
        target_audience: '',
        ad_content: ''
      });
      setShowAdDialog(false);
      toast.success('Ad campaign created!');
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.error('Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  const handleChargeClient = async (clientId: string, amount: number, description: string) => {
    if (!user) return;

    try {
      const commissionAmount = (amount * adminCommission) / 100;
      const netAmount = amount - commissionAmount;

      const { error } = await supabase
        .from('smm_service_transactions')
        .insert({
          user_id: user.id,
          client_account_id: clientId,
          amount,
          admin_commission: commissionAmount,
          net_amount: netAmount,
          transaction_type: 'service_fee',
          status: 'pending',
          description
        });

      if (error) throw error;
      toast.success(`Charged ₱${amount}. Admin commission: ₱${commissionAmount.toFixed(2)}, Your earnings: ₱${netAmount.toFixed(2)}`);
    } catch (error) {
      console.error('Error charging client:', error);
      toast.error('Failed to charge client');
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
    monthlyRevenue: clients.reduce((sum, c) => sum + (c.monthly_fee || 0), 0),
    activeCampaigns: adCampaigns.filter(c => c.status === 'active').length
  }), [clients, scheduledPosts, adCampaigns]);

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
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
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
            <Target className="h-5 w-5 mx-auto text-purple-500" />
            <p className="text-2xl font-bold">{stats.activeCampaigns}</p>
            <p className="text-xs text-muted-foreground">Ad Campaigns</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-3 text-center">
            <DollarSign className="h-5 w-5 mx-auto text-green-500" />
            <p className="text-2xl font-bold">₱{stats.monthlyRevenue.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Monthly</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-3 text-center">
            <Shield className="h-5 w-5 mx-auto text-blue-500" />
            <p className="text-2xl font-bold">{adminCommission}%</p>
            <p className="text-xs text-muted-foreground">Platform Fee</p>
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
            <Badge variant="outline" className="ml-2 gap-1 text-green-600">
              <Shield className="h-3 w-3" />
              Secured
            </Badge>
          </CardTitle>
          <CardDescription>
            Manage {ALL_PLATFORMS.length}+ social platforms with ads management & security protection
          </CardDescription>
          <div className="flex gap-2 mt-2 flex-wrap">
            <Badge variant="outline">{creditCost} credits per AI post</Badge>
            <Badge variant="outline" className="text-orange-600">{adminCommission}% service commission</Badge>
            <Badge variant="outline" className="text-purple-600">{adsCommission}% ads commission</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="clients" className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                Clients
              </TabsTrigger>
              <TabsTrigger value="create" className="flex items-center gap-1">
                <Sparkles className="h-4 w-4" />
                Create
              </TabsTrigger>
              <TabsTrigger value="ads" className="flex items-center gap-1">
                <Target className="h-4 w-4" />
                Ads
              </TabsTrigger>
              <TabsTrigger value="pricing" className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                Pricing
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-1">
                <Shield className="h-4 w-4" />
                Security
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
                        Add a client's social media account to manage (Protected by security protocols)
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

                      <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                          <Shield className="h-4 w-4" />
                          <span className="font-medium text-sm">Security Protection Enabled</span>
                        </div>
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                          This account will be protected against ownership changes, unauthorized deletion, and sensitive data access.
                        </p>
                      </div>

                      <Button 
                        onClick={handleAddClient} 
                        disabled={loading}
                        className="w-full"
                      >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Add Client Account
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {loadingClients ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : clients.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No clients yet. Add your first client to get started.</p>
                  ) : (
                    <>
                      {clients.map(client => (
                        <Card key={client.id} className="bg-muted/20">
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {getPlatformIcon(client.platform)}
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium">{client.account_name}</p>
                                    {client.deletion_protected && (
                                      <Shield className="h-3 w-3 text-green-500" />
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground">{client.client_name}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                                  {client.status}
                                </Badge>
                                {client.monthly_fee > 0 && (
                                  <Badge variant="outline">₱{client.monthly_fee}/mo</Badge>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleChargeClient(client.id, client.monthly_fee, 'Monthly service fee')}
                                  disabled={!client.monthly_fee}
                                >
                                  <CreditCard className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      {hasMoreClients && (
                        <Button variant="outline" onClick={loadMoreClients} className="w-full">
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Load More
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Create Content Tab */}
            <TabsContent value="create" className="mt-4 space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label>Select Client Account</Label>
                  <Select value={selectedClient} onValueChange={setSelectedClient}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a client account" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.filter(c => c.status === 'active').map(client => (
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
                  <Label>Content Idea / Topic</Label>
                  <Textarea
                    placeholder="Describe what you want to post about..."
                    value={generatePrompt}
                    onChange={(e) => setGeneratePrompt(e.target.value)}
                    rows={3}
                  />
                </div>

                <Button 
                  onClick={handleGenerateContent}
                  disabled={isGenerating || !selectedClient || !generatePrompt.trim()}
                  className="gap-2"
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Generate Content ({creditCost} credits)
                </Button>

                {generatedContent && (
                  <div className="space-y-4 mt-4">
                    <div className="relative">
                      <Label>Generated Content</Label>
                      <Textarea
                        value={generatedContent}
                        onChange={(e) => setGeneratedContent(e.target.value)}
                        rows={5}
                        className="mt-2"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="absolute top-0 right-0"
                        onClick={() => copyContent(generatedContent)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Schedule Date</Label>
                        <Input
                          type="date"
                          value={scheduleDate}
                          onChange={(e) => setScheduleDate(e.target.value)}
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
                      disabled={loading || !scheduleDate || !scheduleTime}
                      className="w-full gap-2"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
                      Schedule Post
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Ads Management Tab */}
            <TabsContent value="ads" className="mt-4 space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  {adCampaigns.length} ad campaigns • {adsCommission}% platform commission
                </p>
                <Dialog open={showAdDialog} onOpenChange={setShowAdDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      New Campaign
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create Ad Campaign</DialogTitle>
                      <DialogDescription>
                        Create a new ad campaign for your client
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Client Account *</Label>
                        <Select
                          value={newCampaign.client_account_id}
                          onValueChange={(v) => setNewCampaign({...newCampaign, client_account_id: v})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select client" />
                          </SelectTrigger>
                          <SelectContent>
                            {clients.filter(c => c.status === 'active').map(client => (
                              <SelectItem key={client.id} value={client.id}>
                                <div className="flex items-center gap-2">
                                  {getPlatformIcon(client.platform)}
                                  {client.account_name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Campaign Name *</Label>
                        <Input
                          placeholder="e.g., Summer Sale 2024"
                          value={newCampaign.campaign_name}
                          onChange={(e) => setNewCampaign({...newCampaign, campaign_name: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Ad Type</Label>
                        <Select
                          value={newCampaign.ad_type}
                          onValueChange={(v) => setNewCampaign({...newCampaign, ad_type: v})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {AD_TYPES.map(type => (
                              <SelectItem key={type.id} value={type.id}>
                                {type.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Budget (₱)</Label>
                          <Input
                            type="number"
                            value={newCampaign.budget || ''}
                            onChange={(e) => setNewCampaign({...newCampaign, budget: parseFloat(e.target.value) || 0})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Budget Type</Label>
                          <Select
                            value={newCampaign.budget_type}
                            onValueChange={(v) => setNewCampaign({...newCampaign, budget_type: v})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="lifetime">Lifetime</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Start Date</Label>
                          <Input
                            type="date"
                            value={newCampaign.start_date}
                            onChange={(e) => setNewCampaign({...newCampaign, start_date: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>End Date</Label>
                          <Input
                            type="date"
                            value={newCampaign.end_date}
                            onChange={(e) => setNewCampaign({...newCampaign, end_date: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Target Audience</Label>
                        <Textarea
                          placeholder="Describe target demographics, interests, etc."
                          value={newCampaign.target_audience}
                          onChange={(e) => setNewCampaign({...newCampaign, target_audience: e.target.value})}
                          rows={2}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Ad Content</Label>
                        <Textarea
                          placeholder="Ad copy, headlines, descriptions..."
                          value={newCampaign.ad_content}
                          onChange={(e) => setNewCampaign({...newCampaign, ad_content: e.target.value})}
                          rows={3}
                        />
                      </div>

                      <div className="bg-purple-50 dark:bg-purple-950 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                        <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                          <Shield className="h-4 w-4" />
                          <span className="font-medium text-sm">Ads Security Notice</span>
                        </div>
                        <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                          You cannot change the ads account ownership or access client's billing information. All ad spend is managed by the account owner.
                        </p>
                      </div>

                      <Button 
                        onClick={handleCreateAdCampaign} 
                        disabled={loading}
                        className="w-full"
                      >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Target className="h-4 w-4 mr-2" />}
                        Create Campaign
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {adCampaigns.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No ad campaigns yet.</p>
                  ) : (
                    adCampaigns.map(campaign => {
                      const client = clients.find(c => c.id === campaign.client_account_id);
                      return (
                        <Card key={campaign.id} className="bg-muted/20">
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {client && getPlatformIcon(client.platform)}
                                <div>
                                  <p className="font-medium">{campaign.campaign_name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {AD_TYPES.find(t => t.id === campaign.ad_type)?.name} • ₱{campaign.budget} {campaign.budget_type}
                                  </p>
                                </div>
                              </div>
                              <Badge variant={
                                campaign.status === 'active' ? 'default' :
                                campaign.status === 'paused' ? 'secondary' : 'outline'
                              }>
                                {campaign.status}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Pricing Tab */}
            <TabsContent value="pricing" className="mt-4 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Set your service pricing • Admin takes {adminCommission}% commission
                  </p>
                </div>
                <Dialog open={showPricingDialog} onOpenChange={setShowPricingDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Pricing
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Service Pricing</DialogTitle>
                      <DialogDescription>
                        Set your pricing for social media management services
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Service Name *</Label>
                        <Input
                          placeholder="e.g., Basic SMM Package"
                          value={newPricing.service_name}
                          onChange={(e) => setNewPricing({...newPricing, service_name: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                          placeholder="What's included in this package..."
                          value={newPricing.description}
                          onChange={(e) => setNewPricing({...newPricing, description: e.target.value})}
                          rows={2}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Base Price (₱)</Label>
                          <Input
                            type="number"
                            value={newPricing.base_price || ''}
                            onChange={(e) => setNewPricing({...newPricing, base_price: parseFloat(e.target.value) || 0})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Per Post (₱)</Label>
                          <Input
                            type="number"
                            value={newPricing.price_per_post || ''}
                            onChange={(e) => setNewPricing({...newPricing, price_per_post: parseFloat(e.target.value) || 0})}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Per Ad Campaign (₱)</Label>
                          <Input
                            type="number"
                            value={newPricing.price_per_ad || ''}
                            onChange={(e) => setNewPricing({...newPricing, price_per_ad: parseFloat(e.target.value) || 0})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Monthly Retainer (₱)</Label>
                          <Input
                            type="number"
                            value={newPricing.price_per_month || ''}
                            onChange={(e) => setNewPricing({...newPricing, price_per_month: parseFloat(e.target.value) || 0})}
                          />
                        </div>
                      </div>

                      <div className="bg-orange-50 dark:bg-orange-950 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
                        <p className="text-xs text-orange-600 dark:text-orange-400">
                          <strong>Commission Notice:</strong> Platform takes {adminCommission}% from service fees and {adsCommission}% from ad management.
                        </p>
                      </div>

                      <Button 
                        onClick={handleAddPricing} 
                        disabled={loading}
                        className="w-full"
                      >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Create Pricing
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {servicePricing.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No pricing set yet. Create your service packages.</p>
                  ) : (
                    servicePricing.map(pricing => (
                      <Card key={pricing.id} className="bg-muted/20">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium">{pricing.service_name}</h4>
                              {pricing.description && (
                                <p className="text-xs text-muted-foreground mt-1">{pricing.description}</p>
                              )}
                              <div className="flex gap-2 mt-2 flex-wrap">
                                {pricing.base_price > 0 && (
                                  <Badge variant="outline">Base: ₱{pricing.base_price}</Badge>
                                )}
                                {pricing.price_per_post > 0 && (
                                  <Badge variant="outline">₱{pricing.price_per_post}/post</Badge>
                                )}
                                {pricing.price_per_ad > 0 && (
                                  <Badge variant="outline">₱{pricing.price_per_ad}/ad</Badge>
                                )}
                                {pricing.price_per_month > 0 && (
                                  <Badge variant="outline">₱{pricing.price_per_month}/mo</Badge>
                                )}
                              </div>
                            </div>
                            <Badge variant={pricing.is_active ? 'default' : 'secondary'}>
                              {pricing.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="mt-4 space-y-4">
              <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="h-5 w-5 text-green-600" />
                    Security Protocols Active
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    <div className="flex items-center gap-3 p-2 bg-background rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="font-medium text-sm">Ownership Protection</p>
                        <p className="text-xs text-muted-foreground">Account ownership cannot be transferred or changed</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-2 bg-background rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="font-medium text-sm">Deletion Protection</p>
                        <p className="text-xs text-muted-foreground">Client accounts cannot be deleted without verification</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-2 bg-background rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="font-medium text-sm">Access Token Encryption</p>
                        <p className="text-xs text-muted-foreground">All sensitive credentials are encrypted at rest</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-2 bg-background rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="font-medium text-sm">Audit Logging</p>
                        <p className="text-xs text-muted-foreground">All sensitive actions are logged for review</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-2 bg-background rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="font-medium text-sm">No Billing Access</p>
                        <p className="text-xs text-muted-foreground">You cannot access client's payment or billing information</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Security Audit Log
                    </CardTitle>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={loadSecurityLogs}
                      className="gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px]">
                    {securityLogs.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">No security events recorded</p>
                    ) : (
                      <div className="space-y-2">
                        {securityLogs.map(log => (
                          <div 
                            key={log.id} 
                            className={`p-2 rounded-lg border ${
                              log.risk_level === 'critical' ? 'border-red-500 bg-red-50 dark:bg-red-950' :
                              log.risk_level === 'high' ? 'border-orange-500 bg-orange-50 dark:bg-orange-950' :
                              'border-muted'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {log.blocked ? (
                                  <AlertTriangle className="h-4 w-4 text-red-500" />
                                ) : (
                                  <Eye className="h-4 w-4 text-muted-foreground" />
                                )}
                                <span className="font-medium text-sm">{log.action_type}</span>
                              </div>
                              <Badge variant={log.blocked ? 'destructive' : 'outline'} className="text-xs">
                                {log.blocked ? 'Blocked' : log.risk_level}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(log.created_at).toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default SocialMediaManager;