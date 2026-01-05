import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Wand2, Image, Video, Mail, Download, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface GuestAITrialPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  generatedImageUrl?: string;
  onEmailSubmitted?: () => void;
  customTitle?: string;
  customDescription?: string;
  customCtaText?: string;
}

const GuestAITrialPopup = ({ 
  open, 
  onOpenChange, 
  generatedImageUrl,
  onEmailSubmitted,
  customTitle = 'Try Our AI Services Free!',
  customDescription = 'Experience the power of AI image & video generation',
  customCtaText = 'Get Download Access'
}: GuestAITrialPopupProps) => {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSubmitted, setEmailSubmitted] = useState(false);

  // Don't show for logged-in users
  if (user) return null;

  const handleSubmitEmail = async () => {
    if (!email.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    try {
      // Check if email already exists
      const { data: existing } = await supabase
        .from('newsletter_subscribers')
        .select('id')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (existing) {
        // Update existing subscriber
        await supabase
          .from('newsletter_subscribers')
          .update({ 
            is_active: true,
            source: 'ai_trial',
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        // Insert new subscriber
        await supabase
          .from('newsletter_subscribers')
          .insert({
            email: email.toLowerCase(),
            is_active: true,
            source: 'ai_trial',
            subscribed_at: new Date().toISOString()
          });
      }

      setEmailSubmitted(true);
      toast.success('Email saved! You can now download your image.');
      onEmailSubmitted?.();
    } catch (error: any) {
      console.error('Error saving email:', error);
      toast.error('Failed to save email. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = async () => {
    if (!generatedImageUrl) {
      toast.error('No image to download');
      return;
    }

    try {
      const response = await fetch(generatedImageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-generated-image-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Download started!');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to download. Please try again.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            {customTitle}
          </DialogTitle>
          <DialogDescription>
            {customDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Features showcase */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border">
              <Image className="h-6 w-6 text-purple-500 mb-2" />
              <p className="text-sm font-medium">AI Images</p>
              <p className="text-xs text-muted-foreground">Generate stunning visuals</p>
            </div>
            <div className="p-3 rounded-lg bg-gradient-to-br from-pink-50 to-orange-50 dark:from-pink-950/30 dark:to-orange-950/30 border">
              <Video className="h-6 w-6 text-pink-500 mb-2" />
              <p className="text-sm font-medium">AI Videos</p>
              <p className="text-xs text-muted-foreground">Create engaging content</p>
            </div>
            <div className="p-3 rounded-lg bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-950/30 dark:to-teal-950/30 border">
              <Wand2 className="h-6 w-6 text-teal-500 mb-2" />
              <p className="text-sm font-medium">Ad Maker</p>
              <p className="text-xs text-muted-foreground">Professional ads in seconds</p>
            </div>
            <div className="p-3 rounded-lg bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border">
              <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 mb-2">FREE</Badge>
              <p className="text-sm font-medium">Trial Credits</p>
              <p className="text-xs text-muted-foreground">Get started today</p>
            </div>
          </div>

          {generatedImageUrl && (
            <div className="rounded-lg overflow-hidden border">
              <img 
                src={generatedImageUrl} 
                alt="Generated" 
                className="w-full h-40 object-cover"
              />
            </div>
          )}

          {!emailSubmitted ? (
            <div className="space-y-3 p-4 rounded-lg bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-purple-600" />
                <Label className="font-medium text-purple-900 dark:text-purple-100">
                  Enter your email to download
                </Label>
              </div>
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white dark:bg-gray-900"
              />
              <Button 
                onClick={handleSubmitEmail}
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Submitting...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    {customCtaText}
                  </span>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                We'll send you AI tips and exclusive offers!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Email verified! You can now download.</span>
              </div>
              {generatedImageUrl && (
                <Button 
                  onClick={handleDownload}
                  className="w-full bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Your Image
                </Button>
              )}
            </div>
          )}

          <div className="pt-2 border-t">
            <Button 
              variant="link" 
              className="w-full text-primary"
              onClick={() => window.location.href = '/auth'}
            >
              Sign up for full access & more credits →
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GuestAITrialPopup;
