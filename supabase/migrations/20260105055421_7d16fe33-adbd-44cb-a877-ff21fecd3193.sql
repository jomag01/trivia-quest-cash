-- Add authenticated_document_url column to shareholders table for signed admin documents
ALTER TABLE public.shareholders 
ADD COLUMN IF NOT EXISTS authenticated_document_url TEXT;

-- Add a column to store the document signed by admin that the shareholder submits as proof
ALTER TABLE public.shareholders 
ADD COLUMN IF NOT EXISTS admin_signed_document_url TEXT;

-- Make shareholder registration publicly accessible for unauthenticated users with a token
-- Create a shareholder_registration_tokens table for tracking public form access
CREATE TABLE IF NOT EXISTS public.shareholder_registration_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
    created_by UUID NOT NULL,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ,
    uses_count INTEGER DEFAULT 0,
    max_uses INTEGER,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shareholder_registration_tokens ENABLE ROW LEVEL SECURITY;

-- Only admins can manage tokens
CREATE POLICY "Admin can manage registration tokens" 
ON public.shareholder_registration_tokens FOR ALL 
USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Allow public read for valid tokens (used during form submission)
CREATE POLICY "Public can read active tokens" 
ON public.shareholder_registration_tokens FOR SELECT 
USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- Allow public insert for shareholders (when registering via shareable link)
CREATE POLICY "Public can apply as shareholder"
ON public.shareholders FOR INSERT
WITH CHECK (true);

-- Allow public to view their own submission by email
CREATE POLICY "Public can view by email match"
ON public.shareholders FOR SELECT
USING (email = current_setting('request.jwt.claims', true)::json->>'email' OR auth.uid() = user_id);