
-- The previous migration partially applied. The product-images upload policy already existed.
-- Just add the delete policy if it doesn't exist.
DROP POLICY IF EXISTS "Owners can delete product images" ON storage.objects;
CREATE POLICY "Owners can delete product images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'product-images' AND (storage.foldername(name))[1] = auth.uid()::text);
