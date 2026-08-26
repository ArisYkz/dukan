-- Allow anyone to view a specific order by its UUID (for public tracking page)
-- First drop old redundant policies
DROP POLICY IF EXISTS "Store owners can view public order ids" ON public.orders;
DROP POLICY IF EXISTS "Store owners can view their orders" ON public.orders;

CREATE POLICY "Anyone can view order by id" ON public.orders
  FOR SELECT USING (true);

-- Allow anon to view order_items for their order
DROP POLICY IF EXISTS "Store owners can view order items" ON public.order_items;
DROP POLICY IF EXISTS "Anyone can view order items for their order" ON public.order_items;

CREATE POLICY "Anyone can view order items for their order" ON public.order_items
  FOR SELECT USING (true);

-- Stock decrement trigger: when order status changes to paid_confirmed
CREATE OR REPLACE FUNCTION public.decrement_stock_on_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'paid_confirmed' AND OLD.status != 'paid_confirmed' THEN
    UPDATE public.products p
    SET stock = GREATEST(0, p.stock - oi.quantity)
    FROM public.order_items oi
    WHERE oi.order_id = NEW.id AND p.id = oi.product_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_decrement_stock_on_payment
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_stock_on_payment();