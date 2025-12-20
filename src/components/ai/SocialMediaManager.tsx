import React, { useState, useEffect } from 'react';
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
import { 
  Youtube, 
  Facebook,
  Loader2, 
  Plus,
  Trash2,
  Edit,
  Calendar,
  Image as ImageIcon,
  Video,
  Send,
  Sparkles,
  Lock,
  Crown,
  Users,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  Copy
} from 'lucide-react';

// TikTok icon component
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

interface ClientAccount {
  id: string;
  platform: 'facebook' | 'youtube' | 'tiktok';
  accountName: string;
  accountId: string;
  clientName: string;
  clientEmail: string;
  monthlyFee: number;
  status: 'active' | 'paused' | 'pending';
  createdAt: string;
}

interface ScheduledPost {
  id: string;
  clientAccountId: string;
  content: string;
  mediaType: 'text' | 'image' | 'video';
  mediaUrl?: string;
  scheduledFor: string;
  status: 'scheduled' | 'posted' | 'failed';
  platform: string;
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
  const [creditCost, setCreditCost] = useState(10);
  
  // New client form
  const [showAddClient, setShowAddClient] = useState(false);
  const [newClient, setNewClient] = useState({
    platform: 'facebook' as 'facebook' | 'youtube' | 'tiktok',
    accountName: '',
    accountId: '',
    clientName: '',
    clientEmail: '',
    monthlyFee: 0
  });

  // Content generation
  const [generatePrompt, setGeneratePrompt] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  useEffect(() => {
    fetchCreditCost();
    loadClientsFromStorage();
    loadPostsFromStorage();
  }, []);

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

  const loadClientsFromStorage = () => {
    const stored = localStorage.getItem(`smm_clients_${user?.id}`);
    if (stored) {
      setClients(JSON.parse(stored));
    }
  };

  const loadPostsFromStorage = () => {
    const stored = localStorage.getItem(`smm_posts_${user?.id}`);
    if (stored) {
      setScheduledPosts(JSON.parse(stored));
    }
  };

  const saveClientsToStorage = (clientList: ClientAccount[]) => {
    localStorage.setItem(`smm_clients_${user?.id}`, JSON.stringify(clientList));
  };

