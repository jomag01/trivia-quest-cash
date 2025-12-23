-- Create storage bucket for supplier documents
INSERT INTO storage.buckets (id, name)
VALUES ('supplier-documents', 'supplier-documents')
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for supplier documents
CREATE POLICY "Users can upload their own supplier documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'supplier-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view supplier documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'supplier-documents');

CREATE POLICY "Users can update their own supplier documents" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'supplier-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own supplier documents" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'supplier-documents' AND auth.uid()::text = (storage.foldername(name))[1]);