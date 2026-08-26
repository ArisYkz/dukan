-- Migration: Update Supabase Storage Cache TTL to 1 Year
-- Purpose: Change default cache control from 1 hour to 1 year for better performance
-- Date: 2026-04-23
-- This migration only updates cache_control, safe to run multiple times

-- Update cache control for product-images bucket (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE name = 'product-images') THEN
    UPDATE storage.buckets
    SET cache_control = 'max-age=31536000, immutable'
    WHERE name = 'product-images';
    RAISE NOTICE 'Updated cache_control for product-images bucket';
  ELSE
    RAISE NOTICE 'product-images bucket not found, skipping';
  END IF;
END $$;

-- Update cache control for product-assets bucket (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE name = 'product-assets') THEN
    UPDATE storage.buckets
    SET cache_control = 'max-age=31536000, immutable'
    WHERE name = 'product-assets';
    RAISE NOTICE 'Updated cache_control for product-assets bucket';
  ELSE
    RAISE NOTICE 'product-assets bucket not found, skipping';
  END IF;
END $$;

-- Verify the changes
SELECT name, cache_control 
FROM storage.buckets 
WHERE name IN ('product-images', 'product-assets');
