-- Fix security warnings by setting search_path for functions

-- Update generate_referral_code function
create or replace function public.generate_referral_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  new_code text;
  code_exists boolean;
begin
  loop
    new_code := 'GAME' || upper(substring(md5(random()::text) from 1 for 8));
    select exists(select 1 from public.profiles where referral_code = new_code) into code_exists;
    exit when not code_exists;
  end loop;
  return new_code;
end;
$$;

-- Update update_updated_at_column function
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;