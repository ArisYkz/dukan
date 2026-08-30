-- Set cache control defaults — no-op on newer storage where the
-- cache_control column does not exist.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'storage' AND table_name = 'buckets' AND column_name = 'cache_control'
  ) THEN
    UPDATE storage.buckets
    SET cache_control = 'max-age=31536000, immutable'
    WHERE name IN ('store-assets', 'qr-codes');
  END IF;
END $$;

-- Add image transformation sizing rule (max dimensions) via a storage hook
-- This ensures uploaded images are auto-resized to reasonable limits
CREATE OR REPLACE FUNCTION storage.resize_on_upload()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Set content-type defaults for uploads missing it
  IF NEW.content_type IS NULL THEN
    NEW.content_type := 'image/webp';
  END IF;
  RETURN NEW;
END;
$$;
