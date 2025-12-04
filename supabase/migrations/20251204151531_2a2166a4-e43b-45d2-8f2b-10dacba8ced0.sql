-- Create storage bucket for verification IDs (using correct column names)
INSERT INTO storage.buckets (id, name) 
VALUES ('provider-verification', 'provider-verification')
ON CONFLICT (id) DO NOTHING;