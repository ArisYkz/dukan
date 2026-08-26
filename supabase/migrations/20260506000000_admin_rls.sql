-- Admin Dashboard RLS: role column, is_admin() helper, admin-bypass policies.
-- Gives admins (profiles.role = 'admin') read/write access to all tables.

-- 1. Ensure role column exists on profiles (idempotent) --------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

-- 2. is_admin() helper -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

-- 3. Admin SELECT policies (read any row in restricted tables) -------------------

CREATE POLICY "Admins can view all orders"
  ON public.orders FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can view all order items"
  ON public.order_items FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can view all store memberships"
  ON public.store_members FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can view all reports"
  ON public.reports FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can view all payment attempts"
  ON public.payment_attempts FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can view all return requests"
  ON public.return_requests FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can view all verification audit log"
  ON public.verification_audit_log FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can view all reviews"
  ON public.reviews FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can view all order contacts"
  ON public.order_contacts FOR SELECT TO authenticated
  USING (public.is_admin());

-- Products: admins can also see inactive products
CREATE POLICY "Admins can view all products"
  ON public.products FOR SELECT TO authenticated
  USING (public.is_admin());

-- 4. Admin mutation policies -----------------------------------------------------

CREATE POLICY "Admins can update any store"
  ON public.stores FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete any store"
  ON public.stores FOR DELETE TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can update any product"
  ON public.products FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update any order"
  ON public.orders FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
