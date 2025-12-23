-- Create marketplace_categories table for dynamic category management
CREATE TABLE public.marketplace_categories (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'Package',
  color TEXT NOT NULL DEFAULT 'from-blue-500 to-blue-600',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marketplace_categories ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read categories
CREATE POLICY "Marketplace categories are viewable by everyone"
ON public.marketplace_categories
FOR SELECT
USING (true);

-- Only allow admin to manage categories (using has_role function)
CREATE POLICY "Admins can manage marketplace categories"
ON public.marketplace_categories
FOR ALL
USING (
  public.has_role(auth.uid(), 'admin'::text)
);

-- Insert default categories
INSERT INTO public.marketplace_categories (id, label, icon, color, display_order) VALUES
  ('property_sale', 'Properties for Sale', 'Building', 'from-blue-500 to-blue-600', 1),
  ('vehicle_sale', 'Vehicles', 'Car', 'from-red-500 to-red-600', 2),
  ('secondhand_items', 'Second Hand', 'Package', 'from-green-500 to-green-600', 3),
  ('property_rent', 'Property Rental', 'Home', 'from-purple-500 to-purple-600', 4),
  ('room_rent', 'Room Rental', 'BedDouble', 'from-orange-500 to-orange-600', 5),
  ('hotel_staycation', 'Hotel & Staycation', 'Hotel', 'from-pink-500 to-pink-600', 6);

-- Create trigger for updated_at
CREATE TRIGGER update_marketplace_categories_updated_at
BEFORE UPDATE ON public.marketplace_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();