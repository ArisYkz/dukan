-- Bridge delivery log — tracks PII forwarding to Hoster.kz bridge.
-- Non-blocking: create-order never fails on bridge issues, but this
-- table gives visibility into delivery health.
CREATE TABLE IF NOT EXISTS public.bridge_delivery_log (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id   UUID NOT NULL,
  store_id   UUID NOT NULL,
  status     TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
  error_msg  TEXT,
  attempts   INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bridge_log_order  ON public.bridge_delivery_log (order_id);
CREATE INDEX IF NOT EXISTS idx_bridge_log_status ON public.bridge_delivery_log (status, created_at DESC);

-- Auto-cleanup after 30 days
COMMENT ON TABLE public.bridge_delivery_log IS 'PII bridge delivery audit log. Auto-pruned by cron.';
