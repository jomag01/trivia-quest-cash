-- Fix foreign key constraints to allow user deletion
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;
ALTER TABLE orders ADD CONSTRAINT orders_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create upline transfer requests table
CREATE TABLE IF NOT EXISTS upline_transfer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_upline_id UUID REFERENCES profiles(id),
  requested_upline_id UUID NOT NULL REFERENCES profiles(id),
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  processed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ,
  CONSTRAINT no_self_transfer CHECK (user_id != requested_upline_id)
);

-- Enable RLS on transfer requests
ALTER TABLE upline_transfer_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view own transfer requests"
ON upline_transfer_requests FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can create transfer requests
CREATE POLICY "Users can create transfer requests"
ON upline_transfer_requests FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Admins can view all requests
CREATE POLICY "Admins can view all transfer requests"
ON upline_transfer_requests FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update requests
CREATE POLICY "Admins can update transfer requests"
ON upline_transfer_requests FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Function to process upline transfer
CREATE OR REPLACE FUNCTION process_upline_transfer(
  p_request_id UUID,
  p_admin_id UUID,
  p_approve BOOLEAN,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_new_upline_id UUID;
  v_old_upline_id UUID;
BEGIN
  -- Check if admin
  IF NOT public.has_role(p_admin_id, 'admin') THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Get request details
  SELECT user_id, requested_upline_id, current_upline_id
  INTO v_user_id, v_new_upline_id, v_old_upline_id
  FROM upline_transfer_requests
  WHERE id = p_request_id AND status = 'pending';

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Request not found or already processed');
  END IF;

  -- Update request status
  UPDATE upline_transfer_requests
  SET status = CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
      processed_by = p_admin_id,
      processed_at = now(),
      admin_notes = p_admin_notes
  WHERE id = p_request_id;

  -- If approved, process the transfer
  IF p_approve THEN
    -- Update user's upline
    UPDATE profiles
    SET referred_by = v_new_upline_id
    WHERE id = v_user_id;

    -- Reset user's affiliate rank
    DELETE FROM affiliate_current_rank WHERE user_id = v_user_id;
    INSERT INTO affiliate_current_rank (user_id, current_step, qualification_count)
    VALUES (v_user_id, 1, 0);

    -- Archive old rank history
    UPDATE affiliate_rank_history
    SET reverted_at = now()
    WHERE user_id = v_user_id AND reverted_at IS NULL;

    -- Reset monthly sales
    DELETE FROM affiliate_monthly_sales WHERE user_id = v_user_id;

    -- Forfeit wallet balance and commissions
    UPDATE user_wallets
    SET balance = 0,
        pending_commissions = 0,
        total_commissions = 0
    WHERE user_id = v_user_id;

    -- Archive commissions
    UPDATE commissions
    SET notes = COALESCE(notes || ' ', '') || '[Forfeited due to upline transfer]'
    WHERE user_id = v_user_id;

    -- Create notification for user
    INSERT INTO notifications (user_id, type, title, message)
    VALUES (
      v_user_id,
      'upline_transfer',
      'Upline Transfer Approved',
      'Your request to transfer uplines has been approved. Your progress has been reset.'
    );
  ELSE
    -- Create notification for rejection
    INSERT INTO notifications (user_id, type, title, message)
    VALUES (
      v_user_id,
      'upline_transfer',
      'Upline Transfer Rejected',
      COALESCE('Your upline transfer request was rejected. ' || p_admin_notes, 'Your upline transfer request was rejected.')
    );
  END IF;

  RETURN json_build_object('success', true);
END;
$$;