-- Migrate Pro subscription from per-store to per-user (profiles table).
-- One Pro payment covers all stores owned by the user.

-- 1. Add subscription columns to profiles -----------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_type TEXT NOT NULL DEFAULT 'free';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_active BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'none';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_screenshot_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_expiry TIMESTAMPTZ;

-- 2. Backfill from most premium store per user ------------------------------------
-- Priority: pro_year > pro_month > pre_authorized > free
UPDATE public.profiles p
SET
  plan_type = COALESCE(backfill.plan_type, 'free'),
  subscription_active = COALESCE(backfill.subscription_active, false),
  subscription_status = COALESCE(backfill.subscription_status, 'none'),
  subscription_screenshot_url = backfill.subscription_screenshot_url,
  subscription_expiry = backfill.subscription_expiry
FROM (
  SELECT DISTINCT ON (s.user_id)
    s.user_id,
    s.plan_type,
    s.subscription_active,
    s.subscription_status,
    s.subscription_screenshot_url,
    s.subscription_expiry
  FROM public.stores s
  WHERE s.plan_type != 'free' OR s.subscription_status != 'none'
  ORDER BY s.user_id,
    CASE s.plan_type
      WHEN 'pro_year' THEN 1
      WHEN 'pro_month' THEN 2
      ELSE 3
    END,
    s.subscription_expiry DESC NULLS LAST
) backfill
WHERE p.user_id = backfill.user_id;
