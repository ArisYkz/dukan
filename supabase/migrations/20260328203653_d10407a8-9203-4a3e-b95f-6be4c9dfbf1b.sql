CREATE OR REPLACE FUNCTION public.increment_promo_usage(_store_id uuid, _code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.store_promo_codes
  SET used_count = used_count + 1
  WHERE store_id = _store_id
    AND code = _code;
END;
$$;