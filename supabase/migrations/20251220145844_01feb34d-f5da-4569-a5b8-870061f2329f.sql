-- User service pricing table
CREATE TABLE public.smm_service_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL DEFAULT 'social_management',
  service_name TEXT NOT NULL,
  description TEXT,
  base_price NUMERIC NOT NULL DEFAULT 0,
  price_per_post NUMERIC DEFAULT 0,
  price_per_ad NUMERIC DEFAULT 0,
  price_per_month NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'PHP',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ads management table
CREATE TABLE public.smm_ad_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_account_id UUID NOT NULL REFERENCES public.smm_client_accounts(id) ON DELETE CASCADE,
  campaign_name TEXT NOT NULL,
  platform TEXT NOT NULL,
  ad_type TEXT NOT NULL DEFAULT 'feed',
  budget NUMERIC DEFAULT 0,
  budget_type TEXT DEFAULT 'daily',
  status TEXT DEFAULT 'draft',
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  target_audience JSONB DEFAULT '{}',
  ad_content JSONB DEFAULT '{}',
  performance_metrics JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Service transactions (user earnings from clients)
CREATE TABLE public.smm_service_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_account_id UUID REFERENCES public.smm_client_accounts(id) ON DELETE SET NULL,
  pricing_id UUID REFERENCES public.smm_service_pricing(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  admin_commission NUMERIC DEFAULT 0,
  net_amount NUMERIC DEFAULT 0,
  transaction_type TEXT NOT NULL DEFAULT 'service_fee',
  status TEXT DEFAULT 'pending',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Security audit log
CREATE TABLE public.smm_security_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_account_id UUID REFERENCES public.smm_client_accounts(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  action_details JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  risk_level TEXT DEFAULT 'low',
  blocked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add security columns to client accounts
ALTER TABLE public.smm_client_accounts 
ADD COLUMN IF NOT EXISTS original_owner_id UUID,
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS lock_reason TEXT,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS security_level TEXT DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS deletion_protected BOOLEAN DEFAULT true;

-- Enable RLS on new tables
ALTER TABLE public.smm_service_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smm_ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smm_service_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smm_security_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policies for service pricing
CREATE POLICY "Users can view own pricing" ON public.smm_service_pricing
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own pricing" ON public.smm_service_pricing
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pricing" ON public.smm_service_pricing
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pricing" ON public.smm_service_pricing
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for ad campaigns
CREATE POLICY "Users can view own ad campaigns" ON public.smm_ad_campaigns
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own ad campaigns" ON public.smm_ad_campaigns
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ad campaigns" ON public.smm_ad_campaigns
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own ad campaigns" ON public.smm_ad_campaigns
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for transactions
CREATE POLICY "Users can view own transactions" ON public.smm_service_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own transactions" ON public.smm_service_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for security audit (read-only for users)
CREATE POLICY "Users can view own security audit" ON public.smm_security_audit
  FOR SELECT USING (auth.uid() = user_id);

-- Prevent client account deletion/deactivation without proper checks
CREATE OR REPLACE FUNCTION public.protect_client_account()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent deletion of protected accounts
  IF OLD.deletion_protected = true THEN
    -- Log the attempted action
    INSERT INTO public.smm_security_audit (
      user_id, 
      client_account_id, 
      action_type, 
      action_details,
      risk_level,
      blocked
    ) VALUES (
      auth.uid(),
      OLD.id,
      'DELETE_ATTEMPT',
      jsonb_build_object(
        'account_name', OLD.account_name,
        'client_name', OLD.client_name,
        'platform', OLD.platform
      ),
      'high',
      true
    );
    RAISE EXCEPTION 'Cannot delete protected client account. Please contact support.';
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Prevent owner change
CREATE OR REPLACE FUNCTION public.prevent_owner_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If original_owner_id is set and user_id is being changed
  IF OLD.original_owner_id IS NOT NULL AND NEW.user_id != OLD.user_id THEN
    -- Log security violation
    INSERT INTO public.smm_security_audit (
      user_id,
      client_account_id,
      action_type,
      action_details,
      risk_level,
      blocked
    ) VALUES (
      auth.uid(),
      OLD.id,
      'OWNER_CHANGE_ATTEMPT',
      jsonb_build_object(
        'original_owner', OLD.original_owner_id,
        'current_owner', OLD.user_id,
        'attempted_new_owner', NEW.user_id
      ),
      'critical',
      true
    );
    RAISE EXCEPTION 'Cannot change account ownership. This is a security violation.';
  END IF;
  
  -- Set original owner on first update if not set
  IF OLD.original_owner_id IS NULL THEN
    NEW.original_owner_id = OLD.user_id;
  END IF;
  
  -- Prevent status change to inactive on locked accounts
  IF OLD.is_locked = true AND NEW.status = 'inactive' THEN
    INSERT INTO public.smm_security_audit (
      user_id,
      client_account_id,
      action_type,
      action_details,
      risk_level,
      blocked
    ) VALUES (
      auth.uid(),
      OLD.id,
      'DEACTIVATION_ATTEMPT',
      jsonb_build_object('account_name', OLD.account_name, 'reason', 'Account is locked'),
      'high',
      true
    );
    RAISE EXCEPTION 'Cannot deactivate a locked account.';
  END IF;
  
  -- Update last activity
  NEW.last_activity_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers
DROP TRIGGER IF EXISTS protect_client_account_delete ON public.smm_client_accounts;
CREATE TRIGGER protect_client_account_delete
  BEFORE DELETE ON public.smm_client_accounts
  FOR EACH ROW EXECUTE FUNCTION public.protect_client_account();

DROP TRIGGER IF EXISTS prevent_owner_change_trigger ON public.smm_client_accounts;
CREATE TRIGGER prevent_owner_change_trigger
  BEFORE UPDATE ON public.smm_client_accounts
  FOR EACH ROW EXECUTE FUNCTION public.prevent_owner_change();

-- Trigger for updated_at
CREATE TRIGGER update_smm_service_pricing_updated_at
  BEFORE UPDATE ON public.smm_service_pricing
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_smm_ad_campaigns_updated_at
  BEFORE UPDATE ON public.smm_ad_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_smm_service_pricing_user ON public.smm_service_pricing(user_id);
CREATE INDEX IF NOT EXISTS idx_smm_ad_campaigns_user ON public.smm_ad_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_smm_ad_campaigns_client ON public.smm_ad_campaigns(client_account_id);
CREATE INDEX IF NOT EXISTS idx_smm_service_transactions_user ON public.smm_service_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_smm_security_audit_user ON public.smm_security_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_smm_security_audit_client ON public.smm_security_audit(client_account_id);
CREATE INDEX IF NOT EXISTS idx_smm_security_audit_risk ON public.smm_security_audit(risk_level);

-- Enable realtime for transactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.smm_service_transactions;