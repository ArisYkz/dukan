-- Restores the generic seller-verification pieces whose original migration
-- (20260501000000_seller_verification.sql) was deleted in the KZ-strip commit
-- (73343ad) while the app still uses them:
--   - verification_audit_log: written by the admin-verify edge function,
--     read by the admin dashboard AuditLogTab; referenced by the admin RLS
--     policy in 20260506000000_admin_rls and by 20260506000001_audit_fixes
--     (RLS enable).
--   - stores.verification_status: returned by get_public_store
--     (20260511000002_restrict_stores_columns) and updated by admin-verify.
-- KZ-specific columns (seller_type, iin_bin, legal_name, official_name,
-- registry_checked_at) are intentionally NOT restored.

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified', 'verified', 'mismatch', 'suspended', 'manual_review')),
  ADD COLUMN IF NOT EXISTS verification_notes text;

CREATE TABLE IF NOT EXISTS public.verification_audit_log (
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
