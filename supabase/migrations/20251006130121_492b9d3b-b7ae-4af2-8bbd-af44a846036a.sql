-- Add receipt_url column to transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- Create storage bucket for payment receipts
INSERT INTO storage.buckets (id, name)
VALUES ('receipts', 'receipts')
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own receipts
CREATE POLICY "Users can upload payment receipts"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipts' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to view their own receipts
CREATE POLICY "Users can view their own receipts"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'receipts' AND
  auth.uid()::text = (storage.foldername(name))[1]
);