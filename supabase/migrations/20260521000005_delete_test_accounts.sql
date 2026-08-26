-- Delete test user accounts (delete in dependency order since not all FK constraints are CASCADE)
DELETE FROM public.store_members WHERE user_id IN (
  SELECT id FROM auth.users WHERE email IN ('playwright-test@dukan.com', 'test-1778527363205@dukan.com', 'test-1778527330315@dukan.com')
);
DELETE FROM public.stores WHERE user_id IN (
  SELECT id FROM auth.users WHERE email IN ('playwright-test@dukan.com', 'test-1778527363205@dukan.com', 'test-1778527330315@dukan.com')
);
DELETE FROM public.profiles WHERE user_id IN (
  SELECT id FROM auth.users WHERE email IN ('playwright-test@dukan.com', 'test-1778527363205@dukan.com', 'test-1778527330315@dukan.com')
);
DELETE FROM auth.users
WHERE email IN (
  'playwright-test@dukan.com',
  'test-1778527363205@dukan.com',
  'test-1778527330315@dukan.com'
);
