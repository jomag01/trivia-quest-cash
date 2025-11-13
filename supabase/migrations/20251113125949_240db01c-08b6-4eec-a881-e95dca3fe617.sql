-- Create message-attachments storage bucket (simplified for older schema)
INSERT INTO storage.buckets (id, name)
VALUES ('message-attachments', 'message-attachments')
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for message-attachments bucket
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can upload message attachments" ON storage.objects;
  DROP POLICY IF EXISTS "Users can view their own message attachments" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update their own message attachments" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own message attachments" ON storage.objects;
  
  -- Create new policies
  CREATE POLICY "Users can upload message attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'message-attachments' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

  CREATE POLICY "Users can view their own message attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'message-attachments' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

  CREATE POLICY "Users can update their own message attachments"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'message-attachments' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

  CREATE POLICY "Users can delete their own message attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'message-attachments' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
END $$;