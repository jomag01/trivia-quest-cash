-- FIX: binary network RLS recursion + approved AI purchases placement + commissions
-- Fixed: date = text comparison by casting earning_date properly

-- 1) Remove the recursive policy causing infinite recursion
DROP POLICY IF EXISTS "Users can view their downline" ON public.binary_network;

-- 2) Replace can_view_binary_network with non-recursive SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.can_view_binary_network(_requester uuid, _node_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  cur_user uuid;
  cur_parent uuid;
  walk_id uuid;
BEGIN
  PERFORM set_config('row_security', 'off', true);

  SELECT bn.user_id, bn.parent_id INTO cur_user, cur_parent
  FROM public.binary_network bn WHERE bn.id = _node_id;

  IF NOT FOUND THEN RETURN false; END IF;
  IF cur_user = _requester THEN RETURN true; END IF;

  walk_id := cur_parent;
  WHILE walk_id IS NOT NULL LOOP
    SELECT bn.user_id, bn.parent_id INTO cur_user, cur_parent
    FROM public.binary_network bn WHERE bn.id = walk_id;
    EXIT WHEN NOT FOUND;
    IF cur_user = _requester THEN RETURN true; END IF;
    walk_id := cur_parent;
  END LOOP;

  RETURN false;
END;
$$;

-- 3) Mark approved purchases as processed once
ALTER TABLE public.binary_ai_purchases
ADD COLUMN IF NOT EXISTS binary_processed_at timestamptz NULL;

-- 4) Helper: find leftmost empty spot
CREATE OR REPLACE FUNCTION public.binary_find_leftmost_spot(_network_id uuid)
RETURNS TABLE(parent_id uuid, leg public.binary_leg)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  l uuid; r uuid;
BEGIN
  PERFORM set_config('row_security', 'off', true);
  SELECT bn.left_child_id, bn.right_child_id INTO l, r
  FROM public.binary_network bn WHERE bn.id = _network_id;
  IF NOT FOUND THEN RETURN; END IF;

  IF l IS NULL THEN
    parent_id := _network_id; leg := 'left'; RETURN NEXT; RETURN;
  END IF;

  RETURN QUERY SELECT * FROM public.binary_find_leftmost_spot(l);
  IF FOUND THEN RETURN; END IF;

  IF r IS NULL THEN
    parent_id := _network_id; leg := 'right'; RETURN NEXT; RETURN;
  END IF;

  RETURN QUERY SELECT * FROM public.binary_find_leftmost_spot(r);
END;
$$;

