ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS tiktok_handle text,
  ADD COLUMN IF NOT EXISTS show_instagram boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_tiktok boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_telegram boolean NOT NULL DEFAULT false;