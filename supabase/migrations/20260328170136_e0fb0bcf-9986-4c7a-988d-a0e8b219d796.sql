ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS tax_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS tax_percent numeric NOT NULL DEFAULT 0;