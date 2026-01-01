-- Deep fix: (1) add missing FK so relationship delivery_riders -> profiles exists
-- and (2) allow approved riders to see/claim ready food orders safely.

-- 1) Foreign keys for PostgREST relationship discovery
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'delivery_riders_user_id_fkey'
  ) THEN
    ALTER TABLE public.delivery_riders
      ADD CONSTRAINT delivery_riders_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES public.profiles(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'food_orders_rider_id_fkey'
  ) THEN
    ALTER TABLE public.food_orders
      ADD CONSTRAINT food_orders_rider_id_fkey
      FOREIGN KEY (rider_id)
      REFERENCES public.delivery_riders(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- 2) Prevent duplicate assignments (race condition hardening)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'delivery_assignments_order_id_key'
  ) THEN
    ALTER TABLE public.delivery_assignments
      ADD CONSTRAINT delivery_assignments_order_id_key UNIQUE (order_id);
  END IF;
END $$;

-- 3) RLS: Riders must be able to SELECT available orders + UPDATE when assigned/claiming
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename='food_orders'
      AND policyname='Riders can view available + assigned orders'
  ) THEN
    CREATE POLICY "Riders can view available + assigned orders"
    ON public.food_orders
    FOR SELECT
    TO authenticated
    USING (
      -- Assigned to this rider
      EXISTS (
        SELECT 1
        FROM public.delivery_riders dr
        WHERE dr.id = food_orders.rider_id
          AND dr.user_id = auth.uid()
      )
      OR
      -- Available for pickup (visible to approved+available riders)
      (
        food_orders.rider_id IS NULL
        AND food_orders.status IN ('ready', 'ready_for_pickup')
        AND EXISTS (
          SELECT 1
          FROM public.delivery_riders dr
          WHERE dr.user_id = auth.uid()
            AND dr.status = 'approved'
            AND COALESCE(dr.is_available, false) = true
            AND (dr.city_id IS NULL OR food_orders.city_id IS NULL OR dr.city_id = food_orders.city_id)
        )
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename='food_orders'
      AND policyname='Riders can claim + update their orders'
  ) THEN
    CREATE POLICY "Riders can claim + update their orders"
    ON public.food_orders
    FOR UPDATE
    TO authenticated
    USING (
      -- Claiming a ready order
      (
        food_orders.rider_id IS NULL
        AND food_orders.status IN ('ready', 'ready_for_pickup')
        AND EXISTS (
          SELECT 1
          FROM public.delivery_riders dr
          WHERE dr.user_id = auth.uid()
            AND dr.status = 'approved'
            AND COALESCE(dr.is_available, false) = true
            AND (dr.city_id IS NULL OR food_orders.city_id IS NULL OR dr.city_id = food_orders.city_id)
        )
      )
      OR
      -- Updating an already-assigned order
      EXISTS (
        SELECT 1
        FROM public.delivery_riders dr
        WHERE dr.id = food_orders.rider_id
          AND dr.user_id = auth.uid()
      )
    )
    WITH CHECK (
      -- Any UPDATE done by a rider must keep the order assigned to themselves
      EXISTS (
        SELECT 1
        FROM public.delivery_riders dr
        WHERE dr.id = food_orders.rider_id
          AND dr.user_id = auth.uid()
      )
    );
  END IF;
END $$;

-- 4) RLS: Replace unsafe "Insert assignments" with a rider-scoped insert policy
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename='delivery_assignments'
      AND policyname='Insert assignments'
  ) THEN
    DROP POLICY "Insert assignments" ON public.delivery_assignments;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename='delivery_assignments'
      AND policyname='Riders can create assignment for claimed order'
  ) THEN
    CREATE POLICY "Riders can create assignment for claimed order"
    ON public.delivery_assignments
    FOR INSERT
    TO authenticated
    WITH CHECK (
      -- assignment must belong to the authenticated rider
      EXISTS (
        SELECT 1
        FROM public.delivery_riders dr
        WHERE dr.id = delivery_assignments.rider_id
          AND dr.user_id = auth.uid()
          AND dr.status = 'approved'
      )
      AND
      -- order must already be claimed by this same rider
      EXISTS (
        SELECT 1
        FROM public.food_orders o
        WHERE o.id = delivery_assignments.order_id
          AND o.rider_id = delivery_assignments.rider_id
          AND o.status IN ('assigned', 'in_transit', 'picked_up', 'delivered')
      )
    );
  END IF;
END $$;

-- 5) Hint PostgREST to refresh schema cache (helps relationship discovery)
NOTIFY pgrst, 'reload schema';
