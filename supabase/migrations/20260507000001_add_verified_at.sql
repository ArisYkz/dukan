-- Add verified_at timestamp for data residency compliance
-- When a store is KGD-verified, this marks when verification happened.
-- PII (IIN/BIN, legal name) is stored exclusively on Hoster.kZ.

ALTER TABLE stores ADD COLUMN IF NOT EXISTS verified_at timestamptz;
