-- Create function to increment user credits
CREATE OR REPLACE FUNCTION public.increment_credits(user_id UUID, amount INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_wallets (user_id, credits, balance)
  VALUES (user_id, amount, 0)
  ON CONFLICT (user_id) 
  DO UPDATE SET credits = user_wallets.credits + amount;
END;
$$;