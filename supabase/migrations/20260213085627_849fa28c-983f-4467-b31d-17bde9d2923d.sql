
-- Secure atomic wallet transfer function
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
  v_transfer_ref UUID;
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
    -- Increment attempts
    UPDATE cash_wallets SET 
      pin_attempts = COALESCE(pin_attempts, 0) + 1,
      locked_until = CASE WHEN COALESCE(pin_attempts, 0) + 1 >= 5 THEN now() + interval '30 minutes' ELSE NULL END
    WHERE user_id = p_sender_id;
    
    RETURN json_build_object('success', false, 'error', 'Invalid PIN');
  END IF;

  -- Reset pin attempts on success
  UPDATE cash_wallets SET pin_attempts = 0, locked_until = NULL WHERE user_id = p_sender_id;

  -- Check balance
  IF v_sender_wallet.balance < p_amount THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- Find recipient by username or referral_code
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
  v_sender_new_balance := v_sender_wallet.balance - p_amount;
  v_recipient_new_balance := v_recipient_wallet.balance + p_amount;
  v_transfer_ref := gen_random_uuid();

  -- Deduct from sender
  UPDATE cash_wallets SET balance = v_sender_new_balance, updated_at = now() WHERE user_id = p_sender_id;

  -- Credit recipient
  UPDATE cash_wallets SET balance = v_recipient_new_balance, updated_at = now() WHERE user_id = v_recipient.id;

  -- Log sender transaction
  INSERT INTO cash_transactions (user_id, amount, balance_before, balance_after, transaction_type, description, reference_id)
  VALUES (p_sender_id, -p_amount, v_sender_wallet.balance, v_sender_new_balance, 'transfer_out',
    'Transfer to ' || COALESCE(v_recipient.full_name, v_recipient.username) || COALESCE(' - ' || p_note, ''),
    v_transfer_ref::text);

  -- Log recipient transaction
  INSERT INTO cash_transactions (user_id, amount, balance_before, balance_after, transaction_type, description, reference_id)
  VALUES (v_recipient.id, p_amount, v_recipient_wallet.balance, v_recipient_new_balance, 'transfer_in',
    'Transfer from ' || (SELECT COALESCE(full_name, username) FROM profiles WHERE id = p_sender_id) || COALESCE(' - ' || p_note, ''),
    v_transfer_ref::text);

  RETURN json_build_object(
    'success', true, 
    'recipient_name', COALESCE(v_recipient.full_name, v_recipient.username),
    'amount', p_amount,
    'new_balance', v_sender_new_balance
  );
END;
$$;
