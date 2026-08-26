-- =============================================================================
-- Migration: KazPost Phase 2 — store API key & sender config
-- =============================================================================

-- 1. Separate table for KazPost API key (isolated with custom RLS)
CREATE TABLE IF NOT EXISTS public.store_kazpost_keys (
  store_id  uuid PRIMARY KEY REFERENCES public.stores(id) ON DELETE CASCADE,
  api_key   text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.store_kazpost_keys ENABLE ROW LEVEL SECURITY;

-- Owner can insert/update their own key, but NOT read it back
DROP POLICY IF EXISTS "store owners can write their key" ON public.store_kazpost_keys;
CREATE POLICY "store owners can write their key"
  ON public.store_kazpost_keys FOR INSERT TO public
  WITH CHECK (store_id IN (SELECT id FROM public.stores WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "store owners can update their key" ON public.store_kazpost_keys;
CREATE POLICY "store owners can update their key"
  ON public.store_kazpost_keys FOR UPDATE TO public
  USING (store_id IN (SELECT id FROM public.stores WHERE user_id = auth.uid()))
  WITH CHECK (store_id IN (SELECT id FROM public.stores WHERE user_id = auth.uid()));

-- Service role can read all (edge functions)
DROP POLICY IF EXISTS "service_role can read all" ON public.store_kazpost_keys;
CREATE POLICY "service_role can read all"
  ON public.store_kazpost_keys FOR SELECT TO service_role
  USING (true);

-- 2. KazPost sender config on stores
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS kazpost_dea_number  text,
  ADD COLUMN IF NOT EXISTS kazpost_dea_depcode text,
  ADD COLUMN IF NOT EXISTS kazpost_sender_bin  text,
  ADD COLUMN IF NOT EXISTS kazpost_sender_index text,
  ADD COLUMN IF NOT EXISTS kazpost_sender_city  text,
  ADD COLUMN IF NOT EXISTS kazpost_sender_street text,
  ADD COLUMN IF NOT EXISTS kazpost_sender_house  text,
  ADD COLUMN IF NOT EXISTS kazpost_default_product     text NOT NULL DEFAULT 'P104',
  ADD COLUMN IF NOT EXISTS kazpost_default_send_method text NOT NULL DEFAULT '2',
  ADD COLUMN IF NOT EXISTS kazpost_default_mail_ctg    text NOT NULL DEFAULT '4';

-- 3. RPC: check if store has a KazPost key (without revealing it)
CREATE OR REPLACE FUNCTION public.check_store_has_kazpost_key(p_store_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM store_kazpost_keys WHERE store_id = p_store_id);
$$;
