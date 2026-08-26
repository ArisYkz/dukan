-- Bridge health monitor — runs every 5 minutes, logs failures to bridge_delivery_log
select cron.schedule(
  'bridge-health',
  '*/5 * * * *',
  $$select cron_helper.invoke_edge('bridge-health');$$
);
