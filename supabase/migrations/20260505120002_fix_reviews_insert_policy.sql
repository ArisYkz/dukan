-- Fix reviews INSERT policy: replace WITH CHECK(true) with a policy that
-- validates the review references a real order and product in that order.
-- Phone-hash validation still happens in the submit-review Edge Function.

DROP POLICY IF EXISTS "Anyone can insert reviews" ON public.reviews;

CREATE POLICY "Reviews must reference valid order"
  ON public.reviews FOR INSERT TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = reviews.order_id AND o.store_id = reviews.store_id
    )
    AND EXISTS (
      SELECT 1 FROM public.order_items oi
      WHERE oi.order_id = reviews.order_id AND oi.product_id = reviews.product_id
    )
  );
