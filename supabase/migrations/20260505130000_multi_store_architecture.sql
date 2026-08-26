-- Multi-Store Architecture: store_members table + RLS rewrite.
-- Replaces the 1:1 stores.user_id ownership model with a many-to-many
-- store_members table that supports owner/manager/viewer roles.
--
-- 1. Create store_members table
-- 2. Backfill existing stores.user_id → store_members (role=owner)
-- 3. Create is_store_member() helper for RLS policies
-- 4. Rewrite all owner-check RLS policies to use store_members

-- 1. store_members table -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.store_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'manager', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id, user_id)
);

ALTER TABLE public.store_members ENABLE ROW LEVEL SECURITY;

-- 2. Backfill existing owners ------------------------------------------------------
INSERT INTO public.store_members (store_id, user_id, role)
SELECT id, user_id, 'owner'
FROM public.stores
ON CONFLICT (store_id, user_id) DO NOTHING;

-- 3. Helper: is_store_member -------------------------------------------------------
-- SECURITY DEFINER bypasses RLS on store_members, preventing circularity.
CREATE OR REPLACE FUNCTION public.is_store_member(_store_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.store_members
    WHERE store_id = _store_id AND user_id = auth.uid()
  );
$$;

-- 4. store_members RLS -------------------------------------------------------------
-- Users can see their own memberships
CREATE POLICY "Users can view own memberships"
  ON public.store_members FOR SELECT
  USING (user_id = auth.uid());

-- Only store owners can manage members (avoids circularity by checking stores.user_id)
CREATE POLICY "Store owners can insert members"
  ON public.store_members FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.stores WHERE stores.id = store_members.store_id AND stores.user_id = auth.uid())
  );

CREATE POLICY "Store owners can update members"
  ON public.store_members FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.stores WHERE stores.id = store_members.store_id AND stores.user_id = auth.uid())
  );

CREATE POLICY "Store owners can delete members"
  ON public.store_members FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.stores WHERE stores.id = store_members.store_id AND stores.user_id = auth.uid())
  );

-- 5. Rewrite stores policies -------------------------------------------------------
DROP POLICY IF EXISTS "Owners can update stores" ON public.stores;
DROP POLICY IF EXISTS "Owners can delete stores" ON public.stores;

CREATE POLICY "Owners can update stores"
  ON public.stores FOR UPDATE
  USING (public.is_store_member(id));

CREATE POLICY "Owners can delete stores"
  ON public.stores FOR DELETE
  USING (public.is_store_member(id));

-- 6. Rewrite products policies -----------------------------------------------------
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;
DROP POLICY IF EXISTS "Store owners can insert products" ON public.products;
DROP POLICY IF EXISTS "Store owners can update products" ON public.products;
DROP POLICY IF EXISTS "Store owners can delete products" ON public.products;

CREATE POLICY "Anyone can view active products"
  ON public.products FOR SELECT USING (
    is_active = true OR public.is_store_member(store_id)
  );

CREATE POLICY "Store owners can insert products"
  ON public.products FOR INSERT
  WITH CHECK (public.is_store_member(store_id));

CREATE POLICY "Store owners can update products"
  ON public.products FOR UPDATE
  USING (public.is_store_member(store_id));

CREATE POLICY "Store owners can delete products"
  ON public.products FOR DELETE
  USING (public.is_store_member(store_id));

-- 7. Rewrite orders policies -------------------------------------------------------
DROP POLICY IF EXISTS "Store owners can view their orders" ON public.orders;
DROP POLICY IF EXISTS "Store owners can update orders" ON public.orders;

CREATE POLICY "Store owners can view their orders"
  ON public.orders FOR SELECT TO authenticated
  USING (public.is_store_member(store_id));

CREATE POLICY "Store owners can update orders"
  ON public.orders FOR UPDATE
  USING (public.is_store_member(store_id));

-- 8. Rewrite order_items policies --------------------------------------------------
DROP POLICY IF EXISTS "Store owners can view their order items" ON public.order_items;

CREATE POLICY "Store owners can view their order items"
  ON public.order_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id AND public.is_store_member(o.store_id)
    )
  );

