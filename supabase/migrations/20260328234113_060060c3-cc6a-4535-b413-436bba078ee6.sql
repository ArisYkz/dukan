
-- Add total_views and total_sales_count columns to stores
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS total_views integer NOT NULL DEFAULT 0;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS total_sales_count integer NOT NULL DEFAULT 0;

-- Function to increment total_sales_count when order status changes to a confirmed status
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
  _old_is_confirmed := OLD.status = ANY(_confirmed_statuses);
  _new_is_confirmed := NEW.status = ANY(_confirmed_statuses);

  IF _new_is_confirmed AND NOT _old_is_confirmed THEN
    UPDATE public.stores
    SET total_sales_count = total_sales_count + 1
    WHERE id = NEW.store_id;
  ELSIF _old_is_confirmed AND NOT _new_is_confirmed THEN
    UPDATE public.stores
    SET total_sales_count = GREATEST(0, total_sales_count - 1)
    WHERE id = NEW.store_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger for sales count
CREATE TRIGGER trg_update_store_sales_count
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_store_sales_count();

-- Function to increment total_views (called via RPC from storefront)
CREATE OR REPLACE FUNCTION public.increment_store_views(_store_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.stores
  SET total_views = total_views + 1
  WHERE id = _store_id;
END;
$$;
