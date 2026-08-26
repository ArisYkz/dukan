-- Fix critical RLS data leaks on orders and order_items tables.
-- Drops broad USING(true) policies and replaces them with:
--   - Authenticated store-owner access
--   - SECURITY DEFINER RPC wrappers for anon order tracking

-- 1. Replace orders SELECT policy ------------------------------------------------

DROP POLICY IF EXISTS "Anyone can view order by id" ON public.orders;

CREATE POLICY "Store owners can view their orders"
  ON public.orders FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = orders.store_id AND s.user_id = auth.uid()
    )
  );

-- 2. Replace order_items SELECT policy -------------------------------------------

DROP POLICY IF EXISTS "Anyone can view order items for their order" ON public.order_items;

CREATE POLICY "Store owners can view their order items"
  ON public.order_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.stores s ON s.id = o.store_id
      WHERE o.id = order_items.order_id AND s.user_id = auth.uid()
    )
  );

-- 3. Drop unused anon UPDATE policy ----------------------------------------------

DROP POLICY IF EXISTS "Anon can update order status to awaiting_verification" ON public.orders;

-- 4. RPC functions for anon order tracking ---------------------------------------

-- Lookup a single order by its UUID (capability URL pattern)
CREATE OR REPLACE FUNCTION public.get_order_public(p_order_id UUID)
RETURNS SETOF public.orders
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.orders WHERE id = p_order_id LIMIT 1;
END;
$$;

-- Lookup order items for a given order UUID
CREATE OR REPLACE FUNCTION public.get_order_items_public(p_order_id UUID)
RETURNS SETOF public.order_items
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.order_items WHERE order_id = p_order_id;
END;
$$;

-- Grant access to anon/authenticated roles
GRANT EXECUTE ON FUNCTION public.get_order_public(UUID) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_order_items_public(UUID) TO PUBLIC;
