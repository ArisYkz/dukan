-- Diagnostic script to troubleshoot missing product cards on storefront
-- Run this in your Supabase SQL Editor

-- Step 1: Check if stores exist and get their IDs
SELECT 
  id, 
  slug, 
  name, 
  is_paused,
  subscription_status,
  created_at
FROM public.stores
ORDER BY created_at DESC
LIMIT 10;

-- Step 2: Check products for a specific store (replace YOUR_STORE_ID with actual ID from Step 1)
-- Uncomment and replace the ID below:
-- SELECT 
--   id,
--   store_id,
--   name,
--   price,
--   stock,
--   is_active,
--   category,
--   image_url,
--   created_at
-- FROM public.products
-- WHERE store_id = 'YOUR_STORE_ID'
-- ORDER BY created_at DESC;

-- Step 3: Check ALL products to see if any exist
SELECT 
  COUNT(*) as total_products,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_products,
  COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_products
FROM public.products;

-- Step 4: Check products grouped by store
SELECT 
  s.id as store_id,
  s.slug,
  s.name as store_name,
  COUNT(p.id) as total_products,
  COUNT(CASE WHEN p.is_active = true THEN 1 END) as active_products
FROM public.stores s
LEFT JOIN public.products p ON p.store_id = s.id
GROUP BY s.id, s.slug, s.name
ORDER BY total_products DESC;

-- Step 5: Check RLS policies on products table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'products';

-- Step 6: Test anonymous access (this simulates what the frontend does)
-- Run this as anon user (or check the RLS policies above)
-- The policy should allow: SELECT WHERE is_active = true
