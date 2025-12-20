-- Social Media Client Accounts for 100M+ users
CREATE TABLE public.smm_client_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  platform TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_id TEXT,
  client_name TEXT NOT NULL,
  client_email TEXT,
  monthly_fee NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active',
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for fast user lookups
CREATE INDEX idx_smm_client_accounts_user_id ON public.smm_client_accounts(user_id);
CREATE INDEX idx_smm_client_accounts_platform ON public.smm_client_accounts(platform);
CREATE INDEX idx_smm_client_accounts_status ON public.smm_client_accounts(status);

-- Enable RLS
ALTER TABLE public.smm_client_accounts ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own client accounts"
ON public.smm_client_accounts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own client accounts"
ON public.smm_client_accounts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own client accounts"
ON public.smm_client_accounts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own client accounts"
ON public.smm_client_accounts FOR DELETE
USING (auth.uid() = user_id);

-- Scheduled Posts table with partitioning support
CREATE TABLE public.smm_scheduled_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_account_id UUID NOT NULL REFERENCES public.smm_client_accounts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  media_type TEXT DEFAULT 'text',
  media_urls JSONB DEFAULT '[]',
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'scheduled',
  platform TEXT NOT NULL,
  post_result JSONB,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient queries
CREATE INDEX idx_smm_scheduled_posts_user_id ON public.smm_scheduled_posts(user_id);
CREATE INDEX idx_smm_scheduled_posts_client_account ON public.smm_scheduled_posts(client_account_id);
CREATE INDEX idx_smm_scheduled_posts_status ON public.smm_scheduled_posts(status);
CREATE INDEX idx_smm_scheduled_posts_scheduled ON public.smm_scheduled_posts(scheduled_for) WHERE status = 'scheduled';

-- Enable RLS
ALTER TABLE public.smm_scheduled_posts ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own scheduled posts"
ON public.smm_scheduled_posts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scheduled posts"
ON public.smm_scheduled_posts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scheduled posts"
ON public.smm_scheduled_posts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scheduled posts"
ON public.smm_scheduled_posts FOR DELETE
USING (auth.uid() = user_id);

-- Content Templates for reuse
CREATE TABLE public.smm_content_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  platform TEXT,
  content TEXT NOT NULL,
  category TEXT,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_smm_templates_user_id ON public.smm_content_templates(user_id);

ALTER TABLE public.smm_content_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own templates"
ON public.smm_content_templates FOR ALL
USING (auth.uid() = user_id);

-- Analytics tracking
CREATE TABLE public.smm_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_account_id UUID REFERENCES public.smm_client_accounts(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.smm_scheduled_posts(id) ON DELETE SET NULL,
  metric_type TEXT NOT NULL,
  metric_value NUMERIC DEFAULT 0,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_smm_analytics_user_id ON public.smm_analytics(user_id);
CREATE INDEX idx_smm_analytics_client ON public.smm_analytics(client_account_id);
CREATE INDEX idx_smm_analytics_date ON public.smm_analytics(recorded_at);

ALTER TABLE public.smm_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own analytics"
ON public.smm_analytics FOR ALL
USING (auth.uid() = user_id);

-- Update timestamp trigger
CREATE TRIGGER update_smm_client_accounts_updated_at
BEFORE UPDATE ON public.smm_client_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_smm_scheduled_posts_updated_at
BEFORE UPDATE ON public.smm_scheduled_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.smm_scheduled_posts;