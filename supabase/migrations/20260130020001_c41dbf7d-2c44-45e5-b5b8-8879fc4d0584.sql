-- =====================================================
-- Security Fix: Server-side credit deduction function
-- Prevents client-side balance manipulation
-- =====================================================

-- Create a secure function to deduct credits with proper validation
CREATE OR REPLACE FUNCTION public.deduct_user_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_service_type TEXT DEFAULT 'general'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_current_credits INTEGER;
BEGIN
  -- Validate input
  IF p_user_id IS NULL OR p_amount IS NULL OR p_amount <= 0 THEN
    RETURN FALSE;
  END IF;
  
  -- Verify the caller is the user themselves
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Can only deduct own credits';
  END IF;
  
  -- Lock the row and check current balance
  SELECT credits INTO v_current_credits 
  FROM profiles 
  WHERE id = p_user_id 
  FOR UPDATE;
  
  -- Check if user exists
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check if sufficient balance
  IF v_current_credits < p_amount THEN
    RETURN FALSE;
  END IF;
  
  -- Deduct credits atomically
  UPDATE profiles 
  SET credits = credits - p_amount,
      updated_at = now()
  WHERE id = p_user_id;
  
  RETURN TRUE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.deduct_user_credits(UUID, INTEGER, TEXT) TO authenticated;