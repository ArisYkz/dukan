
-- Create reviews table
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_phone_hash TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(order_id, product_id)
);

-- Add average_rating and review_count to stores
ALTER TABLE public.stores ADD COLUMN average_rating NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.stores ADD COLUMN review_count INTEGER NOT NULL DEFAULT 0;

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read reviews
CREATE POLICY "Anyone can view reviews" ON public.reviews FOR SELECT TO public USING (true);

-- Anyone can insert reviews (validated in app logic via order check)
CREATE POLICY "Anyone can insert reviews" ON public.reviews FOR INSERT TO public WITH CHECK (true);

-- Create function to update store rating on review insert
CREATE OR REPLACE FUNCTION public.update_store_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE stores
  SET average_rating = (
    SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE store_id = NEW.store_id
  ),
  review_count = (
    SELECT COUNT(*) FROM reviews WHERE store_id = NEW.store_id
  )
  WHERE id = NEW.store_id;
  RETURN NEW;
END;
$$;

-- Trigger on review insert
CREATE TRIGGER trg_update_store_rating
AFTER INSERT ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_store_rating();
