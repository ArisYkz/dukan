
-- Add total_earned and is_paused columns to stores
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS total_earned numeric NOT NULL DEFAULT 0;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS is_paused boolean NOT NULL DEFAULT false;

-- Create trigger function to update total_earned on order status change
CREATE OR REPLACE FUNCTION public.update_store_total_earned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _confirmed_statuses text[] := ARRAY['paid_confirmed', 'confirmed', 'shipped', 'delivered'];
  _old_is_confirmed boolean;
  _new_is_confirmed boolean;
  _store_plan text;
  _new_total numeric;
BEGIN
  _old_is_confirmed := OLD.status = ANY(_confirmed_statuses);
  _new_is_confirmed := NEW.status = ANY(_confirmed_statuses);

  -- Only act when confirmation status changes
  IF _old_is_confirmed = _new_is_confirmed THEN
    RETURN NEW;
  END IF;

  IF _new_is_confirmed AND NOT _old_is_confirmed THEN
    -- Order became confirmed: add to total
    UPDATE public.stores
    SET total_earned = total_earned + NEW.total_price
    WHERE id = NEW.store_id;
  ELSIF _old_is_confirmed AND NOT _new_is_confirmed THEN
    -- Order un-confirmed (e.g. cancelled): subtract
    UPDATE public.stores
    SET total_earned = GREATEST(0, total_earned - OLD.total_price)
    WHERE id = NEW.store_id;
  END IF;

  -- Check if store should be paused
  SELECT plan_type, total_earned INTO _store_plan, _new_total
  FROM public.stores WHERE id = NEW.store_id;

  IF _store_plan = 'free' AND _new_total >= 12000 THEN
    UPDATE public.stores SET is_paused = true WHERE id = NEW.store_id;
  ELSIF _store_plan != 'free' OR _new_total < 12000 THEN
    UPDATE public.stores SET is_paused = false WHERE id = NEW.store_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_update_store_total_earned ON public.orders;
CREATE TRIGGER trg_update_store_total_earned
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_store_total_earned();

-- Backfill total_earned from existing orders
UPDATE public.stores s
SET total_earned = COALESCE((
  SELECT SUM(o.total_price)
  FROM public.orders o
  WHERE o.store_id = s.id
    AND o.status IN ('paid_confirmed', 'confirmed', 'shipped', 'delivered')
), 0);

-- Set is_paused for existing free stores over limit
UPDATE public.stores
SET is_paused = true
WHERE plan_type = 'free' AND total_earned >= 12000;
