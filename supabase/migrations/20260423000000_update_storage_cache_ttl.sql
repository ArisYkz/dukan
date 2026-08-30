-- Update Supabase Storage Cache TTL — no-op on newer storage where the
-- cache_control column does not exist.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'storage' AND table_name = 'buckets' AND column_name = 'cache_control'
  ) THEN
    UPDATE storage.buckets
    SET cache_control = 'max-age=31536000, immutable'
    WHERE name IN ('product-images', 'product-assets');
    RAISE NOTICE 'Updated cache_control for product-images/product-assets buckets';
  ELSE
    RAISE NOTICE 'storage.buckets.cache_control does not exist — skipping cache TTL update';
  END IF;
END $$;
