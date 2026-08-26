-- Allow anonymous users (customers) to insert return requests
-- The return_requests table is write-only for customers (no read)
CREATE POLICY "Allow anon insert return_requests" ON public.return_requests
  FOR INSERT TO anon
  WITH CHECK (true);

-- Allow store owners to view their own return requests
CREATE POLICY "Store owners can view return_requests" ON public.return_requests
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = return_requests.store_id
        AND stores.user_id = auth.uid()
    )
  );

-- Allow store owners to update their own return requests
CREATE POLICY "Store owners can update return_requests" ON public.return_requests
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = return_requests.store_id
        AND stores.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = return_requests.store_id
        AND stores.user_id = auth.uid()
    )
  );

-- Allow store owners to delete their own return requests
CREATE POLICY "Store owners can delete return_requests" ON public.return_requests
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = return_requests.store_id
        AND stores.user_id = auth.uid()
    )
  );
