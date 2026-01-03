-- Create a function to handle diamond-to-credit conversions with proper security
CREATE OR REPLACE FUNCTION public.convert_diamonds_to_credits(
  p_user_id UUID,
  p_diamond_amount INTEGER,
  p_credits_to_receive INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_diamonds INTEGER;
  v_current_credits INTEGER;
  v_new_diamonds INTEGER;
  v_new_credits INTEGER;
BEGIN
  -- Verify the user is authenticated and is the owner
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Get current diamond balance with lock
  SELECT diamonds INTO v_current_diamonds
  FROM treasure_wallet
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_current_diamonds IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
  END IF;

  IF v_current_diamonds < p_diamond_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient diamonds');
  END IF;

  -- Get current credits with lock
  SELECT credits INTO v_current_credits
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_current_credits IS NULL THEN
    v_current_credits := 0;
  END IF;

  -- Calculate new values
  v_new_diamonds := v_current_diamonds - p_diamond_amount;
  v_new_credits := v_current_credits + p_credits_to_receive;

  -- Update diamonds
  UPDATE treasure_wallet
  SET diamonds = v_new_diamonds, updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Update credits
  UPDATE profiles
  SET credits = v_new_credits
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true, 
    'new_diamonds', v_new_diamonds, 
    'new_credits', v_new_credits
  );
END;
$$;

-- Create function for credit-to-diamond conversions
CREATE OR REPLACE FUNCTION public.convert_credits_to_diamonds(
  p_user_id UUID,
  p_credit_amount INTEGER,
  p_diamonds_to_receive INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_credits INTEGER;
  v_current_diamonds INTEGER;
  v_new_credits INTEGER;
  v_new_diamonds INTEGER;
BEGIN
  -- Verify the user is authenticated and is the owner
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Get current credits with lock
  SELECT credits INTO v_current_credits
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_current_credits IS NULL THEN
    v_current_credits := 0;
  END IF;

  IF v_current_credits < p_credit_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient credits');
  END IF;

  -- Get or create wallet
  SELECT diamonds INTO v_current_diamonds
  FROM treasure_wallet
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_current_diamonds IS NULL THEN
    INSERT INTO treasure_wallet (user_id, diamonds) VALUES (p_user_id, 0);
    v_current_diamonds := 0;
  END IF;

  -- Calculate new values
  v_new_credits := v_current_credits - p_credit_amount;
  v_new_diamonds := v_current_diamonds + p_diamonds_to_receive;

  -- Update credits
  UPDATE profiles
  SET credits = v_new_credits
  WHERE id = p_user_id;

  -- Update diamonds
  UPDATE treasure_wallet
  SET diamonds = v_new_diamonds, updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'success', true, 
    'new_credits', v_new_credits, 
    'new_diamonds', v_new_diamonds
  );
END;
$$;

