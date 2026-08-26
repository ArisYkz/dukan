
-- The previous migration partially applied. The product-images upload policy already existed.
-- Just add the delete policy if it doesn't exist.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Owners can delete product images' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Owners can delete product images"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'product-images' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;
