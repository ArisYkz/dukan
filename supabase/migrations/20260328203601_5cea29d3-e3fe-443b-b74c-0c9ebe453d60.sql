ALTER TABLE public.orders ADD COLUMN promo_code text DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN discount_amount integer DEFAULT 0;