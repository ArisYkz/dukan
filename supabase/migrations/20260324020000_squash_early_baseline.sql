-- ──────────────────────────────────────────────────────────────────────────────
-- Squashed baseline: replaces the first 18 iterative migrations (2026-03-22–24)
-- that incrementally built the core schema. This file is idempotent — safe to
-- run on an existing database (everything uses IF NOT EXISTS / OR REPLACE).
--
-- Replaced files (preserved for history, no longer individually applied):
--   20260322081848_*  – initial schema (profiles, stores, products, orders, items)
--   20260322081910_*  – tighten insert policies
--   20260322092513_*  – pgcrypto, store/order columns, order_contacts, payment_attempts
--   20260323135527_*  – product-images delete policy
--   20260323144555_*  – hero columns, product_images table, extra buckets
--   20260323150805_*  – public order viewing, stock decrement trigger
--   20260323151949_*  – anon update policy
--   20260323153750_*  – kaspi columns
--   20260323162410_*  – orders status check constraint
--   20260323164347_*  – product_variants
--   20260323165828_*  – pg_cron, pg_net
--   20260323174550_*  – plan_type, subscription_active
--   20260323205843_*  – social_platform, category
--   20260323223839_*  – tiktok_handle, show_* booleans
--   20260323232837_*  – stock triggers (decrement on insert, restore on cancel)
--   20260323234044_*  – subscription screenshot/status
--   20260324002704_*  – realtime publication for stores
--   20260324005651_*  – reference_code
-- ──────────────────────────────────────────────────────────────────────────────

-- 1. Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 2. Sequences ────────────────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.order_public_seq START 100;

-- 3. Helper: updated_at trigger ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 4. Profiles ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY IF NOT EXISTS "Users can view their own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can insert their own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email))
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 5. Stores ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.stores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  instagram TEXT,
  telegram_chat_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Anyone can view stores"
  ON public.stores FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Owners can insert stores"
  ON public.stores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Owners can update stores"
  ON public.stores FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Owners can delete stores"
  ON public.stores FOR DELETE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_stores_updated_at ON public.stores;
CREATE TRIGGER update_stores_updated_at
  BEFORE UPDATE ON public.stores FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Iterative store columns
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS payment_qr_image text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS hero_image_url text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS hero_title text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS hero_subtitle text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS kaspi_phone text DEFAULT NULL;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS kaspi_name text DEFAULT NULL;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS plan_type text NOT NULL DEFAULT 'free';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS subscription_active boolean NOT NULL DEFAULT false;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS social_platform text NOT NULL DEFAULT 'instagram';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS tiktok_handle text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS show_instagram boolean NOT NULL DEFAULT true;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS show_tiktok boolean NOT NULL DEFAULT false;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS show_telegram boolean NOT NULL DEFAULT false;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS subscription_screenshot_url text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'none';

-- 6. Products ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price INTEGER NOT NULL CHECK (price >= 0),
  description TEXT,
  image_url TEXT,
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Anyone can view active products"
  ON public.products FOR SELECT USING (
    is_active = true OR EXISTS (
      SELECT 1 FROM public.stores WHERE stores.id = products.store_id AND stores.user_id = auth.uid()
    )
  );
CREATE POLICY IF NOT EXISTS "Store owners can insert products"
  ON public.products FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.stores WHERE stores.id = products.store_id AND stores.user_id = auth.uid())
  );
CREATE POLICY IF NOT EXISTS "Store owners can update products"
  ON public.products FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.stores WHERE stores.id = products.store_id AND stores.user_id = auth.uid())
  );
CREATE POLICY IF NOT EXISTS "Store owners can delete products"
  ON public.products FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.stores WHERE stores.id = products.store_id AND stores.user_id = auth.uid())
  );

DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category text DEFAULT NULL;

-- 7. Orders ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  total_price INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Drop old constraint name before re-creating
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status = ANY (ARRAY[
    'new', 'awaiting_verification', 'paid_confirmed', 'payment_rejected',
    'confirmed', 'shipped', 'delivered', 'cancelled'
  ]));

-- Iterative order columns
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS public_order_id text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_phone_hash text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS reference_code text DEFAULT null;

