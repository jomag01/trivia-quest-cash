
-- Table to track daily ad views per user for affiliate activity requirement
CREATE TABLE public.user_ad_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  ad_id UUID NOT NULL,
  sponsored_product_id UUID REFERENCES public.sponsored_products(id) ON DELETE SET NULL,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  view_date DATE NOT NULL DEFAULT CURRENT_DATE,
  view_duration_seconds INTEGER DEFAULT 0,
  is_valid_view BOOLEAN DEFAULT false -- true when user watched long enough
);

-- Enable RLS
ALTER TABLE public.user_ad_views ENABLE ROW LEVEL SECURITY;

-- Users can view their own records
CREATE POLICY "Users can view own ad views" ON public.user_ad_views
FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Users can insert their own views
CREATE POLICY "Users can insert own ad views" ON public.user_ad_views
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Admins can view all
CREATE POLICY "Admins can view all ad views" ON public.user_ad_views
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Indexes for performance
CREATE INDEX idx_user_ad_views_user_date ON public.user_ad_views(user_id, view_date);
CREATE INDEX idx_user_ad_views_date ON public.user_ad_views(view_date);

-- Add admin setting for required daily ad views
INSERT INTO public.app_settings (key, value) 
VALUES 
  ('required_daily_ad_views', '5'),
  ('ad_view_min_duration_seconds', '10')
ON CONFLICT (key) DO NOTHING;

-- Function to check if user has completed daily ad views
CREATE OR REPLACE FUNCTION public.check_daily_ad_views_completed(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_required integer;
  v_completed integer;
  v_today date := CURRENT_DATE;
BEGIN
  SELECT COALESCE(value::integer, 5) INTO v_required 
  FROM app_settings WHERE key = 'required_daily_ad_views';

  SELECT COUNT(*) INTO v_completed
  FROM user_ad_views
  WHERE user_id = p_user_id
    AND view_date = v_today
    AND is_valid_view = true;

  RETURN json_build_object(
    'required', v_required,
    'completed', v_completed,
    'is_complete', v_completed >= v_required,
    'remaining', GREATEST(v_required - v_completed, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_daily_ad_views_completed(uuid) TO authenticated;
