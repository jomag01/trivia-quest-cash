-- Create verification table for ID verification
CREATE TABLE IF NOT EXISTS public.beesmate_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  id_document_url TEXT NOT NULL,
  selfie_url TEXT,
  verification_status TEXT NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  rejection_reason TEXT,
  verified_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.beesmate_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can submit own verification" ON public.beesmate_verifications;
DROP POLICY IF EXISTS "Users can view own verification" ON public.beesmate_verifications;
DROP POLICY IF EXISTS "Admins manage verifications" ON public.beesmate_verifications;

CREATE POLICY "Users can submit own verification" ON public.beesmate_verifications
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own verification" ON public.beesmate_verifications
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins manage verifications" ON public.beesmate_verifications
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Add upgrade_tier column to beesmate_premium_tiers for graduation upgrade path
ALTER TABLE public.beesmate_premium_tiers 
ADD COLUMN IF NOT EXISTS upgrade_tier_id UUID REFERENCES public.beesmate_premium_tiers(id),
ADD COLUMN IF NOT EXISTS is_graduation_tier BOOLEAN DEFAULT false;