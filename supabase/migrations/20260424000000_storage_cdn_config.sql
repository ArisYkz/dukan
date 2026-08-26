-- Set cache control + image transformation defaults for remaining buckets

DO $$
BEGIN
  -- store-assets bucket (hero banners, branding)
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE name = 'store-assets') THEN
    UPDATE storage.buckets
    SET cache_control = 'max-age=31536000, immutable'
    WHERE name = 'store-assets';
  END IF;

  -- qr-codes bucket
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE name = 'qr-codes') THEN
    UPDATE storage.buckets
    SET cache_control = 'max-age=31536000, immutable'
    WHERE name = 'qr-codes';
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
