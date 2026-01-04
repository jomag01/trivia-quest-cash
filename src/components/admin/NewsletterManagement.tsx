import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Mail, Send, Users, Sparkles, Clock, BarChart3, 
  Plus, Edit, Trash2, Eye, Loader2, Zap, Calendar,
  TrendingUp, MousePointerClick, MailOpen, RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';

interface Newsletter {
  id: string;
  title: string;
  subject: string;
  content: string;
  preview_text: string | null;
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  total_recipients: number;
  total_opens: number;
  total_clicks: number;
  created_at: string;
}

interface EmailAutomation {
  id: string;
  name: string;
  trigger_type: string;
  trigger_delay_hours: number;
  subject: string;
  content: string;
  is_active: boolean;
  created_at: string;
}

interface Subscriber {
  id: string;
  email: string;
  full_name: string | null;
  is_subscribed: boolean;
  subscribed_at: string;
  source: string;
}

export default function NewsletterManagement() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('newsletters');
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [automations, setAutomations] = useState<EmailAutomation[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);
  
  // Newsletter form state
  const [showEditor, setShowEditor] = useState(false);
  const [editingNewsletter, setEditingNewsletter] = useState<Newsletter | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    content: '',
    preview_text: ''
  });
  
  // Automation form state
  const [showAutomationEditor, setShowAutomationEditor] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<EmailAutomation | null>(null);
  const [automationForm, setAutomationForm] = useState({
    name: '',
    trigger_type: 'signup',
    trigger_delay_hours: 0,
    subject: '',
    content: '',
    is_active: true
  });

  // AI prompt for generating content
  const [aiPrompt, setAiPrompt] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [newslettersRes, automationsRes, subscribersRes] = await Promise.all([
        supabase.from('newsletters').select('*').order('created_at', { ascending: false }),
        supabase.from('email_automations').select('*').order('created_at', { ascending: false }),
        supabase.from('newsletter_subscribers').select('*').order('subscribed_at', { ascending: false })
      ]);

      if (newslettersRes.data) setNewsletters(newslettersRes.data);
      if (automationsRes.data) setAutomations(automationsRes.data);
      if (subscribersRes.data) setSubscribers(subscribersRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateWithAI = async (type: 'newsletter' | 'automation') => {
    if (!aiPrompt.trim()) {
      toast({ title: 'Please enter a prompt', variant: 'destructive' });
      return;
    }

    setGenerating(true);
    try {
      const response = await supabase.functions.invoke('generate-newsletter-content', {
        body: { prompt: aiPrompt, type }
      });

      if (response.error) throw response.error;

      const { subject, content, preview_text } = response.data;
      
      if (type === 'newsletter') {
        setFormData(prev => ({
          ...prev,
          subject: subject || prev.subject,
          content: content || prev.content,
          preview_text: preview_text || prev.preview_text
        }));
      } else {
        setAutomationForm(prev => ({
          ...prev,
          subject: subject || prev.subject,
          content: content || prev.content
        }));
      }

      toast({ title: 'Content generated successfully! ✨' });
      setAiPrompt('');
    } catch (error: any) {
      console.error('AI generation error:', error);
      toast({ title: 'Failed to generate content', description: error.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const saveNewsletter = async (sendNow = false) => {
    if (!formData.title || !formData.subject || !formData.content) {
      toast({ title: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const newsletterData = {
        ...formData,
        status: sendNow ? 'sending' : 'draft',
        created_by: user?.id
      };

      let result;
      if (editingNewsletter) {
        result = await supabase
          .from('newsletters')
          .update(newsletterData)
          .eq('id', editingNewsletter.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from('newsletters')
          .insert(newsletterData)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      if (sendNow && result.data) {
        await sendNewsletter(result.data.id);
      }

      toast({ title: sendNow ? 'Newsletter sent! 🚀' : 'Newsletter saved!' });
      setShowEditor(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Save error:', error);
      toast({ title: 'Failed to save newsletter', description: error.message, variant: 'destructive' });
    }
  };

  const sendNewsletter = async (newsletterId: string) => {
    setSending(true);
    try {
      const response = await supabase.functions.invoke('send-newsletter', {
        body: { newsletter_id: newsletterId }
      });

      if (response.error) throw response.error;

      toast({ 
        title: 'Newsletter sent successfully! 📧',
        description: `Sent to ${response.data.total_sent} subscribers`
      });
      fetchData();
    } catch (error: any) {
      console.error('Send error:', error);
      toast({ title: 'Failed to send newsletter', description: error.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const saveAutomation = async () => {
    if (!automationForm.name || !automationForm.subject || !automationForm.content) {
      toast({ title: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const automationData = {
        ...automationForm,
        created_by: user?.id
      };

      if (editingAutomation) {
        await supabase
          .from('email_automations')
          .update(automationData)
          .eq('id', editingAutomation.id);
      } else {
        await supabase.from('email_automations').insert(automationData);
      }

      toast({ title: 'Automation saved!' });
      setShowAutomationEditor(false);
      resetAutomationForm();
      fetchData();
    } catch (error: any) {
      console.error('Save error:', error);
      toast({ title: 'Failed to save automation', variant: 'destructive' });
    }
  };

  const toggleAutomation = async (id: string, isActive: boolean) => {
    try {
      await supabase
        .from('email_automations')
        .update({ is_active: isActive })
        .eq('id', id);
      
      fetchData();
      toast({ title: isActive ? 'Automation activated' : 'Automation paused' });
    } catch (error) {
      console.error('Toggle error:', error);
    }
  };

  const deleteNewsletter = async (id: string) => {
    try {
      await supabase.from('newsletters').delete().eq('id', id);
      fetchData();
      toast({ title: 'Newsletter deleted' });
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const deleteAutomation = async (id: string) => {
    try {
      await supabase.from('email_automations').delete().eq('id', id);
      fetchData();
      toast({ title: 'Automation deleted' });
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const resetForm = () => {
    setFormData({ title: '', subject: '', content: '', preview_text: '' });
    setEditingNewsletter(null);
  };

  const resetAutomationForm = () => {
    setAutomationForm({
      name: '',
      trigger_type: 'signup',
      trigger_delay_hours: 0,
      subject: '',
      content: '',
      is_active: true
    });
    setEditingAutomation(null);
  };

  const editNewsletter = (newsletter: Newsletter) => {
    setEditingNewsletter(newsletter);
    setFormData({
      title: newsletter.title,
      subject: newsletter.subject,
      content: newsletter.content,
      preview_text: newsletter.preview_text || ''
    });
    setShowEditor(true);
  };

  const editAutomation = (automation: EmailAutomation) => {
    setEditingAutomation(automation);
    setAutomationForm({
      name: automation.name,
      trigger_type: automation.trigger_type,
      trigger_delay_hours: automation.trigger_delay_hours,
      subject: automation.subject,
      content: automation.content,
      is_active: automation.is_active
    });
    setShowAutomationEditor(true);
  };

  const syncAllUsersAsSubscribers = async () => {
    try {
      const response = await supabase.functions.invoke('sync-newsletter-subscribers');
      if (response.error) throw response.error;
      
      toast({ 
        title: 'Subscribers synced! 🔄',
        description: `${response.data.synced} users added as subscribers`
      });
      fetchData();
    } catch (error: any) {
      console.error('Sync error:', error);
      toast({ title: 'Failed to sync', description: error.message, variant: 'destructive' });
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-muted text-muted-foreground',
      scheduled: 'bg-amber-500/20 text-amber-600',
      sending: 'bg-blue-500/20 text-blue-600',
      sent: 'bg-green-500/20 text-green-600'
    };
    return <Badge className={colors[status] || colors.draft}>{status}</Badge>;
  };

  const activeSubscribers = subscribers.filter(s => s.is_subscribed).length;
  const totalSent = newsletters.filter(n => n.status === 'sent').length;
  const totalOpens = newsletters.reduce((acc, n) => acc + (n.total_opens || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/20">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeSubscribers}</p>
                <p className="text-xs text-muted-foreground">Subscribers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-500/20">
                <Send className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalSent}</p>
                <p className="text-xs text-muted-foreground">Campaigns Sent</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-500/20">
                <MailOpen className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalOpens}</p>
                <p className="text-xs text-muted-foreground">Total Opens</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-500/20">
                <Zap className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{automations.filter(a => a.is_active).length}</p>
                <p className="text-xs text-muted-foreground">Active Automations</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="newsletters" className="gap-2">
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">Newsletters</span>
          </TabsTrigger>
          <TabsTrigger value="automations" className="gap-2">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Automations</span>
          </TabsTrigger>
          <TabsTrigger value="subscribers" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Subscribers</span>
          </TabsTrigger>
        </TabsList>

        {/* Newsletters Tab */}
        <TabsContent value="newsletters" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Email Campaigns</h3>
            <Button onClick={() => { resetForm(); setShowEditor(true); }} className="gap-2">
              <Plus className="h-4 w-4" />
              New Campaign
            </Button>
          </div>

          {newsletters.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Mail className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No newsletters yet</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => { resetForm(); setShowEditor(true); }}
                >
                  Create your first campaign
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {newsletters.map((newsletter) => (
                <Card key={newsletter.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold truncate">{newsletter.title}</h4>
                          {getStatusBadge(newsletter.status)}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{newsletter.subject}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {newsletter.total_recipients} recipients
                          </span>
                          <span className="flex items-center gap-1">
                            <MailOpen className="h-3 w-3" />
                            {newsletter.total_opens} opens
                          </span>
                          <span className="flex items-center gap-1">
                            <MousePointerClick className="h-3 w-3" />
                            {newsletter.total_clicks} clicks
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {newsletter.status === 'draft' && (
                          <Button 
                            size="sm" 
                            onClick={() => sendNewsletter(newsletter.id)}
                            disabled={sending}
                            className="gap-1"
                          >
                            {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                            Send Now
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => editNewsletter(newsletter)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => deleteNewsletter(newsletter.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Automations Tab */}
        <TabsContent value="automations" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Email Automations</h3>
            <Button onClick={() => { resetAutomationForm(); setShowAutomationEditor(true); }} className="gap-2">
              <Plus className="h-4 w-4" />
              New Automation
            </Button>
          </div>

          {automations.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Zap className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No automations set up</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => { resetAutomationForm(); setShowAutomationEditor(true); }}
                >
                  Create your first automation
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {automations.map((automation) => (
                <Card key={automation.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold truncate">{automation.name}</h4>
                          <Badge variant={automation.is_active ? 'default' : 'secondary'}>
                            {automation.is_active ? 'Active' : 'Paused'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{automation.subject}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="capitalize">Trigger: {automation.trigger_type}</span>
                          {automation.trigger_delay_hours > 0 && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {automation.trigger_delay_hours}h delay
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={automation.is_active}
                          onCheckedChange={(checked) => toggleAutomation(automation.id, checked)}
                        />
                        <Button size="sm" variant="outline" onClick={() => editAutomation(automation)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => deleteAutomation(automation.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Subscribers Tab */}
        <TabsContent value="subscribers" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Subscriber List</h3>
            <Button onClick={syncAllUsersAsSubscribers} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Sync App Users
            </Button>
          </div>

          {subscribers.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No subscribers yet</p>
                <Button variant="outline" className="mt-4" onClick={syncAllUsersAsSubscribers}>
                  Import app users as subscribers
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <ScrollArea className="h-[400px]">
                <div className="divide-y">
                  {subscribers.map((subscriber) => (
                    <div key={subscriber.id} className="flex items-center justify-between p-4">
                      <div>
                        <p className="font-medium">{subscriber.email}</p>
                        {subscriber.full_name && (
                          <p className="text-sm text-muted-foreground">{subscriber.full_name}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(subscriber.subscribed_at), 'MMM d, yyyy')} • {subscriber.source}
                        </p>
                      </div>
                      <Badge variant={subscriber.is_subscribed ? 'default' : 'secondary'}>
                        {subscriber.is_subscribed ? 'Subscribed' : 'Unsubscribed'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Newsletter Editor Dialog */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {editingNewsletter ? 'Edit Newsletter' : 'Create Newsletter'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* AI Content Generator */}
            <Card className="bg-gradient-to-r from-primary/10 to-purple-500/10 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <span className="font-medium">AI Content Generator</span>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., Motivate affiliates to share their referral links..."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                  />
                  <Button 
                    onClick={() => generateWithAI('newsletter')} 
                    disabled={generating}
                    className="shrink-0"
                  >
                    {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <div>
                <Label>Campaign Name</Label>
                <Input
                  placeholder="Internal name for this campaign"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div>
                <Label>Email Subject</Label>
                <Input
                  placeholder="Subject line your subscribers will see"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                />
              </div>

              <div>
                <Label>Preview Text</Label>
                <Input
                  placeholder="Preview text shown in inbox"
                  value={formData.preview_text}
                  onChange={(e) => setFormData({ ...formData, preview_text: e.target.value })}
                />
              </div>

              <div>
                <Label>Email Content (Markdown supported)</Label>
                <Textarea
                  placeholder="Write your email content here... You can use markdown formatting."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="min-h-[200px]"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowEditor(false)} className="flex-1">
                Cancel
              </Button>
              <Button variant="outline" onClick={() => saveNewsletter(false)} className="flex-1">
                Save Draft
              </Button>
              <Button onClick={() => saveNewsletter(true)} disabled={sending} className="flex-1 gap-2">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Save & Send
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Automation Editor Dialog */}
      <Dialog open={showAutomationEditor} onOpenChange={setShowAutomationEditor}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              {editingAutomation ? 'Edit Automation' : 'Create Automation'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* AI Content Generator */}
            <Card className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  <span className="font-medium">AI Content Generator</span>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., Welcome new users and show them how to earn..."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                  />
                  <Button 
                    onClick={() => generateWithAI('automation')} 
                    disabled={generating}
                    className="shrink-0"
                  >
                    {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <div>
                <Label>Automation Name</Label>
                <Input
                  placeholder="e.g., Welcome Series"
                  value={automationForm.name}
                  onChange={(e) => setAutomationForm({ ...automationForm, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Trigger</Label>
                  <Select 
                    value={automationForm.trigger_type} 
                    onValueChange={(v) => setAutomationForm({ ...automationForm, trigger_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="signup">New Signup</SelectItem>
                      <SelectItem value="purchase">After Purchase</SelectItem>
                      <SelectItem value="inactivity">User Inactivity</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Delay (hours)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={automationForm.trigger_delay_hours}
                    onChange={(e) => setAutomationForm({ ...automationForm, trigger_delay_hours: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div>
                <Label>Email Subject</Label>
                <Input
                  placeholder="Subject line"
                  value={automationForm.subject}
                  onChange={(e) => setAutomationForm({ ...automationForm, subject: e.target.value })}
                />
              </div>

              <div>
                <Label>Email Content</Label>
                <Textarea
                  placeholder="Write your automation email content..."
                  value={automationForm.content}
                  onChange={(e) => setAutomationForm({ ...automationForm, content: e.target.value })}
                  className="min-h-[200px]"
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={automationForm.is_active}
                  onCheckedChange={(checked) => setAutomationForm({ ...automationForm, is_active: checked })}
                />
                <Label>Activate immediately</Label>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowAutomationEditor(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={saveAutomation} className="flex-1">
                Save Automation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
