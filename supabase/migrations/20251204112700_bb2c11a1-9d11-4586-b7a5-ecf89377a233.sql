-- Add TikTok-style targeting columns to user_ads table
ALTER TABLE public.user_ads 
ADD COLUMN IF NOT EXISTS target_country TEXT,
ADD COLUMN IF NOT EXISTS target_province TEXT,
ADD COLUMN IF NOT EXISTS target_city TEXT,
ADD COLUMN IF NOT EXISTS target_barangay TEXT,
ADD COLUMN IF NOT EXISTS target_gender TEXT,
ADD COLUMN IF NOT EXISTS target_age_min INTEGER DEFAULT 13,
ADD COLUMN IF NOT EXISTS target_age_max INTEGER DEFAULT 65,
ADD COLUMN IF NOT EXISTS target_interests TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS target_device TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS target_language TEXT DEFAULT 'all',
ADD COLUMN IF NOT EXISTS placement TEXT DEFAULT 'feed',
ADD COLUMN IF NOT EXISTS objective TEXT DEFAULT 'awareness';