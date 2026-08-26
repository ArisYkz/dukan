-- Functional audit fixes:
--   1. Enable RLS on verification_audit_log (was missing)
--   2. Enable RLS on return_requests (was missing — policies were inert)
--   3. Admin INSERT/DELETE policies for tables the admin dashboard touches
--   4. Admin SELECT for store_promo_codes (sees all, including inactive)
--   5. Revoke authenticated direct access to analytics_aggregation (no ownership check)

-- 1. Enable RLS on tables missing it -----------------------------------------------

ALTER TABLE public.verification_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;

-- verification_audit_log is written by edge functions (service_role) and read by admins
-- Edge functions bypass RLS via service_role key; admin SELECT policy already exists.
-- No additional policies needed — the existing "Admins can view all verification audit log"
-- policy from 20260506000000 becomes active once RLS is enabled.

-- return_requests already has policies from 20260505130000 (multi-store rewrite) and
-- the original anon INSERT from 20260502210000. Enabling RLS activates them.

-- 2. Admin INSERT/DELETE policies --------------------------------------------------

CREATE POLICY "Admins can insert stores"
  ON public.stores FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can insert products"
  ON public.products FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete products"
  ON public.products FOR DELETE TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can manage categories"
  ON public.categories FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can manage promo codes"
  ON public.promo_codes FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 3. Admin SELECT for store_promo_codes (incl. inactive) ---------------------------

CREATE POLICY "Admins can view all store promo codes"
  ON public.store_promo_codes FOR SELECT TO authenticated
  USING (public.is_admin());

-- 4. Lock analytics_aggregation to service_role only -------------------------------
-- The function is SECURITY DEFINER with no ownership check — any authenticated user
-- can query any store's analytics by passing any UUID.
-- Frontend must use the analytics-aggregation Edge Function instead.

REVOKE EXECUTE ON FUNCTION public.analytics_aggregation(timestamptz, timestamptz, uuid, text) FROM authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.analytics_aggregation(timestamptz, timestamptz, uuid, text) TO service_role;
