-- Create table to track which categories users have unlocked
CREATE TABLE IF NOT EXISTS public.user_unlocked_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  category_id UUID NOT NULL REFERENCES public.game_categories(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, category_id)
);

-- Enable RLS
ALTER TABLE public.user_unlocked_categories ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own unlocked categories"
ON public.user_unlocked_categories
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can unlock categories for themselves"
ON public.user_unlocked_categories
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Function to check if user can access level 6+ in a specific category
CREATE OR REPLACE FUNCTION public.can_access_category_level(
  p_user_id UUID,
  p_category_id UUID,
  p_level INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral_count INTEGER;
  v_is_unlocked BOOLEAN;
BEGIN
  -- Levels 1-5 are always accessible
  IF p_level <= 5 THEN
    RETURN TRUE;
  END IF;

  -- Check if category is unlocked
  SELECT EXISTS(
    SELECT 1 FROM user_unlocked_categories
    WHERE user_id = p_user_id AND category_id = p_category_id
  ) INTO v_is_unlocked;

  -- If unlocked, allow access
  IF v_is_unlocked THEN
    RETURN TRUE;
  END IF;

  -- Not unlocked, check referral count
  SELECT get_referral_count(p_user_id) INTO v_referral_count;
  
  -- Need at least 2 referrals
  RETURN v_referral_count >= 2;
END;
$$;

-- Function to get count of unlocked categories for a user
CREATE OR REPLACE FUNCTION public.get_unlocked_categories_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM user_unlocked_categories
  WHERE user_id = p_user_id;
$$;

-- Function to unlock a category (requires 2 referrals per unlock)
CREATE OR REPLACE FUNCTION public.unlock_category(
  p_user_id UUID,
  p_category_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral_count INTEGER;
  v_unlocked_count INTEGER;
  v_required_referrals INTEGER;
BEGIN
  -- Get current referral count
  SELECT get_referral_count(p_user_id) INTO v_referral_count;
  
  -- Get current unlocked categories count
  SELECT get_unlocked_categories_count(p_user_id) INTO v_unlocked_count;
  
  -- Calculate required referrals (2 per category)
  v_required_referrals := (v_unlocked_count + 1) * 2;
  
  -- Check if user has enough referrals
  IF v_referral_count < v_required_referrals THEN
    RETURN json_build_object(
      'success', FALSE,
      'message', 'Not enough referrals. Need ' || v_required_referrals || ' referrals to unlock this category.',
      'referrals_needed', v_required_referrals - v_referral_count
    );
  END IF;
  
  -- Check if already unlocked
  IF EXISTS(SELECT 1 FROM user_unlocked_categories WHERE user_id = p_user_id AND category_id = p_category_id) THEN
    RETURN json_build_object(
      'success', FALSE,
      'message', 'Category already unlocked'
    );
  END IF;
  
  -- Unlock the category
  INSERT INTO user_unlocked_categories (user_id, category_id)
  VALUES (p_user_id, p_category_id);
  
  RETURN json_build_object(
    'success', TRUE,
    'message', 'Category unlocked successfully!'
  );
END;
$$;