-- Fix binary network visibility so users can see their position/tree while admins keep full access

BEGIN;

-- Users can view any node where they are in the ancestor chain (self + downline subtree)
CREATE OR REPLACE FUNCTION public.can_view_binary_network(_requester uuid, _node_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE ancestors AS (
    SELECT id, user_id, parent_id
    FROM public.binary_network
    WHERE id = _node_id

    UNION ALL

    SELECT bn.id, bn.user_id, bn.parent_id
    FROM public.binary_network bn
    JOIN ancestors a ON a.parent_id = bn.id
  )
  SELECT EXISTS (
    SELECT 1
    FROM ancestors
    WHERE user_id = _requester
  );
$$;

ALTER TABLE public.binary_network ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "Binary network: users can view subtree"
  ON public.binary_network
  FOR SELECT
  TO authenticated
  USING (public.can_view_binary_network(auth.uid(), id));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Binary network: admins can view all"
  ON public.binary_network
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMIT;