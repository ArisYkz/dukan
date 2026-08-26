-- =============================================================================
-- Migration: Drop PII columns from Supabase
--
-- Part of Kazakhstan data-localization compliance:
-- PII now lives exclusively on the Hoster.kz bridge (pii_vault, order_pii).
--
-- Changes:
--   1. stores: DROP iin_bin, legal_name, official_name
--   2. orders:  Make customer_name, customer_address nullable, NULL existing
--   3. orders:  Drop + recreate RLS policy that required PII fields
-- =============================================================================

-- 1. Stores — drop PII columns that now live on Hoster.kz --------------------
-- NOTE: kaspi_phone, kaspi_name, whatsapp_phone are RETAINED — they are
-- business contact info displayed to customers for payment, not personal PII.
ALTER TABLE public.stores
  DROP COLUMN IF EXISTS iin_bin,
  DROP COLUMN IF EXISTS legal_name,
  DROP COLUMN IF EXISTS official_name;

-- 2. Orders — make customer_name/address nullable, NULL existing data --------
ALTER TABLE public.orders
  ALTER COLUMN customer_name DROP NOT NULL,
  ALTER COLUMN customer_address DROP NOT NULL;

UPDATE public.orders
  SET customer_name = NULL,
      customer_address = NULL;

-- 3. Orders — drop old RLS policy that validates PII ------------------------
DROP POLICY IF EXISTS "Anyone can create orders with valid data"
  ON public.orders;

CREATE POLICY "Anyone can create orders with valid data"
  ON public.orders FOR INSERT TO public
  WITH CHECK (
    customer_phone IS NOT NULL AND length(trim(customer_phone)) >= 6
    AND customer_phone_hash IS NOT NULL AND length(customer_phone_hash) > 10
    AND total_price > 0
    AND status IN ('new', 'awaiting_verification', 'payment_rejected', 'paid_confirmed',
                   'confirmed', 'shipped', 'delivered', 'cancelled')
  );
