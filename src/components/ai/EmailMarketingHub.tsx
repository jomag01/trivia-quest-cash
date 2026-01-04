import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Mail, Send, Users, Sparkles, Clock, BarChart3, 
  Plus, Edit, Trash2, Eye, Loader2, Zap, Calendar,
  TrendingUp, MousePointerClick, MailOpen, Rocket,
  Target, Megaphone, ArrowRight, Star, Wand2
} from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

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

const templatePrompts = [
  { 
    icon: Rocket, 
    title: "Welcome Series", 
    prompt: "Create a warm welcome email for new affiliates, introduce them to the earning opportunities and guide them to share their referral link",
    color: "text-blue-500"
  },
  { 
    icon: TrendingUp, 
    title: "Motivational", 
    prompt: "Write a motivational email encouraging affiliates to keep promoting and share success tips for earning more commissions",
    color: "text-green-500"
  },
  { 
    icon: Star, 
    title: "Success Story", 
    prompt: "Create an email highlighting top earner success stories to inspire other affiliates to take action",
    color: "text-amber-500"
  },
  { 
    icon: Megaphone, 
    title: "New Feature", 
    prompt: "Announce a new app feature and explain how affiliates can use it to increase their earnings",
    color: "text-purple-500"
  },
  { 
    icon: Target, 
    title: "Monthly Challenge", 
    prompt: "Create a monthly challenge email with prizes for top referrers to boost engagement",
    color: "text-red-500"
  }
];

