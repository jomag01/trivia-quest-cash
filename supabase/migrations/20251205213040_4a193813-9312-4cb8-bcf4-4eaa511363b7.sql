-- Create table for food item variations (e.g., size, spice level)
CREATE TABLE IF NOT EXISTS public.food_item_variations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.food_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  is_required BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create table for food item add-ons (e.g., extra cheese, extra rice)
CREATE TABLE IF NOT EXISTS public.food_item_addons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.food_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.food_item_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_item_addons ENABLE ROW LEVEL SECURITY;

-- Create policies for variations
CREATE POLICY "Anyone can view variations" ON public.food_item_variations FOR SELECT USING (true);
CREATE POLICY "Vendors can manage their item variations" ON public.food_item_variations FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.food_items fi
    JOIN public.food_vendors fv ON fi.vendor_id = fv.id
    WHERE fi.id = item_id AND fv.owner_id = auth.uid()
  )
);

-- Create policies for add-ons
CREATE POLICY "Anyone can view addons" ON public.food_item_addons FOR SELECT USING (true);
CREATE POLICY "Vendors can manage their item addons" ON public.food_item_addons FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.food_items fi
    JOIN public.food_vendors fv ON fi.vendor_id = fv.id
    WHERE fi.id = item_id AND fv.owner_id = auth.uid()
  )
);