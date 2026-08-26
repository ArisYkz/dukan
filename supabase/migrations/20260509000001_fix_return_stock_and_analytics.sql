-- Restore stock when orders transition to returned/refunded
CREATE OR REPLACE FUNCTION public.restore_stock_on_cancel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _item RECORD;
BEGIN
  IF NEW.status IN ('cancelled', 'payment_rejected', 'returned', 'refunded')
     AND OLD.status NOT IN ('cancelled', 'payment_rejected', 'returned', 'refunded') THEN

    FOR _item IN SELECT product_id, quantity FROM public.order_items WHERE order_id = NEW.id
    LOOP
      UPDATE public.products
      SET stock = stock + _item.quantity
      WHERE id = _item.product_id;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;
