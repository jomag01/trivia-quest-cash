-- Create transactions table for tracking all payments and cashouts
CREATE TABLE IF NOT EXISTS public.transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type text NOT NULL CHECK (type IN ('credit_purchase', 'cashout')),
    amount decimal(10,2) NOT NULL,
    status text NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')) DEFAULT 'pending',
    payment_method text,
    payment_provider_id text,
    payout_account_id uuid,
    metadata jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create payout_accounts table for storing user payout methods
CREATE TABLE IF NOT EXISTS public.payout_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    account_type text NOT NULL CHECK (account_type IN ('gcash', 'maya', 'bank')),
    account_name text NOT NULL,
    account_number text NOT NULL,
    bank_code text,
    is_default boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create user_wallets table for tracking balances
CREATE TABLE IF NOT EXISTS public.user_wallets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    balance decimal(10,2) DEFAULT 0 NOT NULL CHECK (balance >= 0),
    credits integer DEFAULT 0 NOT NULL CHECK (credits >= 0),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for transactions
CREATE POLICY "Users can view their own transactions"
ON public.transactions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transactions"
ON public.transactions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for payout_accounts
CREATE POLICY "Users can view their own payout accounts"
ON public.payout_accounts FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own payout accounts"
ON public.payout_accounts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payout accounts"
ON public.payout_accounts FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payout accounts"
ON public.payout_accounts FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- RLS Policies for user_wallets
CREATE POLICY "Users can view their own wallet"
ON public.user_wallets FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own wallet"
ON public.user_wallets FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_status ON public.transactions(status);
CREATE INDEX idx_payout_accounts_user_id ON public.payout_accounts(user_id);
CREATE INDEX idx_user_wallets_user_id ON public.user_wallets(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payout_accounts_updated_at BEFORE UPDATE ON public.payout_accounts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_wallets_updated_at BEFORE UPDATE ON public.user_wallets
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();