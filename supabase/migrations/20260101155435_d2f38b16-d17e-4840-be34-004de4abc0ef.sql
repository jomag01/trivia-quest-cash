-- Create cash_wallets table for user cash balances
CREATE TABLE public.cash_wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
  pin_hash TEXT,
  pin_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create cash_transactions table for transaction history
CREATE TABLE public.cash_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL, -- 'deposit', 'withdrawal', 'purchase', 'conversion', 'refund'
  amount DECIMAL(12, 2) NOT NULL,
  balance_before DECIMAL(12, 2) NOT NULL,
  balance_after DECIMAL(12, 2) NOT NULL,
  description TEXT,
  reference_type TEXT, -- 'ai_credit', 'diamond', 'shop_order', 'ad_payment', etc.
  reference_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create cash_deposit_requests table for admin approval workflow
CREATE TABLE public.cash_deposit_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  payment_method TEXT NOT NULL, -- 'bank', 'ewallet', 'qr'
  payment_reference TEXT,
  payment_proof_url TEXT,
  sender_name TEXT,
  sender_account TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  admin_notes TEXT,
  processed_by UUID,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cash_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_deposit_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cash_wallets
CREATE POLICY "Users can view own cash wallet"
ON public.cash_wallets FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own cash wallet PIN"
ON public.cash_wallets FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can insert cash wallets"
ON public.cash_wallets FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all cash wallets"
ON public.cash_wallets FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for cash_transactions
CREATE POLICY "Users can view own cash transactions"
ON public.cash_transactions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all cash transactions"
ON public.cash_transactions FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for cash_deposit_requests
CREATE POLICY "Users can view own deposit requests"
ON public.cash_deposit_requests FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own deposit requests"
ON public.cash_deposit_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all deposit requests"
ON public.cash_deposit_requests FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Function to create cash wallet for new users
CREATE OR REPLACE FUNCTION public.create_user_cash_wallet()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.cash_wallets (user_id, balance)
  VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger to auto-create cash wallet on user signup
CREATE TRIGGER on_auth_user_created_cash_wallet
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_user_cash_wallet();

-- Function to process approved cash deposit
CREATE OR REPLACE FUNCTION public.approve_cash_deposit(
  p_request_id UUID,
  p_admin_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_request RECORD;
  v_wallet RECORD;
  v_balance_before DECIMAL(12,2);
  v_balance_after DECIMAL(12,2);
BEGIN
  -- Get the deposit request
  SELECT * INTO v_request FROM cash_deposit_requests WHERE id = p_request_id AND status = 'pending';
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Get or create wallet
  SELECT * INTO v_wallet FROM cash_wallets WHERE user_id = v_request.user_id;
  IF NOT FOUND THEN
    INSERT INTO cash_wallets (user_id, balance) VALUES (v_request.user_id, 0)
    RETURNING * INTO v_wallet;
  END IF;

  v_balance_before := v_wallet.balance;
  v_balance_after := v_wallet.balance + v_request.amount;

  -- Update wallet balance
  UPDATE cash_wallets SET balance = v_balance_after, updated_at = now() WHERE user_id = v_request.user_id;

  -- Record transaction
  INSERT INTO cash_transactions (user_id, transaction_type, amount, balance_before, balance_after, description, reference_type, reference_id)
  VALUES (v_request.user_id, 'deposit', v_request.amount, v_balance_before, v_balance_after, 'Cash deposit approved', 'deposit_request', p_request_id::text);

  -- Update request status
  UPDATE cash_deposit_requests SET status = 'approved', processed_by = p_admin_id, processed_at = now(), updated_at = now() WHERE id = p_request_id;

  RETURN TRUE;
END;
$$;

-- Function to deduct from cash wallet (for purchases)
CREATE OR REPLACE FUNCTION public.deduct_cash_balance(
  p_user_id UUID,
  p_amount DECIMAL(12,2),
  p_description TEXT,
  p_reference_type TEXT,
  p_reference_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_wallet RECORD;
  v_balance_before DECIMAL(12,2);
  v_balance_after DECIMAL(12,2);
BEGIN
  SELECT * INTO v_wallet FROM cash_wallets WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND OR v_wallet.balance < p_amount THEN
    RETURN FALSE;
  END IF;

  -- Check if wallet is locked
  IF v_wallet.locked_until IS NOT NULL AND v_wallet.locked_until > now() THEN
    RETURN FALSE;
  END IF;

  v_balance_before := v_wallet.balance;
  v_balance_after := v_wallet.balance - p_amount;

  UPDATE cash_wallets SET balance = v_balance_after, updated_at = now() WHERE user_id = p_user_id;

  INSERT INTO cash_transactions (user_id, transaction_type, amount, balance_before, balance_after, description, reference_type, reference_id)
  VALUES (p_user_id, 'purchase', -p_amount, v_balance_before, v_balance_after, p_description, p_reference_type, p_reference_id);

  RETURN TRUE;
END;
$$;

-- Index for faster queries
CREATE INDEX idx_cash_transactions_user ON public.cash_transactions(user_id);
CREATE INDEX idx_cash_deposit_requests_status ON public.cash_deposit_requests(status);
CREATE INDEX idx_cash_deposit_requests_user ON public.cash_deposit_requests(user_id);