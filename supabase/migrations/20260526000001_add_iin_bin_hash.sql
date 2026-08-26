-- Add iin_bin_hash column for IIN/BIN uniqueness enforcement
-- Stores SHA-256 hash of the raw IIN/BIN (raw PII remains on Hoster.kz bridge only)
ALTER TABLE stores ADD COLUMN IF NOT EXISTS iin_bin_hash text UNIQUE;
