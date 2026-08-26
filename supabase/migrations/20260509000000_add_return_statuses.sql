-- Add returned/refunded order statuses for off-platform return handling
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status = ANY (ARRAY[
    'new', 'awaiting_verification', 'paid_confirmed', 'payment_rejected',
    'confirmed', 'shipped', 'delivered', 'cancelled', 'returned', 'refunded'
  ]));
