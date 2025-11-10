-- Create stair step configuration table
CREATE TABLE IF NOT EXISTS public.stair_step_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_number INTEGER NOT NULL UNIQUE CHECK (step_number > 0),
  step_name TEXT NOT NULL,
  commission_percentage DECIMAL(5, 2) NOT NULL CHECK (commission_percentage >= 0 AND commission_percentage <= 100),
  sales_quota DECIMAL(10, 2) NOT NULL CHECK (sales_quota >= 0),
  months_to_qualify INTEGER NOT NULL DEFAULT 3 CHECK (months_to_qualify > 0),
  breakaway_percentage DECIMAL(5, 2) DEFAULT 2.00 CHECK (breakaway_percentage >= 0 AND breakaway_percentage <= 100),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.stair_step_config ENABLE ROW LEVEL SECURITY;

-- Anyone can view active stair step config
CREATE POLICY "Anyone can view active stair step config"
ON public.stair_step_config
FOR SELECT
TO authenticated
USING (active = true);

-- Only admins can manage stair step config
CREATE POLICY "Admins can manage stair step config"
ON public.stair_step_config
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create affiliate rank history table
CREATE TABLE IF NOT EXISTS public.affiliate_rank_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  qualified_month DATE NOT NULL,
  sales_volume DECIMAL(10, 2) NOT NULL DEFAULT 0,
  qualification_count INTEGER NOT NULL DEFAULT 0,
  is_fixed BOOLEAN DEFAULT false,
  reverted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, qualified_month)
);

-- Enable RLS
ALTER TABLE public.affiliate_rank_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own rank history
CREATE POLICY "Users can view their own rank history"
ON public.affiliate_rank_history
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- System can insert/update rank history
CREATE POLICY "System can manage rank history"
ON public.affiliate_rank_history
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create affiliate current rank table
CREATE TABLE IF NOT EXISTS public.affiliate_current_rank (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_step INTEGER NOT NULL DEFAULT 0,
  qualification_count INTEGER NOT NULL DEFAULT 0,
  is_fixed BOOLEAN DEFAULT false,
  last_qualified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.affiliate_current_rank ENABLE ROW LEVEL SECURITY;

-- Users can view their own current rank
CREATE POLICY "Users can view their own current rank"
ON public.affiliate_current_rank
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- System can manage current rank
CREATE POLICY "System can manage current rank"
ON public.affiliate_current_rank
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create monthly sales tracking table
CREATE TABLE IF NOT EXISTS public.affiliate_monthly_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sales_month DATE NOT NULL,
  personal_sales DECIMAL(10, 2) NOT NULL DEFAULT 0,
  team_sales DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_sales DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, sales_month)
);

-- Enable RLS
ALTER TABLE public.affiliate_monthly_sales ENABLE ROW LEVEL SECURITY;

-- Users can view their own sales
CREATE POLICY "Users can view their own sales"
ON public.affiliate_monthly_sales
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- System can manage sales
CREATE POLICY "System can manage sales"
ON public.affiliate_monthly_sales
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_affiliate_rank_history_user_id ON public.affiliate_rank_history(user_id);
CREATE INDEX idx_affiliate_rank_history_qualified_month ON public.affiliate_rank_history(qualified_month);
CREATE INDEX idx_affiliate_monthly_sales_user_id ON public.affiliate_monthly_sales(user_id);
CREATE INDEX idx_affiliate_monthly_sales_month ON public.affiliate_monthly_sales(sales_month);

-- Insert default stair step configuration
INSERT INTO public.stair_step_config (step_number, step_name, commission_percentage, sales_quota, months_to_qualify, breakaway_percentage)
VALUES 
  (1, 'Step 1', 2.00, 10000, 3, 0),
  (2, 'Step 2', 5.00, 50000, 3, 0),
  (3, 'Step 3', 8.00, 100000, 3, 2.00)
ON CONFLICT (step_number) DO NOTHING;

