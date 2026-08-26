-- Fix critical security: return_requests anon INSERT had WITH CHECK(true),
-- allowing anyone to submit unlimited return requests with arbitrary data.
--
-- New policy validates:
--   1. reason is non-empty
--   2. status is locked to 'pending' (can't forge approved/rejected)
--   3. the order_id actually exists and belongs to the claimed store_id

DROP POLICY IF EXISTS "Allow anon insert return_requests" ON public.return_requests;

CREATE POLICY "Allow anon insert return_requests" ON public.return_requests
  FOR INSERT TO anon
  WITH CHECK (
    reason IS NOT NULL
    AND reason != ''
    AND status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_id
        AND orders.store_id = store_id
    )
  );
