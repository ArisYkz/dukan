-- Allow anon users to update order status (for "I Have Paid" button)
CREATE POLICY "Anon can update order status to awaiting_verification"
ON public.orders
FOR UPDATE
TO anon
USING (true)
WITH CHECK (
  status = 'awaiting_verification'
);