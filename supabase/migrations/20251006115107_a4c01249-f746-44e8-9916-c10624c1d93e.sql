-- Create profiles table with currency support
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  country text,
  currency text not null default 'PHP',
  currency_symbol text not null default '₱',
  referral_code text unique not null,
  referred_by uuid references public.profiles(id),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Create policies
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Function to generate unique referral code
create or replace function public.generate_referral_code()
returns text
language plpgsql
security definer
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

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    country,
    currency,
    currency_symbol,
    referral_code
  )
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'country',
    coalesce(new.raw_user_meta_data->>'currency', 'PHP'),
    coalesce(new.raw_user_meta_data->>'currency_symbol', '₱'),
    generate_referral_code()
  );
  return new;
end;
$$;

-- Trigger to create profile on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to update updated_at
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Trigger for updated_at
create trigger update_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.update_updated_at_column();