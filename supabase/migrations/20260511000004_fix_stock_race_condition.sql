-- Fix stock race condition: make stock decrement atomic so two concurrent
-- buyers can't oversell the last item.
--
-- Previous approach: UPDATE ... SET stock = GREATEST(0, stock - quantity)
--   This silently clamped stock to 0 after overselling, but both orders
--   still succeeded. No exception was raised.
--
-- New approach: UPDATE ... SET stock = stock - quantity WHERE stock >= quantity
--   If the UPDATE affects 0 rows, stock was insufficient and we RAISE,
--   rolling back the order_items INSERT (and the calling transaction).

CREATE OR REPLACE FUNCTION public.decrement_stock_on_order_item_insert()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _updated INTEGER;
BEGIN
  UPDATE public.products
  SET stock = stock - NEW.quantity
  WHERE id = NEW.product_id
    AND stock >= NEW.quantity;

  GET DIAGNOSTICS _updated = ROW_COUNT;

  IF _updated = 0 THEN
    RAISE EXCEPTION 'Insufficient stock for product % (ordered %)', NEW.product_id, NEW.quantity
      USING HINT = 'Stock was depleted by another concurrent order';
  END IF;

  RETURN NEW;
END;
$$;