-- Make public_order_id / phone_hash not-null after backfill (safe for existing rows)
ALTER TABLE public.orders ALTER COLUMN public_order_id SET NOT NULL;
ALTER TABLE public.orders ALTER COLUMN customer_phone_hash SET NOT NULL;

-- Public order ID sequence trigger
CREATE OR REPLACE FUNCTION public.set_order_public_id()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.public_order_id IS NULL THEN
    NEW.public_order_id := 'Q-' || lpad(nextval('public.order_public_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_order_public_id ON public.orders;
CREATE TRIGGER trg_set_order_public_id
  BEFORE INSERT ON public.orders FOR EACH ROW
  EXECUTE FUNCTION public.set_order_public_id();

-- Policies
CREATE POLICY IF NOT EXISTS "Anyone can view order by id"
  ON public.orders FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
DROP POLICY IF EXISTS "Store owners can view their orders" ON public.orders;
DROP POLICY IF EXISTS "Store owners can view public order ids" ON public.orders;

CREATE POLICY "Anyone can create orders with valid data"
  ON public.orders FOR INSERT TO public
  WITH CHECK (
    customer_name IS NOT NULL AND length(trim(customer_name)) > 0
    AND customer_phone IS NOT NULL AND length(trim(customer_phone)) >= 6
    AND customer_phone_hash IS NOT NULL AND length(customer_phone_hash) > 10
    AND customer_address IS NOT NULL AND length(trim(customer_address)) > 0
    AND total_price > 0
    AND status IN ('new', 'awaiting_verification', 'payment_rejected', 'paid_confirmed',
                   'confirmed', 'shipped', 'delivered', 'cancelled')
    AND EXISTS (SELECT 1 FROM public.stores WHERE stores.id = orders.store_id)
  );

CREATE POLICY "Store owners can update orders"
  ON public.orders FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.stores WHERE stores.id = orders.store_id AND stores.user_id = auth.uid())
  );

CREATE POLICY "Anon can update order status to awaiting_verification"
  ON public.orders FOR UPDATE TO anon
  USING (true)
  WITH CHECK (status = 'awaiting_verification');

DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Order items ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  product_price INTEGER NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0)
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Anyone can view order items for their order"
  ON public.order_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;
CREATE POLICY "Anyone can create order items with valid order"
  ON public.order_items FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id)
  );

-- 9. Product images ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  image_url text NOT NULL,
  position integer DEFAULT 0,
  is_main boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Anyone can view product images"
  ON public.product_images FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Store owners can manage product images"
  ON public.product_images FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.products p JOIN public.stores s ON s.id = p.store_id
      WHERE p.id = product_images.product_id AND s.user_id = auth.uid()
    )
  );

-- 10. Product variants ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_type text NOT NULL,
  variant_value text NOT NULL,
  price_adjustment integer DEFAULT 0,
  position integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Anyone can view product variants"
  ON public.product_variants FOR SELECT TO public USING (true);

CREATE POLICY IF NOT EXISTS "Store owners can manage product variants"
  ON public.product_variants FOR ALL TO public USING (
    EXISTS (
      SELECT 1 FROM products p JOIN stores s ON s.id = p.store_id
      WHERE p.id = product_variants.product_id AND s.user_id = auth.uid()
    )
  );

-- 11. Order contacts ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.order_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_phone text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.order_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Store owners can view contact phones"
  ON public.order_contacts FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = order_contacts.store_id AND stores.user_id = auth.uid()
    )
  );

-- 12. Payment attempts ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  phone_hash text NOT NULL,
  requester_ip text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'rejected', 'suspicious')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  resolved_at timestamp with time zone
);

ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Store owners can view payment attempts"
  ON public.payment_attempts FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.stores WHERE stores.id = payment_attempts.store_id AND stores.user_id = auth.uid())
  );

CREATE POLICY IF NOT EXISTS "Store owners can update payment attempts"
  ON public.payment_attempts FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.stores WHERE stores.id = payment_attempts.store_id AND stores.user_id = auth.uid())
  );

-- 13. Stock management ────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.decrement_stock_on_payment() CASCADE;

CREATE OR REPLACE FUNCTION public.decrement_stock_on_order_item_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.products
  SET stock = GREATEST(0, stock - NEW.quantity)
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_decrement_stock_on_order_item
  AFTER INSERT ON public.order_items FOR EACH ROW
  EXECUTE FUNCTION public.decrement_stock_on_order_item_insert();

