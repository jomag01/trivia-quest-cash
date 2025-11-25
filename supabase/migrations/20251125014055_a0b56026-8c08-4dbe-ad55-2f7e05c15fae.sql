-- Create leadership_commissions table to track royalty/breakaway earnings
CREATE TABLE IF NOT EXISTS public.leadership_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upline_id UUID NOT NULL,
  downline_id UUID NOT NULL,
  level INTEGER NOT NULL CHECK (level >= 1 AND level <= 7),
  amount NUMERIC(10, 2) NOT NULL,
  sales_amount NUMERIC(10, 2) NOT NULL,
  commission_type TEXT NOT NULL DEFAULT 'leadership_breakaway',
  order_id UUID REFERENCES public.orders(id),
  purchase_id UUID REFERENCES public.credit_purchases(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_leadership_commissions_upline ON public.leadership_commissions(upline_id);
CREATE INDEX IF NOT EXISTS idx_leadership_commissions_downline ON public.leadership_commissions(downline_id);
CREATE INDEX IF NOT EXISTS idx_leadership_commissions_created ON public.leadership_commissions(created_at);

-- Enable RLS
ALTER TABLE public.leadership_commissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for leadership_commissions
CREATE POLICY "Users can view their own leadership commissions"
  ON public.leadership_commissions
  FOR SELECT
  USING (auth.uid() = upline_id);

-- Function to distribute leadership breakaway commissions (2% from 21% leaders)
CREATE OR REPLACE FUNCTION public.distribute_leadership_breakaway(
  p_seller_id UUID,
  p_sales_amount NUMERIC,
  p_order_id UUID DEFAULT NULL,
  p_purchase_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_upline_id UUID;
  v_current_level INTEGER := 1;
  v_upline_step INTEGER;
  v_seller_step INTEGER;
  v_commission_amount NUMERIC;
  v_max_step INTEGER;
BEGIN
  -- Get the seller's current stair step level
  SELECT current_step INTO v_seller_step
  FROM affiliate_current_rank
  WHERE user_id = p_seller_id;

  -- Get the maximum step number (21% level)
  SELECT MAX(step_number) INTO v_max_step
  FROM stair_step_config
  WHERE active = true;

  -- Only proceed if seller is at the maximum step (21% level)
  IF v_seller_step IS NULL OR v_seller_step < v_max_step THEN
    RETURN;
  END IF;

  -- Start from the seller's immediate upline
  SELECT referred_by INTO v_current_upline_id
  FROM profiles
  WHERE id = p_seller_id;

  -- Traverse up to 7 levels
  WHILE v_current_upline_id IS NOT NULL AND v_current_level <= 7 LOOP
    -- Get upline's stair step level
    SELECT current_step INTO v_upline_step
    FROM affiliate_current_rank
    WHERE user_id = v_current_upline_id;

    -- Only pay leadership commission if upline is also at 21% level
    IF v_upline_step = v_max_step THEN
      v_commission_amount := p_sales_amount * 0.02; -- 2% leadership override

      -- Credit the leadership commission to upline's wallet
      UPDATE user_wallets
      SET 
        balance = balance + v_commission_amount,
        total_commissions = COALESCE(total_commissions, 0) + v_commission_amount,
        updated_at = now()
      WHERE user_id = v_current_upline_id;

      -- Record the leadership commission
      INSERT INTO leadership_commissions (
        upline_id,
        downline_id,
        level,
        amount,
        sales_amount,
        commission_type,
        order_id,
        purchase_id,
        notes
      ) VALUES (
        v_current_upline_id,
        p_seller_id,
        v_current_level,
        v_commission_amount,
        p_sales_amount,
        'leadership_breakaway',
        p_order_id,
        p_purchase_id,
        'Leadership breakaway: 2% from 21% leader at level ' || v_current_level
      );
    END IF;

    -- Move to next level up
    SELECT referred_by INTO v_current_upline_id
    FROM profiles
    WHERE id = v_current_upline_id;

    v_current_level := v_current_level + 1;
  END LOOP;
END;
$$;

-- Trigger function to distribute leadership commissions on product orders
CREATE OR REPLACE FUNCTION public.trigger_leadership_commissions_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only trigger when order status changes to 'delivered'
  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
    -- Distribute leadership breakaway commissions
    PERFORM distribute_leadership_breakaway(
      NEW.user_id,
      NEW.total_amount,
      NEW.id,
      NULL
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger function to distribute leadership commissions on credit purchases
CREATE OR REPLACE FUNCTION public.trigger_leadership_commissions_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only trigger when credit purchase is approved
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Distribute leadership breakaway commissions
    PERFORM distribute_leadership_breakaway(
      NEW.user_id,
      NEW.amount,
      NULL,
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_leadership_order ON public.orders;
CREATE TRIGGER trigger_leadership_order
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION trigger_leadership_commissions_order();

DROP TRIGGER IF EXISTS trigger_leadership_credits ON public.credit_purchases;
CREATE TRIGGER trigger_leadership_credits
  AFTER INSERT OR UPDATE ON public.credit_purchases
  FOR EACH ROW
  EXECUTE FUNCTION trigger_leadership_commissions_credits();

COMMENT ON TABLE public.leadership_commissions IS 'Tracks leadership breakaway/royalty commissions where 21% level uplines earn 2% from 21% level downlines across 7 levels';
COMMENT ON FUNCTION public.distribute_leadership_breakaway IS 'Distributes 2% leadership breakaway commissions to uplines who are at 21% level from downlines also at 21% level, up to 7 levels deep';