
CREATE TABLE public.store_promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  code text NOT NULL,
  discount_type text NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent', 'amount')),
  discount_value numeric NOT NULL DEFAULT 0,
  min_cart_amount integer DEFAULT 0,
  min_quantity integer DEFAULT 0,
  start_date timestamptz NOT NULL DEFAULT now(),
  end_date timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  used_count integer NOT NULL DEFAULT 0,
  max_uses integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(store_id, code)
);

ALTER TABLE public.store_promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store owners can manage their promo codes"
ON public.store_promo_codes FOR ALL
USING (EXISTS (SELECT 1 FROM public.stores WHERE stores.id = store_promo_codes.store_id AND stores.user_id = auth.uid()));

CREATE POLICY "Anyone can read active promo codes"
ON public.store_promo_codes FOR SELECT
USING (is_active = true);