  const savePostsToStorage = (postList: ScheduledPost[]) => {
    localStorage.setItem(`smm_posts_${user?.id}`, JSON.stringify(postList));
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

  const handleAddClient = () => {
    if (!newClient.accountName || !newClient.clientName) {
      toast.error('Please fill in all required fields');
      return;
    }

    const client: ClientAccount = {
      id: `client_${Date.now()}`,
      ...newClient,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    const updatedClients = [...clients, client];
    setClients(updatedClients);
    saveClientsToStorage(updatedClients);
    
    setNewClient({
      platform: 'facebook',
      accountName: '',
      accountId: '',
      clientName: '',
      clientEmail: '',
      monthlyFee: 0
    });
    setShowAddClient(false);
    toast.success('Client added successfully!');
  };

  const handleDeleteClient = (clientId: string) => {
    const updatedClients = clients.filter(c => c.id !== clientId);
    setClients(updatedClients);
    saveClientsToStorage(updatedClients);
    toast.success('Client removed');
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
      const platformName = client?.platform || 'social media';

      const { data, error } = await supabase.functions.invoke('ai-generate', {
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
      });

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

  const handleSchedulePost = () => {
    if (!generatedContent || !selectedClient || !scheduleDate || !scheduleTime) {
      toast.error('Please fill in all fields');
      return;
    }

    const client = clients.find(c => c.id === selectedClient);
    const post: ScheduledPost = {
      id: `post_${Date.now()}`,
      clientAccountId: selectedClient,
      content: generatedContent,
      mediaType: 'text',
      scheduledFor: `${scheduleDate}T${scheduleTime}:00`,
      status: 'scheduled',
      platform: client?.platform || 'unknown'
    };

    const updatedPosts = [...scheduledPosts, post];
    setScheduledPosts(updatedPosts);
    savePostsToStorage(updatedPosts);
    
    setGeneratedContent('');
    setGeneratePrompt('');
    setScheduleDate('');
    setScheduleTime('');
    toast.success('Post scheduled successfully!');
  };

  const handleDeletePost = (postId: string) => {
    const updatedPosts = scheduledPosts.filter(p => p.id !== postId);
    setScheduledPosts(updatedPosts);
    savePostsToStorage(updatedPosts);
    toast.success('Post deleted');
  };

  const copyContent = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Content copied to clipboard!');
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'facebook':
        return <Facebook className="h-4 w-4 text-blue-600" />;
      case 'youtube':
        return <Youtube className="h-4 w-4 text-red-500" />;
      case 'tiktok':
        return <TikTokIcon className="h-4 w-4" />;
      default:
        return null;
    }
  };

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
            Manage social media accounts for clients with AI-powered content generation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-4">
            <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">This feature is available only to users who have purchased AI credits</p>
            <p className="text-sm text-muted-foreground">Purchase AI credits to unlock social media management</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
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
            Manage Facebook, YouTube, and TikTok accounts for clients with AI-powered content
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
                Create Content
              </TabsTrigger>
              <TabsTrigger value="scheduled" className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Scheduled
              </TabsTrigger>
            </TabsList>

            {/* Clients Tab */}
            <TabsContent value="clients" className="mt-4 space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  Manage your client's social media accounts
                </p>
                <Dialog open={showAddClient} onOpenChange={setShowAddClient}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Client
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
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
                          onValueChange={(v: any) => setNewClient({...newClient, platform: v})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="facebook">
                              <div className="flex items-center gap-2">
                                <Facebook className="h-4 w-4 text-blue-600" />
                                Facebook Page
                              </div>
                            </SelectItem>
                            <SelectItem value="youtube">
                              <div className="flex items-center gap-2">
                                <Youtube className="h-4 w-4 text-red-500" />
                                YouTube Channel
                              </div>
                            </SelectItem>
                            <SelectItem value="tiktok">
                              <div className="flex items-center gap-2">
                                <TikTokIcon className="h-4 w-4" />
                                TikTok Account
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Account Name *</Label>
                        <Input
                          placeholder="e.g., My Brand Page"
                          value={newClient.accountName}
                          onChange={(e) => setNewClient({...newClient, accountName: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Account ID/URL</Label>
                        <Input
                          placeholder="e.g., @mybrand or page URL"
                          value={newClient.accountId}
                          onChange={(e) => setNewClient({...newClient, accountId: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Client Name *</Label>
                        <Input
                          placeholder="Client's name"
                          value={newClient.clientName}
                          onChange={(e) => setNewClient({...newClient, clientName: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Client Email</Label>
                        <Input
                          type="email"
                          placeholder="client@email.com"
                          value={newClient.clientEmail}
                          onChange={(e) => setNewClient({...newClient, clientEmail: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Monthly Fee (₱)</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={newClient.monthlyFee || ''}
                          onChange={(e) => setNewClient({...newClient, monthlyFee: parseFloat(e.target.value) || 0})}
                        />
                      </div>
                      <Button onClick={handleAddClient} className="w-full">
                        Add Client
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {clients.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No clients added yet</p>
                  <p className="text-xs">Add your first client to start managing their social media</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {clients.map((client) => (
                    <Card key={client.id} className="bg-muted/30">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {getPlatformIcon(client.platform)}
                            <div>
                              <p className="font-medium">{client.accountName}</p>
                              <p className="text-xs text-muted-foreground">
                                {client.clientName} • {client.accountId || 'No ID'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                              {client.status}
                            </Badge>
                            {client.monthlyFee > 0 && (
                              <Badge variant="outline" className="gap-1">
                                <DollarSign className="h-3 w-3" />
                                ₱{client.monthlyFee}/mo
                              </Badge>
                            )}
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => handleDeleteClient(client.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {clients.length > 0 && (
                <Card className="bg-green-500/10 border-green-500/30">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-green-700">Total Monthly Revenue</p>
                        <p className="text-xs text-muted-foreground">{clients.filter(c => c.status === 'active').length} active clients</p>
                      </div>
                      <p className="text-2xl font-bold text-green-600">
                        ₱{clients.filter(c => c.status === 'active').reduce((sum, c) => sum + c.monthlyFee, 0).toLocaleString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
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
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          <div className="flex items-center gap-2">
                            {getPlatformIcon(client.platform)}
                            {client.accountName} ({client.clientName})
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Content Topic/Idea</Label>
                  <Textarea
                    placeholder="Describe what you want to post about... e.g., 'New product launch announcement for our summer collection'"
                    value={generatePrompt}
                    onChange={(e) => setGeneratePrompt(e.target.value)}
                    rows={3}
                  />
                </div>

                <Button 
                  onClick={handleGenerateContent}
                  disabled={isGenerating || clients.length === 0}
                  className="w-full gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Generate Content ({creditCost} credits)
                    </>
                  )}
                </Button>

                {generatedContent && (
                  <Card className="bg-muted/30">
                    <CardContent className="p-4 space-y-4">
                      <div className="flex justify-between items-start">
                        <Label>Generated Content</Label>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => copyContent(generatedContent)}
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Copy
                        </Button>
                      </div>
                      <div className="p-3 bg-background rounded-lg border">
                        <p className="whitespace-pre-wrap text-sm">{generatedContent}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
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

                      <Button onClick={handleSchedulePost} className="w-full gap-2">
                        <Calendar className="h-4 w-4" />
                        Schedule Post
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* Scheduled Posts Tab */}
            <TabsContent value="scheduled" className="mt-4 space-y-4">
              {scheduledPosts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No scheduled posts yet</p>
                  <p className="text-xs">Create content and schedule it for later</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {scheduledPosts.sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime()).map((post) => {
                      const client = clients.find(c => c.id === post.clientAccountId);
                      const isPast = new Date(post.scheduledFor) < new Date();
                      
                      return (
                        <Card key={post.id} className={`${isPast ? 'opacity-60' : ''}`}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  {getPlatformIcon(post.platform)}
                                  <span className="text-sm font-medium">{client?.accountName || 'Unknown'}</span>
                                  <Badge variant={post.status === 'posted' ? 'default' : post.status === 'failed' ? 'destructive' : 'secondary'}>
                                    {post.status === 'posted' ? <CheckCircle className="h-3 w-3 mr-1" /> : 
                                     post.status === 'failed' ? <AlertCircle className="h-3 w-3 mr-1" /> :
                                     <Clock className="h-3 w-3 mr-1" />}
                                    {post.status}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2">{post.content}</p>
                                <p className="text-xs text-muted-foreground mt-2">
                                  <Calendar className="h-3 w-3 inline mr-1" />
                                  {new Date(post.scheduledFor).toLocaleString()}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => copyContent(post.content)}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => handleDeletePost(post.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Instructions Card */}
      <Card className="bg-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">How to Use</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-2">
          <p><strong>1. Add Clients:</strong> Add your clients' social media accounts (Facebook, YouTube, TikTok)</p>
          <p><strong>2. Generate Content:</strong> Use AI to generate engaging posts for each platform</p>
          <p><strong>3. Schedule Posts:</strong> Schedule when the content should be posted</p>
          <p><strong>4. Post Manually:</strong> Copy the content and post it to the client's account at the scheduled time</p>
          <p className="text-yellow-600">Note: Actual posting requires manual action or API integration with each platform</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SocialMediaManager;