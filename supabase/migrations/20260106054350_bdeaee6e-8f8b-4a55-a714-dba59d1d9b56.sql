-- Add commission_type and commission_id columns to commission_notifications if they don't exist
ALTER TABLE public.commission_notifications ADD COLUMN IF NOT EXISTS commission_type TEXT;
ALTER TABLE public.commission_notifications ADD COLUMN IF NOT EXISTS commission_id UUID;

-- Update existing records to set commission_type from source_type
UPDATE public.commission_notifications 
SET commission_type = source_type 
WHERE commission_type IS NULL;