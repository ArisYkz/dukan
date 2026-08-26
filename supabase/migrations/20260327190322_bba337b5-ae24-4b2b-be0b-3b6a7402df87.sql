
-- Singleton table to track the getUpdates offset for callback queries
CREATE TABLE public.telegram_bot_state (
  id int PRIMARY KEY CHECK (id = 1),
  update_offset bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed the single row
INSERT INTO public.telegram_bot_state (id, update_offset) VALUES (1, 0);

-- Enable RLS (only service_role should access this)
ALTER TABLE public.telegram_bot_state ENABLE ROW LEVEL SECURITY;
