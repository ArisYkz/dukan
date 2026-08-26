ALTER TABLE public.stores 
  ADD COLUMN IF NOT EXISTS subscription_screenshot_url text,
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'none';