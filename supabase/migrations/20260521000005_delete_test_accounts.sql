-- Delete test user accounts (delete in dependency order since not all FK constraints are CASCADE)
DELETE FROM public.store_members WHERE user_id IN (
  SELECT id FROM auth.users WHERE email IN ('playwright-test@dokan.com', 'test-1778527363205@dokan.com', 'test-1778527330315@dokan.com')
);
DELETE FROM public.stores WHERE user_id IN (
  SELECT id FROM auth.users WHERE email IN ('playwright-test@dokan.com', 'test-1778527363205@dokan.com', 'test-1778527330315@dokan.com')
);
DELETE FROM public.profiles WHERE user_id IN (
  SELECT id FROM auth.users WHERE email IN ('playwright-test@dokan.com', 'test-1778527363205@dokan.com', 'test-1778527330315@dokan.com')
);
DELETE FROM auth.users
WHERE email IN (
  'playwright-test@dokan.com',
  'test-1778527363205@dokan.com',
  'test-1778527330315@dokan.com'
);
