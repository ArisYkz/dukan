-- Re-add iin_bin for admin display purposes.
-- Was dropped in 20260508000001_drop_pii_columns.sql when PII moved to Hoster.kz,
-- but admin panel needs to display it for verified stores.
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS iin_bin text;
