-- Fix total_sales_count trigger to also fire on INSERT
-- Previously only fired on UPDATE OF status, missing orders created with a confirmed status
-- e.g., manual orders created via the dashboard form with status = 'paid_confirmed'

CREATE OR REPLACE FUNCTION public.update_store_sales_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _confirmed_statuses text[] := ARRAY['paid_confirmed', 'confirmed', 'shipped', 'delivered'];
  _old_is_confirmed boolean;
  _new_is_confirmed boolean;
BEGIN
  _new_is_confirmed := NEW.status = ANY(_confirmed_statuses);

  IF TG_OP = 'INSERT' THEN
    IF _new_is_confirmed THEN
      UPDATE public.stores
      SET total_sales_count = total_sales_count + 1
      WHERE id = NEW.store_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    _old_is_confirmed := OLD.status = ANY(_confirmed_statuses);

    IF _new_is_confirmed AND NOT _old_is_confirmed THEN
      UPDATE public.stores
      SET total_sales_count = total_sales_count + 1
      WHERE id = NEW.store_id;
    ELSIF _old_is_confirmed AND NOT _new_is_confirmed THEN
      UPDATE public.stores
      SET total_sales_count = GREATEST(0, total_sales_count - 1)
      WHERE id = NEW.store_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop old trigger and recreate to fire on INSERT too
DROP TRIGGER IF EXISTS trg_update_store_sales_count ON public.orders;
CREATE TRIGGER trg_update_store_sales_count
  AFTER INSERT OR UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_store_sales_count();

-- Backfill total_sales_count for existing orders that were inserted with confirmed status
-- and never counted because the old trigger only fired on UPDATE
UPDATE public.stores s
SET total_sales_count = (
  SELECT COUNT(*)
  FROM public.orders o
  WHERE o.store_id = s.id
    AND o.status = ANY (ARRAY['paid_confirmed', 'confirmed', 'shipped', 'delivered'])
);
