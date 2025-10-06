-- Drop and recreate with TEXT to avoid enum comparison issues
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.credit_purchases CASCADE;
DROP TABLE IF EXISTS public.payout_requests CASCADE;
DROP FUNCTION IF EXISTS public.has_role(UUID, app_role) CASCADE;
DROP FUNCTION IF EXISTS public.has_role(UUID, TEXT) CASCADE;

-- Create user_roles table with TEXT role
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function using TEXT
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create credit_purchases table
CREATE TABLE public.credit_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    credits INTEGER NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('gcash', 'bank_transfer', 'paymaya')),
    proof_image_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_notes TEXT,
    processed_by UUID REFERENCES auth.users(id),
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.credit_purchases ENABLE ROW LEVEL SECURITY;

-- Policies for credit_purchases
CREATE POLICY "Users can view their own credit purchases"
ON public.credit_purchases FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own credit purchases"
ON public.credit_purchases FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all credit purchases"
ON public.credit_purchases FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update credit purchases"
ON public.credit_purchases FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create payout_requests table
CREATE TABLE public.payout_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payout_method TEXT NOT NULL CHECK (payout_method IN ('gcash', 'bank_transfer')),
    account_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    bank_name TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'completed', 'rejected')),
    admin_notes TEXT,
    processed_by UUID REFERENCES auth.users(id),
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

-- Policies for payout_requests
CREATE POLICY "Users can view their own payout requests"
ON public.payout_requests FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own payout requests"
ON public.payout_requests FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all payout requests"
ON public.payout_requests FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update payout requests"
ON public.payout_requests FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create storage bucket
INSERT INTO storage.buckets (id, name) 
VALUES ('payment-proofs', 'payment-proofs')
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload their own payment proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-proofs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own payment proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-proofs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all payment proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND public.has_role(auth.uid(), 'admin')
);

-- Trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_credit_purchases_updated_at
BEFORE UPDATE ON public.credit_purchases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payout_requests_updated_at
BEFORE UPDATE ON public.payout_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();