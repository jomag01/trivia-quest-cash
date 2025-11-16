-- Create shipping zones table
CREATE TABLE IF NOT EXISTS shipping_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  regions TEXT[] NOT NULL,
  base_rate NUMERIC NOT NULL DEFAULT 0,
  per_kg_rate NUMERIC NOT NULL DEFAULT 0,
  free_shipping_threshold NUMERIC,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE shipping_zones ENABLE ROW LEVEL SECURITY;

-- Allow admins to manage shipping zones
CREATE POLICY "Admins can manage shipping zones"
ON shipping_zones FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Allow everyone to view active zones
CREATE POLICY "Anyone can view active shipping zones"
ON shipping_zones FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- Insert default shipping zones
INSERT INTO shipping_zones (name, regions, base_rate, per_kg_rate, free_shipping_threshold) VALUES
('Metro Manila', ARRAY['Metro Manila', 'Manila', 'Quezon City', 'Makati', 'Taguig', 'Pasig', 'Mandaluyong', 'San Juan', 'Caloocan', 'Malabon', 'Navotas', 'Valenzuela', 'Las Piñas', 'Parañaque', 'Muntinlupa', 'Pasay', 'Marikina'], 50, 10, 1000),
('Luzon (Provincial)', ARRAY['Luzon', 'Cavite', 'Laguna', 'Batangas', 'Rizal', 'Bulacan', 'Pampanga', 'Bataan', 'Zambales', 'Tarlac', 'Nueva Ecija', 'Pangasinan', 'La Union', 'Ilocos Norte', 'Ilocos Sur', 'Abra', 'Benguet', 'Ifugao', 'Kalinga', 'Mountain Province', 'Apayao', 'Cagayan', 'Isabela', 'Nueva Vizcaya', 'Quirino', 'Aurora', 'Quezon', 'Marinduque', 'Romblon', 'Palawan', 'Occidental Mindoro', 'Oriental Mindoro', 'Albay', 'Camarines Norte', 'Camarines Sur', 'Catanduanes', 'Masbate', 'Sorsogon'], 100, 15, 1500),
('Visayas', ARRAY['Visayas', 'Cebu', 'Bohol', 'Negros Occidental', 'Negros Oriental', 'Iloilo', 'Capiz', 'Aklan', 'Antique', 'Guimaras', 'Leyte', 'Southern Leyte', 'Biliran', 'Samar', 'Eastern Samar', 'Northern Samar', 'Siquijor'], 150, 20, 2000),
('Mindanao', ARRAY['Mindanao', 'Davao', 'Davao del Norte', 'Davao del Sur', 'Davao Oriental', 'Davao Occidental', 'Davao de Oro', 'Cotabato', 'South Cotabato', 'Sultan Kudarat', 'Sarangani', 'General Santos', 'Zamboanga', 'Zamboanga del Norte', 'Zamboanga del Sur', 'Zamboanga Sibugay', 'Bukidnon', 'Camiguin', 'Lanao del Norte', 'Misamis Occidental', 'Misamis Oriental', 'Agusan del Norte', 'Agusan del Sur', 'Surigao del Norte', 'Surigao del Sur', 'Dinagat Islands', 'Lanao del Sur', 'Maguindanao', 'Basilan', 'Sulu', 'Tawi-Tawi'], 200, 25, 2500);