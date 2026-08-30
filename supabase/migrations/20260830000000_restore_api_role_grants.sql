-- Restore baseline API-role privileges on the public schema.
--
-- The hosted project (jdcsyjukrxtgzduzhngh) has its tables + RLS policies,
-- but the anon/authenticated/service_role roles have no table privileges,
-- so every REST query fails with PostgREST 42501 "permission denied for
-- table <x>" (HTTP 401/403): profiles, store_members, stores, products, ...
--
-- RLS stays the actual gate (policies exist on all app tables), so restoring
-- grants does not expose data. This matches Supabase's default baseline.

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- Safety net: make sure RLS is enabled on every public table so the restored
-- grants can never leak an unprotected table.
DO $$
DECLARE t record;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;

-- Future tables created by postgres get grants automatically again.
-- Deliberately NOT granting ALL ROUTINES: the email-queue and
-- analytics_aggregation functions are intentionally restricted to
-- service_role by earlier migrations.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
