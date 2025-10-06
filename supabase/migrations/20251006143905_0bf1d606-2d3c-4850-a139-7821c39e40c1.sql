-- Ensure the 'shop-items' storage bucket exists using the built-in helper (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'shop-items'
  ) THEN
    -- Use helper to create bucket with defaults; policies handle public read
    PERFORM storage.create_bucket('shop-items');
  END IF;
END $$;