-- Function to update affiliate monthly sales
CREATE OR REPLACE FUNCTION public.update_affiliate_monthly_sales(
  p_user_id UUID,
  p_amount DECIMAL,
  p_is_personal BOOLEAN DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_month DATE := DATE_TRUNC('month', NOW());
BEGIN
  INSERT INTO affiliate_monthly_sales (user_id, sales_month, personal_sales, team_sales, total_sales)
  VALUES (
    p_user_id,
    current_month,
    CASE WHEN p_is_personal THEN p_amount ELSE 0 END,
    CASE WHEN NOT p_is_personal THEN p_amount ELSE 0 END,
    p_amount
  )
  ON CONFLICT (user_id, sales_month)
  DO UPDATE SET
    personal_sales = affiliate_monthly_sales.personal_sales + CASE WHEN p_is_personal THEN p_amount ELSE 0 END,
    team_sales = affiliate_monthly_sales.team_sales + CASE WHEN NOT p_is_personal THEN p_amount ELSE 0 END,
    total_sales = affiliate_monthly_sales.total_sales + p_amount,
    updated_at = NOW();
END;
$$;

-- Function to check and update affiliate rank
CREATE OR REPLACE FUNCTION public.check_and_update_affiliate_rank(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_month DATE := DATE_TRUNC('month', NOW());
  current_sales DECIMAL;
  current_rank RECORD;
  new_step INTEGER := 0;
  config RECORD;
BEGIN
  -- Get current month sales
  SELECT COALESCE(total_sales, 0) INTO current_sales
  FROM affiliate_monthly_sales
  WHERE user_id = p_user_id AND sales_month = current_month;

  -- Get current rank
  SELECT * INTO current_rank
  FROM affiliate_current_rank
  WHERE user_id = p_user_id;

  -- Determine new step based on sales and config
  FOR config IN 
    SELECT * FROM stair_step_config 
    WHERE active = true 
    ORDER BY step_number DESC
  LOOP
    IF current_sales >= config.sales_quota THEN
      new_step := config.step_number;
      EXIT;
    END IF;
  END LOOP;

  -- Create or update current rank
  IF current_rank IS NULL THEN
    INSERT INTO affiliate_current_rank (user_id, current_step, qualification_count, last_qualified_at)
    VALUES (p_user_id, new_step, CASE WHEN new_step > 0 THEN 1 ELSE 0 END, CASE WHEN new_step > 0 THEN NOW() ELSE NULL END);
  ELSE
    -- If rank improved or maintained, increment qualification count
    IF new_step >= current_rank.current_step AND new_step > 0 THEN
      UPDATE affiliate_current_rank
      SET 
        current_step = new_step,
        qualification_count = CASE 
          WHEN new_step = current_rank.current_step THEN current_rank.qualification_count + 1
          ELSE 1  -- Reset count if moving to new level
        END,
        is_fixed = CASE 
          WHEN new_step = current_rank.current_step AND current_rank.qualification_count + 1 >= 3 THEN true
          ELSE current_rank.is_fixed
        END,
        last_qualified_at = NOW(),
        updated_at = NOW()
      WHERE user_id = p_user_id;
    END IF;
  END IF;

  -- Record in history
  INSERT INTO affiliate_rank_history (user_id, step_number, qualified_month, sales_volume, qualification_count)
  VALUES (
    p_user_id,
    new_step,
    current_month,
    current_sales,
    COALESCE(current_rank.qualification_count, 0) + 1
  )
  ON CONFLICT (user_id, qualified_month)
  DO UPDATE SET
    step_number = new_step,
    sales_volume = current_sales,
    updated_at = NOW();
END;
$$;

-- Function to handle monthly rank reversion
CREATE OR REPLACE FUNCTION public.process_monthly_rank_reversion()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rank_record RECORD;
BEGIN
  -- Revert all non-fixed ranks to 0
  FOR rank_record IN 
    SELECT user_id FROM affiliate_current_rank WHERE is_fixed = false
  LOOP
    UPDATE affiliate_current_rank
    SET 
      current_step = 0,
      qualification_count = 0,
      updated_at = NOW()
    WHERE user_id = rank_record.user_id;

    -- Record reversion in history
    UPDATE affiliate_rank_history
    SET reverted_at = NOW()
    WHERE user_id = rank_record.user_id 
      AND qualified_month = DATE_TRUNC('month', NOW() - INTERVAL '1 month');
  END LOOP;
END;
$$;

-- Update trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_stair_step_config_updated_at
  BEFORE UPDATE ON public.stair_step_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_affiliate_rank_history_updated_at
  BEFORE UPDATE ON public.affiliate_rank_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_affiliate_current_rank_updated_at
  BEFORE UPDATE ON public.affiliate_current_rank
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_affiliate_monthly_sales_updated_at
  BEFORE UPDATE ON public.affiliate_monthly_sales
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();