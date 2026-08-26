-- Seller verification: KGD compliance
-- Adds verification columns to stores + audit log table

ALTER TABLE public.stores
  ADD COLUMN seller_type text
    CHECK (seller_type IN ('individual_entrepreneur', 'legal_entity')),
  ADD COLUMN iin_bin text,
  ADD COLUMN legal_name text,
  ADD COLUMN official_name text,
  ADD COLUMN verification_status text NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN (
      'unverified', 'verified', 'mismatch', 'suspended', 'manual_review'
    )),
  ADD COLUMN registry_checked_at timestamptz,
  ADD COLUMN verification_notes text;

CREATE TABLE public.verification_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  action text NOT NULL,
  previous_status text,
  new_status text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_verification_audit_store
  ON public.verification_audit_log(store_id, created_at DESC);
