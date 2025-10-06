-- Initialize storage buckets using storage.create_bucket only (no policy DDL to avoid transaction errors)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'product_images') THEN
    PERFORM storage.create_bucket('product_images', public => true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'receipts') THEN
    PERFORM storage.create_bucket('receipts', public => true);
  END IF;
END $$;