CREATE OR REPLACE FUNCTION public.restore_stock_on_cancel()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status IN ('cancelled', 'payment_rejected')
     AND OLD.status NOT IN ('cancelled', 'payment_rejected') THEN
    UPDATE public.products p
    SET stock = p.stock + oi.quantity
    FROM public.order_items oi
    WHERE oi.order_id = NEW.id AND p.id = oi.product_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_restore_stock_on_cancel
  AFTER UPDATE ON public.orders FOR EACH ROW
  EXECUTE FUNCTION public.restore_stock_on_cancel();

-- 14. Store verification logic ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.recompute_store_verification(_store_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.stores
  SET is_verified = (SELECT count(*) >= 5 FROM public.orders
                     WHERE orders.store_id = _store_id AND orders.status = 'paid_confirmed')
  WHERE id = _store_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_store_verification_trigger()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.recompute_store_verification(COALESCE(NEW.store_id, OLD.store_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_recompute_store_verification ON public.orders;
CREATE TRIGGER trg_recompute_store_verification
  AFTER INSERT OR UPDATE OF status OR DELETE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_store_verification_trigger();

-- 15. Storage buckets ─────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('store-assets', 'store-assets', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('qr-codes', 'qr-codes', true)
ON CONFLICT (id) DO NOTHING;

-- Product-images policies
CREATE POLICY IF NOT EXISTS "Anyone can view product images"
  ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY IF NOT EXISTS "Authenticated users can upload product images"
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');
CREATE POLICY IF NOT EXISTS "Authenticated users can update product images"
  ON storage.objects FOR UPDATE USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');
CREATE POLICY IF NOT EXISTS "Authenticated users can delete product images"
  ON storage.objects FOR DELETE USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');
CREATE POLICY IF NOT EXISTS "Owners can delete product images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Store-assets policies
CREATE POLICY IF NOT EXISTS "Public read store-assets"
  ON storage.objects FOR SELECT USING (bucket_id = 'store-assets');
CREATE POLICY IF NOT EXISTS "Auth upload store-assets"
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'store-assets' AND auth.role() = 'authenticated');
CREATE POLICY IF NOT EXISTS "Auth update store-assets"
  ON storage.objects FOR UPDATE USING (bucket_id = 'store-assets' AND auth.role() = 'authenticated');
CREATE POLICY IF NOT EXISTS "Auth delete store-assets"
  ON storage.objects FOR DELETE USING (bucket_id = 'store-assets' AND auth.role() = 'authenticated');

-- QR-codes policies
CREATE POLICY IF NOT EXISTS "Public read qr-codes"
  ON storage.objects FOR SELECT USING (bucket_id = 'qr-codes');
CREATE POLICY IF NOT EXISTS "Auth upload qr-codes"
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'qr-codes' AND auth.role() = 'authenticated');
CREATE POLICY IF NOT EXISTS "Auth update qr-codes"
  ON storage.objects FOR UPDATE USING (bucket_id = 'qr-codes' AND auth.role() = 'authenticated');
CREATE POLICY IF NOT EXISTS "Auth delete qr-codes"
  ON storage.objects FOR DELETE USING (bucket_id = 'qr-codes' AND auth.role() = 'authenticated');

-- 16. Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_stores_slug ON public.stores(slug);
CREATE INDEX IF NOT EXISTS idx_stores_user_id ON public.stores(user_id);
CREATE INDEX IF NOT EXISTS idx_products_store_id ON public.products(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON public.orders(store_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE UNIQUE INDEX IF NOT EXISTS orders_public_order_id_key ON public.orders(public_order_id);
CREATE INDEX IF NOT EXISTS payment_attempts_order_id_idx ON public.payment_attempts(order_id);
CREATE INDEX IF NOT EXISTS payment_attempts_store_id_idx ON public.payment_attempts(store_id);
CREATE INDEX IF NOT EXISTS payment_attempts_phone_hash_idx ON public.payment_attempts(phone_hash);
CREATE INDEX IF NOT EXISTS payment_attempts_requester_ip_idx ON public.payment_attempts(requester_ip);

-- 17. Realtime ─────────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.stores;
