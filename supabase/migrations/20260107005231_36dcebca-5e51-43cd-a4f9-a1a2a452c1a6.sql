-- Add marketing_systems table for flexible system management
CREATE TABLE IF NOT EXISTS public.marketing_systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_key TEXT NOT NULL UNIQUE,
  system_name TEXT NOT NULL,
  description TEXT,
  is_enabled BOOLEAN DEFAULT true,
  icon TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marketing_systems ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read (needed to check if system is enabled)
CREATE POLICY "Anyone can view marketing systems"
ON public.marketing_systems FOR SELECT
USING (true);

-- Only admins can manage
CREATE POLICY "Admins can manage marketing systems"
ON public.marketing_systems FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

-- Insert default marketing systems
INSERT INTO public.marketing_systems (system_key, system_name, description, icon, display_order, is_enabled)
VALUES 
  ('binary', 'AI Beehives (Binary)', 'Binary placement and matching bonus system', 'GitBranch', 1, true),
  ('unilevel', 'Unilevel', 'Multi-level direct referral commission system', 'Network', 2, true),
  ('stairstep', 'Stairstep', 'Rank-based breakaway bonus system', 'TrendingUp', 3, true),
  ('leadership', 'Leadership Pool', 'Top performer bonus pool distribution', 'Crown', 4, true),
  ('affiliate', 'Affiliate Network', 'General affiliate referral program', 'Users', 5, true)
ON CONFLICT (system_key) DO NOTHING;