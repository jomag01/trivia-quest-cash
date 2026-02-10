
-- Table for admin to assign installment offers to specific users
CREATE TABLE public.user_installment_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_id UUID NOT NULL,
  provider_id UUID NOT NULL REFERENCES public.installment_providers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  assigned_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, product_id, provider_id)
);

ALTER TABLE public.user_installment_offers ENABLE ROW LEVEL SECURITY;

-- Admins can manage all offers
CREATE POLICY "Admins can manage user installment offers"
ON public.user_installment_offers
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Users can view their own offers
CREATE POLICY "Users can view own installment offers"
ON public.user_installment_offers
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Add downpayment fields to installment_applications
ALTER TABLE public.installment_applications 
  ADD COLUMN IF NOT EXISTS downpayment_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS downpayment_paid BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS offer_id UUID REFERENCES public.user_installment_offers(id);
