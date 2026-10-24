CREATE OR REPLACE FUNCTION public.validate_order_delivery_date()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
 IF TG_OP = 'INSERT' OR NEW.preferred_delivery_date IS DISTINCT FROM OLD.preferred_delivery_date THEN
  IF NEW.preferred_delivery_date IS NOT NULL AND (NOT isfinite(NEW.preferred_delivery_date) OR NEW.preferred_delivery_date < (now() AT TIME ZONE 'Asia/Manila')::date + 14) THEN
   RAISE EXCEPTION 'Preferred delivery date must be at least 14 days (2 weeks) in advance';
  END IF;
 END IF;
 RETURN NEW;
END;
$function$;