export default function EmailMarketingHub() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('create');
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [automations, setAutomations] = useState<EmailAutomation[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    content: '',
    preview_text: ''
  });
  
  const [automationForm, setAutomationForm] = useState({
    name: '',
    trigger_type: 'signup',
    trigger_delay_hours: 0,
    subject: '',
    content: '',
    is_active: true
  });

  const [aiPrompt, setAiPrompt] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [editorMode, setEditorMode] = useState<'newsletter' | 'automation'>('newsletter');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [newslettersRes, automationsRes] = await Promise.all([
        supabase.from('newsletters').select('*').order('created_at', { ascending: false }).limit(10),
        supabase.from('email_automations').select('*').order('created_at', { ascending: false }).limit(10)
      ]);

      if (newslettersRes.data) setNewsletters(newslettersRes.data);
      if (automationsRes.data) setAutomations(automationsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateWithAI = async (prompt?: string) => {
    const usePrompt = prompt || aiPrompt;
    if (!usePrompt.trim()) {
      toast({ title: 'Please enter a prompt', variant: 'destructive' });
      return;
    }

    setGenerating(true);
    try {
      const response = await supabase.functions.invoke('generate-newsletter-content', {
        body: { prompt: usePrompt, type: editorMode }
      });

      if (response.error) throw response.error;

      const { subject, content, preview_text, title } = response.data;
      
      if (editorMode === 'newsletter') {
        setFormData({
          title: title || formData.title || 'New Campaign',
          subject: subject || formData.subject,
          content: content || formData.content,
          preview_text: preview_text || formData.preview_text
        });
      } else {
        setAutomationForm(prev => ({
          ...prev,
          subject: subject || prev.subject,
          content: content || prev.content
        }));
      }

      toast({ title: 'Content generated! ✨' });
      setAiPrompt('');
    } catch (error: any) {
      console.error('AI generation error:', error);
      toast({ title: 'Generation failed', description: error.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const saveAndSend = async () => {
    if (!formData.title || !formData.subject || !formData.content) {
      toast({ title: 'Please fill all fields', variant: 'destructive' });
      return;
    }

    setSending(true);
    try {
      // Save newsletter
      const { data: newsletter, error } = await supabase
        .from('newsletters')
        .insert({
          ...formData,
          status: 'sending',
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      // Send newsletter
      const response = await supabase.functions.invoke('send-newsletter', {
        body: { newsletter_id: newsletter.id }
      });

      if (response.error) throw response.error;

      toast({ 
        title: 'Newsletter sent! 🚀',
        description: `Delivered to ${response.data.total_sent} subscribers`
      });
      
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Send error:', error);
      toast({ title: 'Failed to send', description: error.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const saveDraft = async () => {
    if (!formData.title) {
      toast({ title: 'Please add a title', variant: 'destructive' });
      return;
    }

    try {
      await supabase.from('newsletters').insert({
        ...formData,
        status: 'draft',
        created_by: user?.id
      });

      toast({ title: 'Draft saved!' });
      resetForm();
      fetchData();
    } catch (error: any) {
      toast({ title: 'Failed to save', variant: 'destructive' });
    }
  };

  const saveAutomation = async () => {
    if (!automationForm.name || !automationForm.subject || !automationForm.content) {
      toast({ title: 'Please fill all fields', variant: 'destructive' });
      return;
    }

    try {
      await supabase.from('email_automations').insert({
        ...automationForm,
        created_by: user?.id
      });

      toast({ title: 'Automation created! ⚡' });
      setAutomationForm({
        name: '',
        trigger_type: 'signup',
        trigger_delay_hours: 0,
        subject: '',
        content: '',
        is_active: true
      });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Failed to save', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setFormData({ title: '', subject: '', content: '', preview_text: '' });
  };

  const toggleAutomation = async (id: string, isActive: boolean) => {
    try {
      await supabase.from('email_automations').update({ is_active: isActive }).eq('id', id);
      fetchData();
      toast({ title: isActive ? 'Automation activated' : 'Automation paused' });
    } catch (error) {
      console.error('Toggle error:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <Card className="bg-gradient-to-br from-primary/20 via-purple-500/10 to-pink-500/10 border-primary/20 overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHN0cm9rZS13aWR0aD0iMiIvPjwvZz48L3N2Zz4=')] opacity-30" />
        <CardContent className="p-6 relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-primary/20">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Email Marketing Hub</h2>
              <p className="text-muted-foreground">Create AI-powered newsletters & automations</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="create" className="gap-2">
            <Wand2 className="h-4 w-4" />
            Create
          </TabsTrigger>
          <TabsTrigger value="automations" className="gap-2">
            <Zap className="h-4 w-4" />
            Automations
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Create Tab */}
        <TabsContent value="create" className="space-y-4">
          {/* Template Prompts */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {templatePrompts.map((template, i) => (
              <motion.div
                key={template.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Button
                  variant="outline"
                  className="w-full h-auto flex-col py-3 px-2 hover:border-primary/50"
                  onClick={() => generateWithAI(template.prompt)}
                  disabled={generating}
                >
                  <template.icon className={`h-5 w-5 mb-1 ${template.color}`} />
                  <span className="text-xs text-center">{template.title}</span>
                </Button>
              </motion.div>
            ))}
          </div>

          {/* AI Prompt Input */}
          <Card className="border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                <span className="font-medium">AI Content Generator</span>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Describe the email you want to create..."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && generateWithAI()}
                />
                <Button onClick={() => generateWithAI()} disabled={generating} className="shrink-0">
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Newsletter Editor */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Newsletter Editor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Campaign Name</Label>
                  <Input
                    placeholder="My Campaign"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Email Subject</Label>
                  <Input
                    placeholder="Your subject line"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Preview Text</Label>
                <Input
                  placeholder="Text shown in inbox preview"
                  value={formData.preview_text}
                  onChange={(e) => setFormData({ ...formData, preview_text: e.target.value })}
                />
              </div>

              <div>
                <Label>Email Content</Label>
                <Textarea
                  placeholder="Write your email content here... Markdown is supported."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="min-h-[200px]"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={saveDraft}>
                  Save Draft
                </Button>
                <Button variant="outline" onClick={() => setShowPreview(true)} disabled={!formData.content}>
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
                <Button onClick={saveAndSend} disabled={sending} className="gap-2">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send to All Subscribers
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Automations Tab */}
        <TabsContent value="automations" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                Create Email Automation
              </CardTitle>
              <CardDescription>Set up automated emails triggered by user actions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* AI for automation */}
              <div className="flex gap-2">
                <Input
                  placeholder="Describe your automation email..."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                />
                <Button 
                  onClick={() => { setEditorMode('automation'); generateWithAI(); }} 
                  disabled={generating}
                  variant="outline"
                  className="shrink-0"
                >
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                </Button>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Automation Name</Label>
                  <Input
                    placeholder="e.g., Welcome Series"
                    value={automationForm.name}
                    onChange={(e) => setAutomationForm({ ...automationForm, name: e.target.value })}
                  />
                </div>
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
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Email Subject</Label>
                  <Input
                    placeholder="Subject line"
                    value={automationForm.subject}
                    onChange={(e) => setAutomationForm({ ...automationForm, subject: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Delay (hours after trigger)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={automationForm.trigger_delay_hours}
                    onChange={(e) => setAutomationForm({ ...automationForm, trigger_delay_hours: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div>
                <Label>Email Content</Label>
                <Textarea
                  placeholder="Your automation email content..."
                  value={automationForm.content}
                  onChange={(e) => setAutomationForm({ ...automationForm, content: e.target.value })}
                  className="min-h-[150px]"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={automationForm.is_active}
                    onCheckedChange={(checked) => setAutomationForm({ ...automationForm, is_active: checked })}
                  />
                  <Label>Activate immediately</Label>
                </div>
                <Button onClick={saveAutomation} className="gap-2">
                  <Zap className="h-4 w-4" />
                  Create Automation
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Active Automations */}
          {automations.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Active Automations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {automations.map((automation) => (
                    <div key={automation.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{automation.name}</span>
                          <Badge variant={automation.is_active ? 'default' : 'secondary'} className="text-xs">
                            {automation.is_active ? 'Active' : 'Paused'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Trigger: {automation.trigger_type} 
                          {automation.trigger_delay_hours > 0 && ` • ${automation.trigger_delay_hours}h delay`}
                        </p>
                      </div>
                      <Switch
                        checked={automation.is_active}
                        onCheckedChange={(checked) => toggleAutomation(automation.id, checked)}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          {newsletters.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Mail className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No campaigns sent yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {newsletters.map((newsletter) => (
                <Card key={newsletter.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{newsletter.title}</span>
                          <Badge variant={newsletter.status === 'sent' ? 'default' : 'secondary'}>
                            {newsletter.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{newsletter.subject}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {newsletter.total_recipients}
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
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(newsletter.created_at), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
          </DialogHeader>
          <div className="border rounded-lg p-6 bg-white text-black">
            <div className="border-b pb-4 mb-4">
              <p className="text-sm text-gray-500">Subject: {formData.subject}</p>
              {formData.preview_text && (
                <p className="text-xs text-gray-400">{formData.preview_text}</p>
              )}
            </div>
            <div className="prose prose-sm max-w-none whitespace-pre-wrap">
              {formData.content}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
