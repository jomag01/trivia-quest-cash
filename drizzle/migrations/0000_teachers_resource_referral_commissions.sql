CREATE TABLE public.teachers_resource_commission_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type TEXT NOT NULL UNIQUE,
  resource_label TEXT NOT NULL,
  service_price NUMERIC NOT NULL DEFAULT 0,
  commission_type TEXT NOT NULL DEFAULT 'percentage' CHECK (commission_type IN ('percentage','fixed')),
  commission_value NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.teachers_resource_commission_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teachers_resource_commission_settings TO authenticated;
GRANT ALL ON public.teachers_resource_commission_settings TO service_role;

ALTER TABLE public.teachers_resource_commission_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view teachers resource commission settings"
ON public.teachers_resource_commission_settings FOR SELECT USING (true);

CREATE POLICY "Admins manage teachers resource commission settings"
ON public.teachers_resource_commission_settings FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.teachers_resource_referral_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL,
  referred_user_id UUID NOT NULL,
  resource_type TEXT NOT NULL,
  service_amount NUMERIC NOT NULL DEFAULT 0,
  commission_amount NUMERIC NOT NULL DEFAULT 0,
  commission_type TEXT NOT NULL DEFAULT 'percentage',
  commission_value NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'credited',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tr_referral_earnings_referrer ON public.teachers_resource_referral_earnings(referrer_id, created_at DESC);

GRANT SELECT ON public.teachers_resource_referral_earnings TO authenticated;
GRANT ALL ON public.teachers_resource_referral_earnings TO service_role;

ALTER TABLE public.teachers_resource_referral_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their teachers resource earnings"
ON public.teachers_resource_referral_earnings FOR SELECT TO authenticated
USING (auth.uid() = referrer_id OR auth.uid() = referred_user_id OR public.has_role(auth.uid(), 'admin'));

INSERT INTO public.teachers_resource_commission_settings (resource_type, resource_label, service_price, commission_type, commission_value)
VALUES
  ('lesson_plan', 'Lesson Plan Maker', 50, 'percentage', 10),
  ('exam_generator', 'Exam Maker', 75, 'percentage', 10);

CREATE OR REPLACE FUNCTION public.award_teachers_resource_commission(_resource_type TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID := auth.uid();
  _referrer UUID;
  _settings RECORD;
  _amount NUMERIC := 0;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('awarded', false, 'reason', 'not_authenticated');
  END IF;

  SELECT referred_by INTO _referrer FROM public.profiles WHERE id = _user_id;
  IF _referrer IS NULL OR _referrer = _user_id THEN
    RETURN jsonb_build_object('awarded', false, 'reason', 'no_referrer');
  END IF;

  SELECT * INTO _settings FROM public.teachers_resource_commission_settings
  WHERE resource_type = _resource_type AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('awarded', false, 'reason', 'no_settings');
  END IF;

  IF _settings.commission_type = 'fixed' THEN
    _amount := _settings.commission_value;
  ELSE
    _amount := _settings.service_price * (_settings.commission_value / 100.0);
  END IF;

  IF _amount <= 0 THEN
    RETURN jsonb_build_object('awarded', false, 'reason', 'zero_amount');
  END IF;

  INSERT INTO public.teachers_resource_referral_earnings (
    referrer_id, referred_user_id, resource_type, service_amount,
    commission_amount, commission_type, commission_value
  ) VALUES (
    _referrer, _user_id, _resource_type, _settings.service_price,
    _amount, _settings.commission_type, _settings.commission_value
  );

  IF EXISTS (SELECT 1 FROM public.user_wallets WHERE user_id = _referrer) THEN
    UPDATE public.user_wallets
    SET balance = COALESCE(balance, 0) + _amount,
        total_commissions = COALESCE(total_commissions, 0) + _amount
    WHERE user_id = _referrer;
  ELSE
    INSERT INTO public.user_wallets (user_id, balance, total_commissions)
    VALUES (_referrer, _amount, _amount);
  END IF;

  INSERT INTO public.commission_notifications (user_id, source_type, amount, message)
  VALUES (_referrer, 'teachers_resources', _amount,
    'You earned ₱' || to_char(_amount, 'FM999999990.00') || ' from a referred teacher using ' || _settings.resource_label || '!');

  RETURN jsonb_build_object('awarded', true, 'amount', _amount);
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_teachers_resource_commission(TEXT) TO authenticated;