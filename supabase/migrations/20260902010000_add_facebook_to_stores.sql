-- Facebook page/Messenger handle for stores
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS facebook text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS show_facebook boolean NOT NULL DEFAULT false;
