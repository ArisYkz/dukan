-- ============================================================
-- Cron job: downgrade-expired — daily at 3 AM local time
-- ============================================================
-- Finds profiles where plan_type is pro/... and
-- subscription_expiry < now(), then resets to free.
-- ============================================================

select cron.schedule(
  'downgrade-expired',
  '0 3 * * *',
  $$select cron_helper.invoke_edge('downgrade-expired');$$
);
