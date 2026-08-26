
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS social_platform text NOT NULL DEFAULT 'instagram';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category text DEFAULT NULL;