-- Create function for cash-to-diamond conversions
CREATE OR REPLACE FUNCTION public.convert_cash_to_diamonds(
  p_user_id UUID,
  p_cash_amount NUMERIC,
  p_diamonds_to_receive INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_cash NUMERIC;
  v_current_diamonds INTEGER;
  v_new_cash NUMERIC;
  v_new_diamonds INTEGER;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT balance INTO v_current_cash
  FROM cash_wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_current_cash IS NULL OR v_current_cash < p_cash_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient cash');
  END IF;

  SELECT diamonds INTO v_current_diamonds
  FROM treasure_wallet
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_current_diamonds IS NULL THEN
    INSERT INTO treasure_wallet (user_id, diamonds) VALUES (p_user_id, 0);
    v_current_diamonds := 0;
  END IF;

  v_new_cash := v_current_cash - p_cash_amount;
  v_new_diamonds := v_current_diamonds + p_diamonds_to_receive;

  UPDATE cash_wallets SET balance = v_new_cash, updated_at = NOW() WHERE user_id = p_user_id;
  UPDATE treasure_wallet SET diamonds = v_new_diamonds, updated_at = NOW() WHERE user_id = p_user_id;

  RETURN jsonb_build_object('success', true, 'new_cash', v_new_cash, 'new_diamonds', v_new_diamonds);
END;
$$;

-- Create function for cash-to-credit conversions
CREATE OR REPLACE FUNCTION public.convert_cash_to_credits(
  p_user_id UUID,
  p_cash_amount NUMERIC,
  p_credits_to_receive INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_cash NUMERIC;
  v_current_credits INTEGER;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT balance INTO v_current_cash FROM cash_wallets WHERE user_id = p_user_id FOR UPDATE;
  IF v_current_cash IS NULL OR v_current_cash < p_cash_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient cash');
  END IF;

  SELECT credits INTO v_current_credits FROM profiles WHERE id = p_user_id FOR UPDATE;
  IF v_current_credits IS NULL THEN v_current_credits := 0; END IF;

  UPDATE cash_wallets SET balance = v_current_cash - p_cash_amount, updated_at = NOW() WHERE user_id = p_user_id;
  UPDATE profiles SET credits = v_current_credits + p_credits_to_receive WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true, 'new_cash', v_current_cash - p_cash_amount, 'new_credits', v_current_credits + p_credits_to_receive);
END;
$$;

-- Create function for diamond-to-cash conversions
CREATE OR REPLACE FUNCTION public.convert_diamonds_to_cash(
  p_user_id UUID,
  p_diamond_amount INTEGER,
  p_cash_to_receive NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_diamonds INTEGER;
  v_current_cash NUMERIC;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT diamonds INTO v_current_diamonds FROM treasure_wallet WHERE user_id = p_user_id FOR UPDATE;
  IF v_current_diamonds IS NULL OR v_current_diamonds < p_diamond_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient diamonds');
  END IF;

  SELECT balance INTO v_current_cash FROM cash_wallets WHERE user_id = p_user_id FOR UPDATE;
  IF v_current_cash IS NULL THEN
    INSERT INTO cash_wallets (user_id, balance) VALUES (p_user_id, 0);
    v_current_cash := 0;
  END IF;

  UPDATE treasure_wallet SET diamonds = v_current_diamonds - p_diamond_amount, updated_at = NOW() WHERE user_id = p_user_id;
  UPDATE cash_wallets SET balance = v_current_cash + p_cash_to_receive, updated_at = NOW() WHERE user_id = p_user_id;

  RETURN jsonb_build_object('success', true, 'new_diamonds', v_current_diamonds - p_diamond_amount, 'new_cash', v_current_cash + p_cash_to_receive);
END;
$$;

-- Create function for credit-to-cash conversions
CREATE OR REPLACE FUNCTION public.convert_credits_to_cash(
  p_user_id UUID,
  p_credit_amount INTEGER,
  p_cash_to_receive NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_credits INTEGER;
  v_current_cash NUMERIC;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT credits INTO v_current_credits FROM profiles WHERE id = p_user_id FOR UPDATE;
  IF v_current_credits IS NULL OR v_current_credits < p_credit_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient credits');
  END IF;

  SELECT balance INTO v_current_cash FROM cash_wallets WHERE user_id = p_user_id FOR UPDATE;
  IF v_current_cash IS NULL THEN
    INSERT INTO cash_wallets (user_id, balance) VALUES (p_user_id, 0);
    v_current_cash := 0;
  END IF;

  UPDATE profiles SET credits = v_current_credits - p_credit_amount WHERE id = p_user_id;
  UPDATE cash_wallets SET balance = v_current_cash + p_cash_to_receive, updated_at = NOW() WHERE user_id = p_user_id;

  RETURN jsonb_build_object('success', true, 'new_credits', v_current_credits - p_credit_amount, 'new_cash', v_current_cash + p_cash_to_receive);
END;
$$;

-- Create function for AI credit-to-cash conversions
CREATE OR REPLACE FUNCTION public.convert_ai_credits_to_cash(
  p_user_id UUID,
  p_ai_credit_amount INTEGER,
  p_cash_to_receive NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_ai_credits INTEGER;
  v_current_cash NUMERIC;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT total_credits INTO v_current_ai_credits FROM user_ai_credits WHERE user_id = p_user_id FOR UPDATE;
  IF v_current_ai_credits IS NULL OR v_current_ai_credits < p_ai_credit_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient AI credits');
  END IF;

  SELECT balance INTO v_current_cash FROM cash_wallets WHERE user_id = p_user_id FOR UPDATE;
  IF v_current_cash IS NULL THEN
    INSERT INTO cash_wallets (user_id, balance) VALUES (p_user_id, 0);
    v_current_cash := 0;
  END IF;

  UPDATE user_ai_credits SET total_credits = v_current_ai_credits - p_ai_credit_amount WHERE user_id = p_user_id;
  UPDATE cash_wallets SET balance = v_current_cash + p_cash_to_receive, updated_at = NOW() WHERE user_id = p_user_id;

  RETURN jsonb_build_object('success', true, 'new_ai_credits', v_current_ai_credits - p_ai_credit_amount, 'new_cash', v_current_cash + p_cash_to_receive);
END;
$$;

-- Create function for AI credit-to-diamond conversions
CREATE OR REPLACE FUNCTION public.convert_ai_credits_to_diamonds(
  p_user_id UUID,
  p_ai_credit_amount INTEGER,
  p_diamonds_to_receive INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_ai_credits INTEGER;
  v_current_diamonds INTEGER;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT total_credits INTO v_current_ai_credits FROM user_ai_credits WHERE user_id = p_user_id FOR UPDATE;
  IF v_current_ai_credits IS NULL OR v_current_ai_credits < p_ai_credit_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient AI credits');
  END IF;

  SELECT diamonds INTO v_current_diamonds FROM treasure_wallet WHERE user_id = p_user_id FOR UPDATE;
  IF v_current_diamonds IS NULL THEN
    INSERT INTO treasure_wallet (user_id, diamonds) VALUES (p_user_id, 0);
    v_current_diamonds := 0;
  END IF;

  UPDATE user_ai_credits SET total_credits = v_current_ai_credits - p_ai_credit_amount WHERE user_id = p_user_id;
  UPDATE treasure_wallet SET diamonds = v_current_diamonds + p_diamonds_to_receive, updated_at = NOW() WHERE user_id = p_user_id;

  RETURN jsonb_build_object('success', true, 'new_ai_credits', v_current_ai_credits - p_ai_credit_amount, 'new_diamonds', v_current_diamonds + p_diamonds_to_receive);
END;
$$;

-- Create function for AI credit-to-game credit conversions
CREATE OR REPLACE FUNCTION public.convert_ai_credits_to_game_credits(
  p_user_id UUID,
  p_ai_credit_amount INTEGER,
  p_game_credits_to_receive INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_ai_credits INTEGER;
  v_current_credits INTEGER;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT total_credits INTO v_current_ai_credits FROM user_ai_credits WHERE user_id = p_user_id FOR UPDATE;
  IF v_current_ai_credits IS NULL OR v_current_ai_credits < p_ai_credit_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient AI credits');
  END IF;

  SELECT credits INTO v_current_credits FROM profiles WHERE id = p_user_id FOR UPDATE;
  IF v_current_credits IS NULL THEN v_current_credits := 0; END IF;

  UPDATE user_ai_credits SET total_credits = v_current_ai_credits - p_ai_credit_amount WHERE user_id = p_user_id;
  UPDATE profiles SET credits = v_current_credits + p_game_credits_to_receive WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true, 'new_ai_credits', v_current_ai_credits - p_ai_credit_amount, 'new_credits', v_current_credits + p_game_credits_to_receive);
END;
$$;