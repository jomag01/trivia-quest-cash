-- Create page_views table for visitor analytics
CREATE TABLE public.page_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id TEXT NOT NULL,
  user_id UUID,
  page_path TEXT NOT NULL,
  page_title TEXT,
  referrer_url TEXT,
  user_agent TEXT,
  referral_source TEXT,
  referral_user_id UUID,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_page_views_visitor_id ON public.page_views(visitor_id);
CREATE INDEX idx_page_views_user_id ON public.page_views(user_id);
CREATE INDEX idx_page_views_page_path ON public.page_views(page_path);
CREATE INDEX idx_page_views_created_at ON public.page_views(created_at);
CREATE INDEX idx_page_views_referral_user_id ON public.page_views(referral_user_id);

-- Enable RLS on page_views
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert page views (for tracking)
CREATE POLICY "Anyone can insert page views" ON public.page_views FOR INSERT WITH CHECK (true);

-- Allow admins to view all page views
CREATE POLICY "Admins can view all page views" ON public.page_views FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- Create visitor_sessions table for session tracking
CREATE TABLE public.visitor_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id TEXT NOT NULL UNIQUE,
  user_id UUID,
  first_visit_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_visit_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  total_page_views INTEGER NOT NULL DEFAULT 0,
  referral_source TEXT,
  referral_user_id UUID,
  converted_to_user BOOLEAN DEFAULT false,
  converted_to_affiliate BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for visitor sessions
CREATE INDEX idx_visitor_sessions_visitor_id ON public.visitor_sessions(visitor_id);
CREATE INDEX idx_visitor_sessions_referral_user_id ON public.visitor_sessions(referral_user_id);
CREATE INDEX idx_visitor_sessions_created_at ON public.visitor_sessions(created_at);

-- Enable RLS on visitor_sessions
ALTER TABLE public.visitor_sessions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert/update their session (for tracking)
CREATE POLICY "Anyone can insert visitor sessions" ON public.visitor_sessions 
FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update visitor sessions" ON public.visitor_sessions 
FOR UPDATE USING (true) WITH CHECK (true);

-- Allow admins to view all sessions
CREATE POLICY "Admins can view all visitor sessions" ON public.visitor_sessions FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for page_views for admin dashboard
ALTER PUBLICATION supabase_realtime ADD TABLE public.page_views;
ALTER PUBLICATION supabase_realtime ADD TABLE public.visitor_sessions;