CREATE OR REPLACE FUNCTION public.trg_ai_sub_history_sale() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF coalesce(NEW.amount_paid,0) > 0 AND coalesce(NEW.plan_type,'') <> 'topup' AND coalesce(NEW.action,'') <> 'topup' THEN
    PERFORM record_feature_sale(NEW.user_id, 'ai_subscription_'||coalesce(NEW.plan_type,'plan'), NEW.amount_paid, NEW.id, NEW.payment_method);
  END IF;
  RETURN NEW;
END $$;