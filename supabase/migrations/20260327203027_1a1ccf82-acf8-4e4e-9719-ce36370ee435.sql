CREATE POLICY "Store owners can insert order contacts"
ON public.order_contacts
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = order_contacts.store_id
    AND stores.user_id = auth.uid()
  )
);