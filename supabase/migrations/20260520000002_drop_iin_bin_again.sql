-- Drop iin_bin from Supabase — PII must live on Hoster.kz bridge only.
-- Was briefly re-added in 20260520000001 for convenience, but storing
-- tax IDs in Supabase violates Kazakhstan data-localization law.
ALTER TABLE public.stores DROP COLUMN IF EXISTS iin_bin;
