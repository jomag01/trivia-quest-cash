-- Fix overly permissive UPDATE policies on system tables
-- Security Issue: PUBLIC_DATA_EXPOSURE (overly_permissive_updates)

-- 1. visitor_sessions: Restrict to service role only (system managed)
DROP POLICY IF EXISTS "Anyone can update visitor sessions" ON public.visitor_sessions;

-- Only service role can update visitor sessions (system operations only)
-- No public policy = only service_role can update
REVOKE UPDATE ON public.visitor_sessions FROM authenticated;
REVOKE UPDATE ON public.visitor_sessions FROM anon;

-- 2. ai_response_cache: Restrict to service role only
DROP POLICY IF EXISTS "Service update cache" ON public.ai_response_cache;

-- Only service role can update cache (system operations only)
REVOKE UPDATE ON public.ai_response_cache FROM authenticated;
REVOKE UPDATE ON public.ai_response_cache FROM anon;

-- 3. seller_referrer_earnings: Restrict to service role only (financial data)
DROP POLICY IF EXISTS "System can update referrer earnings" ON public.seller_referrer_earnings;

-- Only service role can update earnings (financial operations only)
REVOKE ALL ON public.seller_referrer_earnings FROM authenticated;
REVOKE ALL ON public.seller_referrer_earnings FROM anon;

-- Admins can view earnings for reporting
CREATE POLICY "Admins can view all earnings" 
ON public.seller_referrer_earnings 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- Users can view their own earnings
CREATE POLICY "Users can view own earnings" 
ON public.seller_referrer_earnings 
FOR SELECT 
USING (auth.uid() = referrer_id OR auth.uid() = seller_id);

-- 4. ad_impression_caps: Restrict to service role only
DROP POLICY IF EXISTS "System can manage caps" ON public.ad_impression_caps;

-- Only service role can manage impression caps
REVOKE ALL ON public.ad_impression_caps FROM authenticated;
REVOKE ALL ON public.ad_impression_caps FROM anon;

-- Admins can view caps for monitoring
CREATE POLICY "Admins can view impression caps" 
ON public.ad_impression_caps 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- 5. user_retargeting_profiles: Restrict to service role only
DROP POLICY IF EXISTS "System can manage profiles" ON public.user_retargeting_profiles;

-- Only service role can manage retargeting profiles
REVOKE ALL ON public.user_retargeting_profiles FROM authenticated;
REVOKE ALL ON public.user_retargeting_profiles FROM anon;

-- Admins can view profiles for analytics
CREATE POLICY "Admins can view retargeting profiles" 
ON public.user_retargeting_profiles 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- 6. system_settings: Restrict to admins only
DROP POLICY IF EXISTS "System can manage all" ON public.system_settings;

-- Only admins can manage system settings
CREATE POLICY "Admins can manage system settings" 
ON public.system_settings 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow public read for non-sensitive settings
CREATE POLICY "Public can view public settings" 
ON public.system_settings 
FOR SELECT 
USING (true);