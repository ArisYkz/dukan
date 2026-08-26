
CREATE TABLE public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_type text NOT NULL,
  variant_value text NOT NULL,
  price_adjustment integer DEFAULT 0,
  position integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view product variants"
ON public.product_variants FOR SELECT
TO public
USING (true);

CREATE POLICY "Store owners can manage product variants"
ON public.product_variants FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1
    FROM products p
    JOIN stores s ON s.id = p.store_id
    WHERE p.id = product_variants.product_id AND s.user_id = auth.uid()
  )
);
