-- Create the table for category field templates
CREATE TABLE IF NOT EXISTS public.service_category_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES public.service_categories(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text',
  field_options JSONB DEFAULT '[]'::jsonb,
  is_required BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  placeholder TEXT DEFAULT NULL,
  help_text TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.service_category_fields ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view category fields"
ON public.service_category_fields FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can manage category fields"
ON public.service_category_fields FOR ALL
USING (auth.uid() IS NOT NULL);

-- Add realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_category_fields;