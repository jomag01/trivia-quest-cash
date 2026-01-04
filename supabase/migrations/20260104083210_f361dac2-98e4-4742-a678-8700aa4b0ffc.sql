-- Create newsletter tables for email marketing automation

-- Main newsletters table
CREATE TABLE public.newsletters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  preview_text TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent')),
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  total_recipients INTEGER DEFAULT 0,
  total_opens INTEGER DEFAULT 0,
  total_clicks INTEGER DEFAULT 0
);

-- Newsletter subscribers (all app users can be subscribed)
CREATE TABLE public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  is_subscribed BOOLEAN DEFAULT true,
  subscribed_at TIMESTAMPTZ DEFAULT now(),
  unsubscribed_at TIMESTAMPTZ,
  source TEXT DEFAULT 'app',
  UNIQUE(email)
);

-- Track individual email sends
CREATE TABLE public.newsletter_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  newsletter_id UUID REFERENCES public.newsletters(id) ON DELETE CASCADE,
  subscriber_id UUID REFERENCES public.newsletter_subscribers(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ DEFAULT now(),
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'bounced'))
);

-- Email automation sequences (autoresponders)
CREATE TABLE public.email_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('signup', 'purchase', 'inactivity', 'custom')),
  trigger_delay_hours INTEGER DEFAULT 0,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Track automation sends
CREATE TABLE public.automation_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID REFERENCES public.email_automations(id) ON DELETE CASCADE,
  subscriber_id UUID REFERENCES public.newsletter_subscribers(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'sent'
);

-- Enable RLS
ALTER TABLE public.newsletters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_sends ENABLE ROW LEVEL SECURITY;

-- RLS Policies for newsletters (admin only via has_role function)
CREATE POLICY "Admins can manage newsletters" ON public.newsletters
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage subscribers" ON public.newsletter_subscribers
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can manage own subscription" ON public.newsletter_subscribers
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view sends" ON public.newsletter_sends
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage automations" ON public.email_automations
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view automation sends" ON public.automation_sends
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for newsletters
ALTER PUBLICATION supabase_realtime ADD TABLE public.newsletters;
ALTER PUBLICATION supabase_realtime ADD TABLE public.newsletter_subscribers;

-- Create indexes for performance
CREATE INDEX idx_newsletters_status ON public.newsletters(status);
CREATE INDEX idx_newsletter_sends_newsletter ON public.newsletter_sends(newsletter_id);
CREATE INDEX idx_subscribers_subscribed ON public.newsletter_subscribers(is_subscribed);
CREATE INDEX idx_automations_trigger ON public.email_automations(trigger_type, is_active);