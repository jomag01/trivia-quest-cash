-- Add birthday and phone_number columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS birthday DATE,
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Create email change requests table to track and verify email changes
CREATE TABLE IF NOT EXISTS public.email_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  old_email TEXT NOT NULL,
  new_email TEXT NOT NULL,
  verification_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'completed', 'expired', 'cancelled')),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  verified_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours')
);

-- Enable RLS on email_change_requests
ALTER TABLE public.email_change_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own email change requests
CREATE POLICY "Users can view own email change requests"
ON public.email_change_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create email change requests for themselves
CREATE POLICY "Users can create own email change requests"
ON public.email_change_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending requests (to cancel)
CREATE POLICY "Users can update own email change requests"
ON public.email_change_requests
FOR UPDATE
USING (auth.uid() = user_id);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_change_requests_user_id ON public.email_change_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_email_change_requests_token ON public.email_change_requests(verification_token);
CREATE INDEX IF NOT EXISTS idx_email_change_requests_status ON public.email_change_requests(status);