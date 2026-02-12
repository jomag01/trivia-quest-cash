
-- Add KYC and document fields to installment_applications
ALTER TABLE public.installment_applications
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS birthdate DATE,
ADD COLUMN IF NOT EXISTS id_type TEXT,
ADD COLUMN IF NOT EXISTS id_number TEXT,
ADD COLUMN IF NOT EXISTS id_document_url TEXT,
ADD COLUMN IF NOT EXISTS selfie_url TEXT,
ADD COLUMN IF NOT EXISTS proof_of_income_url TEXT,
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash_wallet',
ADD COLUMN IF NOT EXISTS payment_proof_url TEXT,
ADD COLUMN IF NOT EXISTS payment_reference TEXT;

-- Create storage bucket for installment documents
INSERT INTO storage.buckets (id, name)
VALUES ('installment-docs', 'installment-docs')
ON CONFLICT (id) DO NOTHING;

-- Storage policies: users can upload their own docs
CREATE POLICY "Users can upload installment docs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'installment-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own installment docs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'installment-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Admins can view all installment docs
CREATE POLICY "Admins can view all installment docs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'installment-docs' AND public.has_role(auth.uid(), 'admin'));
