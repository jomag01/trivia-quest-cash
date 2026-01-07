-- Drop binary system tables completely
DROP TABLE IF EXISTS public.binary_commissions CASCADE;
DROP TABLE IF EXISTS public.binary_network CASCADE;
DROP TABLE IF EXISTS public.beehive_tiers CASCADE;
DROP TABLE IF EXISTS public.binary_pending_placements CASCADE;
DROP TABLE IF EXISTS public.binary_spillover_queue CASCADE;

-- Remove binary from marketing_systems if not already done
DELETE FROM public.marketing_systems WHERE system_key = 'binary';