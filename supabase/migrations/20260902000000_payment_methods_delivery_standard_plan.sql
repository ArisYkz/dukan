-- Payment options + delivery carriers + single Standard plan
ALTER TABLE stores ADD COLUMN IF NOT EXISTS payment_methods   jsonb NOT NULL DEFAULT '{}';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS delivery_carriers jsonb NOT NULL DEFAULT '[]';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method    text;

-- Single plan: fold legacy tier values into 'standard' (expiry preserved)
UPDATE profiles SET plan_type = 'standard' WHERE plan_type IN ('pro_month', 'pro_year', 'pro', 'pro_monthly');
UPDATE stores   SET plan_type = 'standard' WHERE plan_type IN ('pro_month', 'pro_year', 'pro', 'pro_monthly');
