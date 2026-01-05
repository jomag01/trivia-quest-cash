-- Create error_reports table for users to report bugs and issues
CREATE TABLE public.error_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  error_type TEXT NOT NULL DEFAULT 'bug',
  error_title TEXT NOT NULL,
  error_description TEXT NOT NULL,
  screenshot_url TEXT,
  page_url TEXT,
  browser_info TEXT,
  device_info TEXT,
  console_logs JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'closed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  admin_notes TEXT,
  resolved_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.error_reports ENABLE ROW LEVEL SECURITY;

-- Users can view their own error reports
CREATE POLICY "Users can view their own error reports"
ON public.error_reports
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create error reports
CREATE POLICY "Users can create error reports"
ON public.error_reports
FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Admins can view all error reports
CREATE POLICY "Admins can view all error reports"
ON public.error_reports
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Admins can update error reports
CREATE POLICY "Admins can update error reports"
ON public.error_reports
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create index for faster queries
CREATE INDEX idx_error_reports_status ON public.error_reports(status);
CREATE INDEX idx_error_reports_user_id ON public.error_reports(user_id);
CREATE INDEX idx_error_reports_created_at ON public.error_reports(created_at DESC);