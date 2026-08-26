-- Add kazpost_barcode column for KazPost tracking integration (Phase 1)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS kazpost_barcode text;
