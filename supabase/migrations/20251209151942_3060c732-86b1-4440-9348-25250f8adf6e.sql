-- Fix the function to use proper date format for qualified_month
CREATE OR REPLACE FUNCTION public.check_and_update_affiliate_rank(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_current_month DATE;
  v_total_sales NUMERIC;
  v_current_rank INTEGER;
  v_new_rank INTEGER;
BEGIN
  v_current_month := date_trunc('month', now())::date;
  
  SELECT COALESCE(total_sales, 0) INTO v_total_sales
  FROM public.affiliate_monthly_sales
  WHERE user_id = p_user_id AND sales_month = v_current_month;
  
  IF v_total_sales IS NULL THEN
    v_total_sales := 0;
  END IF;
  
  SELECT COALESCE(current_step, 0) INTO v_current_rank
  FROM public.affiliate_current_rank
  WHERE user_id = p_user_id;
  
  IF v_current_rank IS NULL THEN
    v_current_rank := 0;
  END IF;
  
  SELECT COALESCE(MAX(step_number), 0) INTO v_new_rank
  FROM public.stair_step_config
  WHERE active = true AND sales_quota <= v_total_sales;
  
  IF v_new_rank > v_current_rank THEN
    INSERT INTO public.affiliate_current_rank (
      user_id, current_step, qualification_count, last_qualified_at
    ) VALUES (
      p_user_id, v_new_rank, 1, now()
    )
    ON CONFLICT (user_id)
    DO UPDATE SET 
      current_step = v_new_rank,
      qualification_count = affiliate_current_rank.qualification_count + 1,
      last_qualified_at = now(),
      updated_at = now();
    
    INSERT INTO public.affiliate_rank_history (
      user_id, step_number, qualified_month, sales_volume, qualification_count
    ) VALUES (
      p_user_id, v_new_rank, v_current_month, v_total_sales, 1
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;