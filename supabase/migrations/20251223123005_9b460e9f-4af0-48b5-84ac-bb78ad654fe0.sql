-- Add pending_placement table for spillover decisions
CREATE TABLE IF NOT EXISTS public.binary_pending_placements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pending_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  purchase_id uuid REFERENCES public.binary_ai_purchases(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'placed', 'expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  placed_at timestamptz,
  chosen_leg public.binary_leg,
  UNIQUE(pending_user_id, status)
);

-- Enable RLS
ALTER TABLE public.binary_pending_placements ENABLE ROW LEVEL SECURITY;

-- Sponsors can see and manage their pending placements
CREATE POLICY "Sponsors can view their pending placements"
  ON public.binary_pending_placements FOR SELECT
  USING (sponsor_id = auth.uid());

CREATE POLICY "Sponsors can update their pending placements"
  ON public.binary_pending_placements FOR UPDATE
  USING (sponsor_id = auth.uid());

-- Create function to count direct referrals in binary network
CREATE OR REPLACE FUNCTION public.count_sponsor_direct_referrals(_sponsor_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.binary_network bn
  WHERE bn.sponsor_id = (
    SELECT id FROM public.binary_network WHERE user_id = _sponsor_user_id
  );
$$;

-- Update place_user_in_binary_network to handle spillover logic
CREATE OR REPLACE FUNCTION public.place_user_in_binary_network(
  _user_id uuid,
  _sponsor_user_id uuid,
  _chosen_leg public.binary_leg DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_id uuid;
  sponsor_net_id uuid;
  sponsor_left uuid;
  sponsor_right uuid;
  chosen_parent uuid;
  final_leg public.binary_leg;
  new_id uuid;
  spot record;
  direct_count integer;
BEGIN
  PERFORM set_config('row_security', 'off', true);

  -- Check if user already placed
  SELECT bn.id INTO existing_id FROM public.binary_network bn WHERE bn.user_id = _user_id;
  IF FOUND THEN RETURN existing_id; END IF;

  -- No sponsor = root node
  IF _sponsor_user_id IS NULL THEN
    INSERT INTO public.binary_network (user_id, sponsor_id, parent_id, placement_leg, joined_at)
    VALUES (_user_id, NULL, NULL, NULL, now()) RETURNING id INTO new_id;
    RETURN new_id;
  END IF;

  -- Get sponsor's network data
  SELECT bn.id, bn.left_child_id, bn.right_child_id INTO sponsor_net_id, sponsor_left, sponsor_right
  FROM public.binary_network bn WHERE bn.user_id = _sponsor_user_id;

  -- Sponsor not in network = create as root
  IF NOT FOUND THEN
    INSERT INTO public.binary_network (user_id, sponsor_id, parent_id, placement_leg, joined_at)
    VALUES (_user_id, NULL, NULL, NULL, now()) RETURNING id INTO new_id;
    RETURN new_id;
  END IF;

  -- Count how many direct referrals sponsor already has
  SELECT public.count_sponsor_direct_referrals(_sponsor_user_id) INTO direct_count;

  -- RULE: 1st referral goes LEFT
  IF direct_count = 0 AND sponsor_left IS NULL THEN
    chosen_parent := sponsor_net_id;
    final_leg := 'left';
  -- RULE: 2nd referral goes RIGHT
  ELSIF direct_count = 1 AND sponsor_right IS NULL THEN
    chosen_parent := sponsor_net_id;
    final_leg := 'right';
  -- RULE: 3rd+ referral - user must choose (spillover)
  ELSIF direct_count >= 2 THEN
    -- If no leg chosen, return NULL to signal pending placement
    IF _chosen_leg IS NULL THEN
      RETURN NULL;
    END IF;
    
    -- User chose a leg - find spot in that subtree
    IF _chosen_leg = 'left' THEN
      IF sponsor_left IS NULL THEN
        chosen_parent := sponsor_net_id;
        final_leg := 'left';
      ELSE
        SELECT bfls.parent_id, bfls.leg INTO spot FROM public.binary_find_leftmost_spot(sponsor_left) bfls LIMIT 1;
        IF FOUND THEN
          chosen_parent := spot.parent_id;
          final_leg := spot.leg;
        ELSE
          RETURN NULL;
        END IF;
      END IF;
    ELSE
      IF sponsor_right IS NULL THEN
        chosen_parent := sponsor_net_id;
        final_leg := 'right';
      ELSE
        SELECT bfls.parent_id, bfls.leg INTO spot FROM public.binary_find_leftmost_spot(sponsor_right) bfls LIMIT 1;
        IF FOUND THEN
          chosen_parent := spot.parent_id;
          final_leg := spot.leg;
        ELSE
          RETURN NULL;
        END IF;
      END IF;
    END IF;
  -- Fallback: auto-place in first available
  ELSIF sponsor_left IS NULL THEN
    chosen_parent := sponsor_net_id;
    final_leg := 'left';
  ELSIF sponsor_right IS NULL THEN
    chosen_parent := sponsor_net_id;
    final_leg := 'right';
  ELSE
    -- Both direct slots full, find leftmost spot
    SELECT bfls.parent_id, bfls.leg INTO spot FROM public.binary_find_leftmost_spot(sponsor_left) bfls LIMIT 1;
    IF FOUND THEN
      chosen_parent := spot.parent_id;
      final_leg := spot.leg;
    ELSE
      SELECT bfls.parent_id, bfls.leg INTO spot FROM public.binary_find_leftmost_spot(sponsor_right) bfls LIMIT 1;
      IF FOUND THEN
        chosen_parent := spot.parent_id;
        final_leg := spot.leg;
      ELSE
        chosen_parent := NULL;
        final_leg := NULL;
      END IF;
    END IF;
  END IF;

  -- Insert into binary network
  INSERT INTO public.binary_network (user_id, sponsor_id, parent_id, placement_leg, joined_at)
  VALUES (_user_id, sponsor_net_id, chosen_parent, final_leg, now()) RETURNING id INTO new_id;

  -- Link to parent
  IF chosen_parent IS NOT NULL AND final_leg IS NOT NULL THEN
    IF final_leg = 'left' THEN
      UPDATE public.binary_network SET left_child_id = new_id, updated_at = now() WHERE id = chosen_parent;
    ELSE
      UPDATE public.binary_network SET right_child_id = new_id, updated_at = now() WHERE id = chosen_parent;
    END IF;
  END IF;

  RETURN new_id;
END;
$$;

-- Update the trigger to handle pending placements
CREATE OR REPLACE FUNCTION public.handle_binary_ai_purchase_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  network_id uuid;
  sponsor_user_id uuid;
  direct_count integer;
BEGIN
  IF NEW.status = 'approved' AND NEW.binary_processed_at IS NULL THEN
    PERFORM set_config('row_security', 'off', true);

    -- Get sponsor user id
    IF NEW.sponsor_id IS NOT NULL THEN
      SELECT user_id INTO sponsor_user_id
      FROM public.binary_network
      WHERE id = NEW.sponsor_id;
    END IF;

    -- Count sponsor's direct referrals
    IF sponsor_user_id IS NOT NULL THEN
      SELECT public.count_sponsor_direct_referrals(sponsor_user_id) INTO direct_count;
    ELSE
      direct_count := 0;
    END IF;

    -- If 3rd+ referral, create pending placement instead of auto-placing
    IF direct_count >= 2 THEN
      -- Create pending placement for sponsor to decide
      INSERT INTO public.binary_pending_placements (sponsor_id, pending_user_id, purchase_id, status)
      VALUES (sponsor_user_id, NEW.user_id, NEW.id, 'pending')
      ON CONFLICT (pending_user_id, status) DO NOTHING;
      
      -- Mark as processed (pending user decision)
      UPDATE public.binary_ai_purchases
      SET binary_processed_at = now()
      WHERE id = NEW.id;
    ELSE
      -- Auto-place (1st or 2nd referral)
      network_id := public.place_user_in_binary_network(NEW.user_id, sponsor_user_id, NULL);

      IF network_id IS NOT NULL THEN
        PERFORM public.binary_apply_purchase_volume(NEW.user_id, NEW.amount);
      END IF;

      UPDATE public.binary_ai_purchases
      SET binary_processed_at = now()
      WHERE id = NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Function to place pending user (called when sponsor chooses leg)
CREATE OR REPLACE FUNCTION public.place_pending_binary_user(
  _pending_id uuid,
  _chosen_leg public.binary_leg
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pending_rec record;
  network_id uuid;
  sponsor_user_id uuid;
BEGIN
  PERFORM set_config('row_security', 'off', true);

  -- Get pending placement
  SELECT * INTO pending_rec
  FROM public.binary_pending_placements
  WHERE id = _pending_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending placement not found or already processed';
  END IF;

  -- Place the user with chosen leg
  network_id := public.place_user_in_binary_network(pending_rec.pending_user_id, pending_rec.sponsor_id, _chosen_leg);

  IF network_id IS NOT NULL THEN
    -- Apply volume
    PERFORM public.binary_apply_purchase_volume(
      pending_rec.pending_user_id,
      (SELECT amount FROM public.binary_ai_purchases WHERE id = pending_rec.purchase_id)
    );

    -- Mark as placed
    UPDATE public.binary_pending_placements
    SET status = 'placed', placed_at = now(), chosen_leg = _chosen_leg
    WHERE id = _pending_id;

    RETURN network_id;
  ELSE
    RAISE EXCEPTION 'Failed to place user in binary network';
  END IF;
END;
$$;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_binary_pending_placements_sponsor 
  ON public.binary_pending_placements(sponsor_id, status);
CREATE INDEX IF NOT EXISTS idx_binary_pending_placements_pending_user 
  ON public.binary_pending_placements(pending_user_id, status);