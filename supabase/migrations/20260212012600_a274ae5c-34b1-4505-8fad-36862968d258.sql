
CREATE TABLE public.installment_payment_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  method_key TEXT NOT NULL UNIQUE,
  method_name TEXT NOT NULL,
  description TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.installment_payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view installment payment methods" ON public.installment_payment_methods FOR SELECT USING (true);
CREATE POLICY "Admins can manage installment payment methods" ON public.installment_payment_methods FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);

INSERT INTO public.installment_payment_methods (method_key, method_name, description, is_enabled, display_order) VALUES
  ('cash_wallet', 'Cash Wallet', 'Automatic deduction from user cash wallet balance', true, 1),
  ('gcash', 'GCash', 'Pay via GCash mobile wallet', true, 2),
  ('maya', 'Maya', 'Pay via Maya (PayMaya) mobile wallet', true, 3),
  ('bank_transfer', 'Bank Transfer', 'Direct bank transfer payment', true, 4);
