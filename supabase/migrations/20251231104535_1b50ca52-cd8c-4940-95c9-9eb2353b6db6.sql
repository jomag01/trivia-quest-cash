-- Ensure a concrete UUID is used for "Store Support" conversations (provider_id is UUID)

-- 1) Store a configurable store support user id (defaults to first admin)
INSERT INTO public.app_settings (key, value)
VALUES (
  'store_support_user_id',
  (
    SELECT ur.user_id::text
    FROM public.user_roles ur
    WHERE ur.role = 'admin'
    ORDER BY ur.created_at ASC
    LIMIT 1
  )
)
ON CONFLICT (key)
DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now();

-- 2) Expose a safe accessor for clients (avoids reading user_roles directly)
CREATE OR REPLACE FUNCTION public.get_store_support_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT CASE
        WHEN a.value IS NOT NULL
         AND a.value <> ''
         AND a.value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN a.value::uuid
        ELSE NULL
      END
      FROM public.app_settings a
      WHERE a.key = 'store_support_user_id'
      LIMIT 1
    ),
    (
      SELECT ur.user_id
      FROM public.user_roles ur
      WHERE ur.role = 'admin'
      ORDER BY ur.created_at ASC
      LIMIT 1
    )
  );
$$;