-- 5) Place user into binary network under sponsor
CREATE OR REPLACE FUNCTION public.place_user_in_binary_network(_user_id uuid, _sponsor_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  existing_id uuid;
  sponsor_net_id uuid;
  sponsor_left uuid;
  sponsor_right uuid;
  chosen_parent uuid;
  chosen_leg public.binary_leg;
  new_id uuid;
  spot record;
BEGIN
  PERFORM set_config('row_security', 'off', true);

  SELECT bn.id INTO existing_id FROM public.binary_network bn WHERE bn.user_id = _user_id;
  IF FOUND THEN RETURN existing_id; END IF;

  IF _sponsor_user_id IS NULL THEN
    INSERT INTO public.binary_network (user_id, sponsor_id, parent_id, placement_leg, joined_at)
    VALUES (_user_id, NULL, NULL, NULL, now()) RETURNING id INTO new_id;
    RETURN new_id;
  END IF;

  SELECT bn.id, bn.left_child_id, bn.right_child_id INTO sponsor_net_id, sponsor_left, sponsor_right
  FROM public.binary_network bn WHERE bn.user_id = _sponsor_user_id;

  IF NOT FOUND THEN
    INSERT INTO public.binary_network (user_id, sponsor_id, parent_id, placement_leg, joined_at)
    VALUES (_user_id, NULL, NULL, NULL, now()) RETURNING id INTO new_id;
    RETURN new_id;
  END IF;

  IF sponsor_left IS NULL THEN
    chosen_parent := sponsor_net_id; chosen_leg := 'left';
  ELSIF sponsor_right IS NULL THEN
    chosen_parent := sponsor_net_id; chosen_leg := 'right';
  ELSE
    SELECT bfls.parent_id, bfls.leg INTO spot FROM public.binary_find_leftmost_spot(sponsor_left) bfls LIMIT 1;
    IF FOUND THEN
      chosen_parent := spot.parent_id; chosen_leg := spot.leg;
    ELSE
      SELECT bfls.parent_id, bfls.leg INTO spot FROM public.binary_find_leftmost_spot(sponsor_right) bfls LIMIT 1;
      IF FOUND THEN
        chosen_parent := spot.parent_id; chosen_leg := spot.leg;
      ELSE
        chosen_parent := NULL; chosen_leg := NULL;
      END IF;
    END IF;
  END IF;

  INSERT INTO public.binary_network (user_id, sponsor_id, parent_id, placement_leg, joined_at)
  VALUES (_user_id, sponsor_net_id, chosen_parent, chosen_leg, now()) RETURNING id INTO new_id;

  IF chosen_parent IS NOT NULL AND chosen_leg IS NOT NULL THEN
    IF chosen_leg = 'left' THEN
      UPDATE public.binary_network SET left_child_id = new_id, updated_at = now() WHERE id = chosen_parent;
    ELSE
      UPDATE public.binary_network SET right_child_id = new_id, updated_at = now() WHERE id = chosen_parent;
    END IF;
  END IF;

  RETURN new_id;
END;
$$;

-- 6) Apply purchase volume up tree and create commissions
CREATE OR REPLACE FUNCTION public.binary_apply_purchase_volume(_buyer_user_id uuid, _amount numeric)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_buyer_node_id uuid;
  v_child_node_id uuid;
  v_parent_node_id uuid;
  v_parent_user_id uuid;
  v_parent_parent_id uuid;
  v_left_child_id uuid;
  v_left_volume numeric;
  v_right_volume numeric;

  v_leg text;
  v_cycle_volume numeric;
  v_cycle_commission numeric;
  v_daily_cap numeric;

  v_earning_date date;
  v_daily_id uuid;
  v_daily_total numeric;

  v_possible_cycles integer;
  v_allowed_cycles integer;
  v_cycles_matched integer;
  v_used_volume numeric;
  v_commission_amount numeric;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN RETURN; END IF;

  PERFORM set_config('row_security', 'off', true);

  SELECT bn.id, bn.parent_id INTO v_buyer_node_id, v_parent_node_id
  FROM public.binary_network bn WHERE bn.user_id = _buyer_user_id;
  IF NOT FOUND THEN RETURN; END IF;

  v_child_node_id := v_buyer_node_id;

  SELECT COALESCE((SELECT value::numeric FROM public.app_settings WHERE key = 'binary_cycle_volume'), 1000) INTO v_cycle_volume;
  SELECT COALESCE((SELECT value::numeric FROM public.app_settings WHERE key = 'binary_cycle_commission'), 100) INTO v_cycle_commission;
  SELECT COALESCE((SELECT value::numeric FROM public.app_settings WHERE key = 'binary_daily_cap'), 0) INTO v_daily_cap;

  v_earning_date := (now() AT TIME ZONE 'UTC')::date;

  WHILE v_parent_node_id IS NOT NULL LOOP
    SELECT bn.user_id, bn.parent_id, bn.left_child_id, COALESCE(bn.left_volume, 0), COALESCE(bn.right_volume, 0)
      INTO v_parent_user_id, v_parent_parent_id, v_left_child_id, v_left_volume, v_right_volume
    FROM public.binary_network bn WHERE bn.id = v_parent_node_id;
    EXIT WHEN NOT FOUND;

    v_leg := CASE WHEN v_left_child_id = v_child_node_id THEN 'left' ELSE 'right' END;

    IF v_leg = 'left' THEN v_left_volume := v_left_volume + _amount;
    ELSE v_right_volume := v_right_volume + _amount;
    END IF;

    UPDATE public.binary_network SET left_volume = v_left_volume, right_volume = v_right_volume, updated_at = now()
    WHERE id = v_parent_node_id;

    IF v_cycle_volume > 0 AND v_cycle_commission > 0 THEN
      v_possible_cycles := floor(LEAST(v_left_volume, v_right_volume) / v_cycle_volume);
      v_allowed_cycles := v_possible_cycles;

      IF v_daily_cap > 0 THEN
        SELECT bde.id, COALESCE(bde.total_earned, 0) INTO v_daily_id, v_daily_total
        FROM public.binary_daily_earnings bde
        WHERE bde.user_id = v_parent_user_id AND bde.earning_date = v_earning_date;
        v_allowed_cycles := floor(GREATEST(0, (v_daily_cap - COALESCE(v_daily_total, 0))) / v_cycle_commission);
      END IF;

      v_cycles_matched := LEAST(v_possible_cycles, v_allowed_cycles);

      IF v_cycles_matched > 0 THEN
        v_used_volume := v_cycles_matched * v_cycle_volume;
        v_commission_amount := v_cycles_matched * v_cycle_commission;

        UPDATE public.binary_network
        SET left_volume = GREATEST(0, left_volume - v_used_volume),
            right_volume = GREATEST(0, right_volume - v_used_volume),
            total_cycles = COALESCE(total_cycles, 0) + v_cycles_matched,
            updated_at = now()
        WHERE id = v_parent_node_id;

        INSERT INTO public.binary_commissions (user_id, amount, cycles_matched, left_volume_used, right_volume_used, created_at)
        VALUES (v_parent_user_id, v_commission_amount, v_cycles_matched, v_used_volume, v_used_volume, now());

        SELECT bde.id INTO v_daily_id FROM public.binary_daily_earnings bde
        WHERE bde.user_id = v_parent_user_id AND bde.earning_date = v_earning_date;

        IF FOUND THEN
          UPDATE public.binary_daily_earnings
          SET total_earned = COALESCE(total_earned, 0) + v_commission_amount,
              cycles_completed = COALESCE(cycles_completed, 0) + v_cycles_matched, updated_at = now()
          WHERE id = v_daily_id;
        ELSE
          INSERT INTO public.binary_daily_earnings (user_id, earning_date, total_earned, cycles_completed, created_at, updated_at)
          VALUES (v_parent_user_id, v_earning_date, v_commission_amount, v_cycles_matched, now(), now());
        END IF;

        SELECT COALESCE(bn.left_volume, 0), COALESCE(bn.right_volume, 0) INTO v_left_volume, v_right_volume
        FROM public.binary_network bn WHERE bn.id = v_parent_node_id;
      END IF;
    END IF;

    v_child_node_id := v_parent_node_id;
    v_parent_node_id := v_parent_parent_id;
  END LOOP;