-- 9. Rewrite product_images policies -----------------------------------------------
DROP POLICY IF EXISTS "Store owners can manage product images" ON public.product_images;

CREATE POLICY "Store owners can manage product images"
  ON public.product_images FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_images.product_id AND public.is_store_member(p.store_id)
    )
  );

-- 10. Rewrite product_variants policies --------------------------------------------
DROP POLICY IF EXISTS "Store owners can manage product variants" ON public.product_variants;

CREATE POLICY "Store owners can manage product variants"
  ON public.product_variants FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_variants.product_id AND public.is_store_member(p.store_id)
    )
  );

-- 11. Rewrite order_contacts policies ----------------------------------------------
DROP POLICY IF EXISTS "Store owners can view contact phones" ON public.order_contacts;
DROP POLICY IF EXISTS "Store owners can insert order contacts" ON public.order_contacts;

CREATE POLICY "Store owners can view contact phones"
  ON public.order_contacts FOR SELECT
  USING (public.is_store_member(store_id));

CREATE POLICY "Store owners can insert order contacts"
  ON public.order_contacts FOR INSERT TO authenticated
  WITH CHECK (public.is_store_member(store_id));

-- 12. Rewrite payment_attempts policies --------------------------------------------
DROP POLICY IF EXISTS "Store owners can view payment attempts" ON public.payment_attempts;
DROP POLICY IF EXISTS "Store owners can update payment attempts" ON public.payment_attempts;

CREATE POLICY "Store owners can view payment attempts"
  ON public.payment_attempts FOR SELECT
  USING (public.is_store_member(store_id));

CREATE POLICY "Store owners can update payment attempts"
  ON public.payment_attempts FOR UPDATE
  USING (public.is_store_member(store_id));

-- 13. Rewrite store_promo_codes policies -------------------------------------------
DROP POLICY IF EXISTS "Store owners can manage their promo codes" ON public.store_promo_codes;

CREATE POLICY "Store owners can manage their promo codes"
  ON public.store_promo_codes FOR ALL
  USING (public.is_store_member(store_id));

-- 14. Rewrite categories policies --------------------------------------------------
DROP POLICY IF EXISTS "Store owners can insert categories" ON public.categories;
DROP POLICY IF EXISTS "Store owners can update categories" ON public.categories;
DROP POLICY IF EXISTS "Store owners can delete categories" ON public.categories;

CREATE POLICY "Store owners can insert categories"
  ON public.categories FOR INSERT
  WITH CHECK (public.is_store_member(store_id));

CREATE POLICY "Store owners can update categories"
  ON public.categories FOR UPDATE
  USING (public.is_store_member(store_id));

CREATE POLICY "Store owners can delete categories"
  ON public.categories FOR DELETE
  USING (public.is_store_member(store_id));

-- 15. Rewrite reports policies -----------------------------------------------------
DROP POLICY IF EXISTS "Store owners can view reports" ON public.reports;

CREATE POLICY "Store owners can view reports"
  ON public.reports FOR SELECT TO authenticated
  USING (public.is_store_member(store_id));

-- 16. Rewrite return_requests policies ---------------------------------------------
DROP POLICY IF EXISTS "Store owners can view return_requests" ON public.return_requests;
DROP POLICY IF EXISTS "Store owners can update return_requests" ON public.return_requests;
DROP POLICY IF EXISTS "Store owners can delete return_requests" ON public.return_requests;

CREATE POLICY "Store owners can view return_requests"
  ON public.return_requests FOR SELECT TO authenticated
  USING (public.is_store_member(store_id));

CREATE POLICY "Store owners can update return_requests"
  ON public.return_requests FOR UPDATE TO authenticated
  USING (public.is_store_member(store_id))
  WITH CHECK (public.is_store_member(store_id));

CREATE POLICY "Store owners can delete return_requests"
  ON public.return_requests FOR DELETE TO authenticated
  USING (public.is_store_member(store_id));

-- 17. Index ------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_store_members_user_id ON public.store_members(user_id);
CREATE INDEX IF NOT EXISTS idx_store_members_store_id ON public.store_members(store_id);
