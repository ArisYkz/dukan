-- Cleanup: drop old RLS policies that still use stores.user_id = auth.uid().
-- These were superseded by the multi_store_architecture migration but the old
-- policies were not explicitly dropped in all cases.

-- 1. categories: old ALL policy "Allow store owners to manage categories"
--    was left behind. Superseded by individual INSERT/UPDATE/DELETE policies.
DROP POLICY IF EXISTS "Allow store owners to manage categories" ON public.categories;

-- 2. order_items: old "Store owners can view order items" was left behind.
--    Superseded by "Store owners can view their order items" which uses
--    is_store_member() via orders.store_id.
DROP POLICY IF EXISTS "Store owners can view order items" ON public.order_items;

-- 3. orders: old "Store owners can view public order ids" was left behind.
--    Superseded by "Store owners can view their orders" which uses is_store_member().
DROP POLICY IF EXISTS "Store owners can view public order ids" ON public.orders;