END;
$$;

-- 7) Trigger: when purchase approved, place user + apply volume once
CREATE OR REPLACE FUNCTION public.handle_binary_ai_purchase_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM set_config('row_security', 'off', true);

  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    IF NEW.binary_processed_at IS NOT NULL THEN RETURN NEW; END IF;

    PERFORM public.place_user_in_binary_network(NEW.user_id, NEW.sponsor_id);
    PERFORM public.binary_apply_purchase_volume(NEW.user_id, NEW.amount);

    UPDATE public.binary_ai_purchases SET binary_processed_at = now()
    WHERE id = NEW.id AND binary_processed_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_binary_ai_purchases_approved ON public.binary_ai_purchases;
CREATE TRIGGER trg_binary_ai_purchases_approved
AFTER UPDATE OF status ON public.binary_ai_purchases
FOR EACH ROW
WHEN (NEW.status = 'approved' AND OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.handle_binary_ai_purchase_approved();

-- 8) Backfill already-approved purchases
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id, user_id, sponsor_id, amount FROM public.binary_ai_purchases WHERE status = 'approved' AND binary_processed_at IS NULL
  LOOP
    PERFORM public.place_user_in_binary_network(r.user_id, r.sponsor_id);
    PERFORM public.binary_apply_purchase_volume(r.user_id, r.amount);
    UPDATE public.binary_ai_purchases SET binary_processed_at = now() WHERE id = r.id AND binary_processed_at IS NULL;
  END LOOP;
END;
$$;