-- Delete all user data to start fresh
DELETE FROM public.user_answered_questions;
DELETE FROM public.user_prize_claims;
DELETE FROM public.credit_purchases;
DELETE FROM public.payout_requests;
DELETE FROM public.payout_accounts;
DELETE FROM public.user_wallets;
DELETE FROM public.user_roles;
DELETE FROM public.profiles;