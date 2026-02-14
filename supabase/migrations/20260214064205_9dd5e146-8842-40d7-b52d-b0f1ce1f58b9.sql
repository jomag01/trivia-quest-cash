
-- Insert transfer fee settings into app_settings
INSERT INTO app_settings (key, value) VALUES 
  ('transfer_fee_type', 'percentage'),
  ('transfer_fee_value', '2'),
  ('transfer_fee_enabled', 'true'),
  ('transfer_min_amount', '10')
ON CONFLICT (key) DO NOTHING;

-- Update the transfer function to include fee calculation and reference code
CREATE OR REPLACE FUNCTION public.transfer_wallet_balance(
  p_sender_id UUID,
  p_recipient_username TEXT,
  p_amount NUMERIC,
  p_pin TEXT,
  p_note TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_wallet RECORD;
  v_recipient RECORD;
  v_recipient_wallet RECORD;
  v_sender_new_balance NUMERIC;
  v_recipient_new_balance NUMERIC;
  v_transfer_ref TEXT;
  v_fee_enabled BOOLEAN;
  v_fee_type TEXT;
  v_fee_value NUMERIC;
  v_fee_amount NUMERIC := 0;
  v_total_deduct NUMERIC;
BEGIN
  -- Validate caller
  IF auth.uid() IS NULL OR auth.uid() != p_sender_id THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Validate amount
  IF p_amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Amount must be greater than zero');
  END IF;

  IF p_amount < 1 THEN
    RETURN json_build_object('success', false, 'error', 'Minimum transfer amount is ₱1');
  END IF;

  -- Get fee settings
  SELECT COALESCE((SELECT value FROM app_settings WHERE key = 'transfer_fee_enabled'), 'false') = 'true' INTO v_fee_enabled;
  SELECT COALESCE((SELECT value FROM app_settings WHERE key = 'transfer_fee_type'), 'percentage') INTO v_fee_type;
  SELECT COALESCE((SELECT value FROM app_settings WHERE key = 'transfer_fee_value'), '0')::NUMERIC INTO v_fee_value;

  -- Calculate fee
  IF v_fee_enabled AND v_fee_value > 0 THEN
    IF v_fee_type = 'percentage' THEN
      v_fee_amount := ROUND(p_amount * v_fee_value / 100, 2);
    ELSE
      v_fee_amount := v_fee_value;
    END IF;
  END IF;

  v_total_deduct := p_amount + v_fee_amount;

  -- Generate human-readable reference code: TRF-YYYYMMDD-XXXXXX
  v_transfer_ref := 'TRF-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(md5(random()::text), 1, 6));

  -- Lock sender wallet
  SELECT * INTO v_sender_wallet FROM cash_wallets WHERE user_id = p_sender_id FOR UPDATE;
  
  IF v_sender_wallet IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Wallet not found');
  END IF;

  -- Check PIN
  IF v_sender_wallet.pin_hash IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Please set up a wallet PIN first');
  END IF;

  -- Check lock
  IF v_sender_wallet.locked_until IS NOT NULL AND v_sender_wallet.locked_until > now() THEN
    RETURN json_build_object('success', false, 'error', 'Wallet is temporarily locked due to too many failed attempts');
  END IF;

  -- Verify PIN
  IF v_sender_wallet.pin_hash != crypt(p_pin, v_sender_wallet.pin_hash) THEN
    UPDATE cash_wallets SET 
      pin_attempts = COALESCE(pin_attempts, 0) + 1,
      locked_until = CASE WHEN COALESCE(pin_attempts, 0) + 1 >= 5 THEN now() + interval '30 minutes' ELSE NULL END
    WHERE user_id = p_sender_id;
    
    RETURN json_build_object('success', false, 'error', 'Invalid PIN');
  END IF;

  -- Reset pin attempts on success
  UPDATE cash_wallets SET pin_attempts = 0, locked_until = NULL WHERE user_id = p_sender_id;

  -- Check balance (including fee)
  IF v_sender_wallet.balance < v_total_deduct THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient balance (amount + fee = ₱' || v_total_deduct::text || ')');
  END IF;

  -- Find recipient
  SELECT id, username, full_name INTO v_recipient 
  FROM profiles 
  WHERE (LOWER(username) = LOWER(p_recipient_username) OR LOWER(referral_code) = LOWER(p_recipient_username))
    AND id != p_sender_id
  LIMIT 1;

  IF v_recipient IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Recipient not found');
  END IF;

  -- Lock recipient wallet (create if needed)
  SELECT * INTO v_recipient_wallet FROM cash_wallets WHERE user_id = v_recipient.id FOR UPDATE;
  
  IF v_recipient_wallet IS NULL THEN
    INSERT INTO cash_wallets (user_id, balance) VALUES (v_recipient.id, 0)
    RETURNING * INTO v_recipient_wallet;
  END IF;

  -- Calculate new balances
  v_sender_new_balance := v_sender_wallet.balance - v_total_deduct;
  v_recipient_new_balance := v_recipient_wallet.balance + p_amount;

  -- Deduct from sender (amount + fee)
  UPDATE cash_wallets SET balance = v_sender_new_balance, updated_at = now() WHERE user_id = p_sender_id;

  -- Credit recipient (amount only, no fee)
  UPDATE cash_wallets SET balance = v_recipient_new_balance, updated_at = now() WHERE user_id = v_recipient.id;

  -- Log sender transaction
  INSERT INTO cash_transactions (user_id, amount, balance_before, balance_after, transaction_type, description, reference_id)
  VALUES (p_sender_id, -v_total_deduct, v_sender_wallet.balance, v_sender_new_balance, 'transfer_out',
    'Transfer ₱' || p_amount::text || ' to ' || COALESCE(v_recipient.full_name, v_recipient.username) 
    || ' (Fee: ₱' || v_fee_amount::text || ')' 
    || COALESCE(' - ' || p_note, '')
    || ' | Ref: ' || v_transfer_ref,
    v_transfer_ref);

  -- Log recipient transaction
  INSERT INTO cash_transactions (user_id, amount, balance_before, balance_after, transaction_type, description, reference_id)
  VALUES (v_recipient.id, p_amount, v_recipient_wallet.balance, v_recipient_new_balance, 'transfer_in',
    'Transfer from ' || (SELECT COALESCE(full_name, username) FROM profiles WHERE id = p_sender_id) 
    || COALESCE(' - ' || p_note, '')
    || ' | Ref: ' || v_transfer_ref,
    v_transfer_ref);

  -- Log fee transaction if applicable
  IF v_fee_amount > 0 THEN
    INSERT INTO cash_transactions (user_id, amount, balance_before, balance_after, transaction_type, description, reference_id)
    VALUES (p_sender_id, -v_fee_amount, v_sender_wallet.balance, v_sender_new_balance, 'transfer_fee',
      'Transfer fee for Ref: ' || v_transfer_ref,
      v_transfer_ref);
  END IF;

  RETURN json_build_object(
    'success', true, 
    'recipient_name', COALESCE(v_recipient.full_name, v_recipient.username),
    'amount', p_amount,
    'fee', v_fee_amount,
    'total_deducted', v_total_deduct,
    'new_balance', v_sender_new_balance,
    'reference_code', v_transfer_ref
  );
END;
$$;
