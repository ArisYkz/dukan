-- Enforce FREE_PRODUCT_LIMIT (5) server-side via a BEFORE INSERT trigger.
-- Previously, the limit was only checked client-side, allowing free-tier users
-- to bypass it via direct API calls.

CREATE OR REPLACE FUNCTION public.check_free_product_limit()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _plan_type TEXT;
  _product_count INTEGER;
BEGIN
  -- Look up the store owner's plan type
  SELECT p.plan_type INTO _plan_type
  FROM public.profiles p
  JOIN public.stores s ON s.user_id = p.user_id
  WHERE s.id = NEW.store_id;

  IF _plan_type = 'free' THEN
    SELECT COUNT(*) INTO _product_count
    FROM public.products
    WHERE store_id = NEW.store_id;

    IF _product_count >= 5 THEN
      RAISE EXCEPTION 'Free plan limit reached: maximum 5 products per store'
        USING HINT = 'Upgrade to Pro to create more products';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_free_product_limit ON public.products;
CREATE TRIGGER trg_check_free_product_limit
  BEFORE INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.check_free_product_limit();
