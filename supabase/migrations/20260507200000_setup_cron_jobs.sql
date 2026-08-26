-- ============================================================
-- pg_cron Jobs — expire-stale-orders, process-email-queue
-- ============================================================
-- Prerequisites (already applied):
--   pg_cron extension  ✓
--   pg_net  extension  ✓
--   vault.create_secret('dukan_supabase_url') ✓
--   vault.create_secret('dukan_anon_key')     ✓
--
-- Status: APPLIED via Management API / SQL editor
-- ============================================================

-- === SCHEMA: cron_helper ===
-- Use a dedicated schema instead of cron to avoid DDL restrictions

create schema if not exists cron_helper;

-- === HELPER: get vault secret by name ===
create or replace function cron_helper.vault_secret(name text)
returns text
language plpgsql
security definer
stable
as $$
declare
  val text;
begin
  select decrypted_secret into val
  from vault.decrypted_secrets
  where vault.decrypted_secrets.name = vault_secret.name
  limit 1;
  return val;
end;
$$;

-- === HELPER: call an edge function via net.http_post ===
create or replace function cron_helper.invoke_edge(function_name text, body jsonb default '{}'::jsonb)
returns bigint
language plpgsql
security definer
as $$
declare
  url text;
  anon_key text;
  req_id bigint;
begin
  url := cron_helper.vault_secret('dukan_supabase_url');
  if url is null then
    raise warning 'dukan_supabase_url not set — skipping %', function_name;
    return -1;
  end if;
  anon_key := cron_helper.vault_secret('dukan_anon_key');
  select net.http_post(
    url := url || '/functions/v1/' || function_name,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(anon_key, '')
    ),
    body := coalesce(body, '{}'::jsonb)
  ) into req_id;
  return req_id;
end;
$$;

grant usage on schema cron_helper to public;
grant execute on all functions in schema cron_helper to public;

-- === CRON: expire-stale-orders ===
-- Runs every 5 minutes, cancels "new" (>30 min) and "awaiting_verification" (>24h) orders
select cron.schedule(
  'expire-stale-orders',
  '*/5 * * * *',
  $$select cron_helper.invoke_edge('expire-stale-orders');$$
);

-- === CRON: process-email-queue ===
-- Runs every minute, drains auth and transactional email queues
select cron.schedule(
  'process-email-queue',
  '* * * * *',
  $$select cron_helper.invoke_edge('process-email-queue');$$
);
