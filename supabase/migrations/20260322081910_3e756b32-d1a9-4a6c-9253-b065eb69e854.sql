
-- Tighten the orders insert policy to require valid data
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can create orders with valid data" ON public.orders;
CREATE POLICY "Anyone can create orders with valid data" ON public.orders 
  FOR INSERT WITH CHECK (
    customer_name IS NOT NULL AND length(trim(customer_name)) > 0
    AND customer_phone IS NOT NULL AND length(trim(customer_phone)) >= 10
    AND customer_address IS NOT NULL AND length(trim(customer_address)) > 0
    AND total_price > 0
  );

-- Tighten order_items insert policy
DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;
DROP POLICY IF EXISTS "Anyone can create order items with valid order" ON public.order_items;
CREATE POLICY "Anyone can create order items with valid order" ON public.order_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id)
  );
