-- DOKAN full schema + seed (generated 2026-08-26)
-- Paste the ENTIRE file into the Supabase SQL Editor and Run once.
-- Idempotent: resets public schema, then applies all migrations + demo seed.

----------------------------------------------
-- 0. RESET public schema
----------------------------------------------
drop schema if exists public cascade;


create schema public;


grant all on schema public to postgres;


grant all on schema public to anon;


grant all on schema public to authenticated;


grant all on schema public to service_role;



----------------------------------------------
-- MIGRATION: 20260322081848_273808fc-813b-464d-8789-47355b2914ad.sql
----------------------------------------------

-- Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;



-- Profiles table
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


DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;


DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;


DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;


CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;


CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();



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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();



-- Stores table
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



DROP TRIGGER IF EXISTS update_stores_updated_at ON public.stores;


DROP POLICY IF EXISTS "Anyone can view stores" ON public.stores;


DROP POLICY IF EXISTS "Owners can insert stores" ON public.stores;


DROP POLICY IF EXISTS "Owners can update stores" ON public.stores;


DROP POLICY IF EXISTS "Owners can delete stores" ON public.stores;

DROP POLICY IF EXISTS "Anyone can view stores" ON public.stores;


CREATE POLICY "Anyone can view stores" ON public.stores FOR SELECT USING (true);

DROP POLICY IF EXISTS "Owners can insert stores" ON public.stores;

CREATE POLICY "Owners can insert stores" ON public.stores FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners can update stores" ON public.stores;

CREATE POLICY "Owners can update stores" ON public.stores FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners can delete stores" ON public.stores;

CREATE POLICY "Owners can delete stores" ON public.stores FOR DELETE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_stores_updated_at ON public.stores;


CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON public.stores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();



-- Products table
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



DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;


DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;


DROP POLICY IF EXISTS "Store owners can insert products" ON public.products;


DROP POLICY IF EXISTS "Store owners can update products" ON public.products;


DROP POLICY IF EXISTS "Store owners can delete products" ON public.products;

DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;


CREATE POLICY "Anyone can view active products" ON public.products FOR SELECT USING (is_active = true OR EXISTS (SELECT 1 FROM public.stores WHERE stores.id = products.store_id AND stores.user_id = auth.uid()));

DROP POLICY IF EXISTS "Store owners can insert products" ON public.products;

CREATE POLICY "Store owners can insert products" ON public.products FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.stores WHERE stores.id = products.store_id AND stores.user_id = auth.uid()));

DROP POLICY IF EXISTS "Store owners can update products" ON public.products;

CREATE POLICY "Store owners can update products" ON public.products FOR UPDATE USING (EXISTS (SELECT 1 FROM public.stores WHERE stores.id = products.store_id AND stores.user_id = auth.uid()));

DROP POLICY IF EXISTS "Store owners can delete products" ON public.products;

CREATE POLICY "Store owners can delete products" ON public.products FOR DELETE USING (EXISTS (SELECT 1 FROM public.stores WHERE stores.id = products.store_id AND stores.user_id = auth.uid()));

DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;


CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();



-- Orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  total_price INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);



ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;



DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;


DROP POLICY IF EXISTS "Store owners can view their orders" ON public.orders;


DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;


DROP POLICY IF EXISTS "Store owners can update orders" ON public.orders;

DROP POLICY IF EXISTS "Store owners can view their orders" ON public.orders;


CREATE POLICY "Store owners can view their orders" ON public.orders FOR SELECT USING (EXISTS (SELECT 1 FROM public.stores WHERE stores.id = orders.store_id AND stores.user_id = auth.uid()));

DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;

CREATE POLICY "Anyone can create orders" ON public.orders FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Store owners can update orders" ON public.orders;

CREATE POLICY "Store owners can update orders" ON public.orders FOR UPDATE USING (EXISTS (SELECT 1 FROM public.stores WHERE stores.id = orders.store_id AND stores.user_id = auth.uid()));

DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;


CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();



-- Order items table
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  product_price INTEGER NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0)
);



ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;



DROP POLICY IF EXISTS "Store owners can view order items" ON public.order_items;


DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;

DROP POLICY IF EXISTS "Store owners can view order items" ON public.order_items;


CREATE POLICY "Store owners can view order items" ON public.order_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.orders JOIN public.stores ON stores.id = orders.store_id WHERE orders.id = order_items.order_id AND stores.user_id = auth.uid()));

DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;

CREATE POLICY "Anyone can create order items" ON public.order_items FOR INSERT WITH CHECK (true);

DO $$ BEGIN EXECUTE $dkan_stmt$

-- Product images storage
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true) ON CONFLICT (id) DO NOTHING;$dkan_stmt$; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped storage stmt: %', SQLERRM; END $$;

DO $$ BEGIN EXECUTE $dkan_stmt$

DROP POLICY IF EXISTS "Anyone can view product images" ON storage.objects;$dkan_stmt$; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped storage stmt: %', SQLERRM; END $$;

DO $$ BEGIN EXECUTE $dkan_stmt$
DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;$dkan_stmt$; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped storage stmt: %', SQLERRM; END $$;

DO $$ BEGIN EXECUTE $dkan_stmt$
DROP POLICY IF EXISTS "Authenticated users can update product images" ON storage.objects;$dkan_stmt$; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped storage stmt: %', SQLERRM; END $$;

DO $$ BEGIN EXECUTE $dkan_stmt$
DROP POLICY IF EXISTS "Authenticated users can delete product images" ON storage.objects;$dkan_stmt$; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped storage stmt: %', SQLERRM; END $$;

DO $$ BEGIN EXECUTE $dkan_stmt$DROP POLICY IF EXISTS "Anyone can view product images" ON storage.objects;


CREATE POLICY "Anyone can view product images" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');$dkan_stmt$; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped storage stmt: %', SQLERRM; END $$;

DO $$ BEGIN EXECUTE $dkan_stmt$DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;

CREATE POLICY "Authenticated users can upload product images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');$dkan_stmt$; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped storage stmt: %', SQLERRM; END $$;

DO $$ BEGIN EXECUTE $dkan_stmt$DROP POLICY IF EXISTS "Authenticated users can update product images" ON storage.objects;

CREATE POLICY "Authenticated users can update product images" ON storage.objects FOR UPDATE USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');$dkan_stmt$; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped storage stmt: %', SQLERRM; END $$;

DO $$ BEGIN EXECUTE $dkan_stmt$DROP POLICY IF EXISTS "Authenticated users can delete product images" ON storage.objects;

CREATE POLICY "Authenticated users can delete product images" ON storage.objects FOR DELETE USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');$dkan_stmt$; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped storage stmt: %', SQLERRM; END $$;



-- Indexes
CREATE INDEX IF NOT EXISTS idx_stores_slug ON public.stores(slug);


CREATE INDEX IF NOT EXISTS idx_stores_user_id ON public.stores(user_id);


CREATE INDEX IF NOT EXISTS idx_products_store_id ON public.products(store_id);


CREATE INDEX IF NOT EXISTS idx_orders_store_id ON public.orders(store_id);


CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);




----------------------------------------------
-- MIGRATION: 20260322081910_3e756b32-d1a9-4a6c-9253-b065eb69e854.sql
----------------------------------------------

-- Tighten the orders insert policy to require valid data
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;


DROP POLICY IF EXISTS "Anyone can create orders with valid data" ON public.orders;

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

DROP POLICY IF EXISTS "Anyone can create order items with valid order" ON public.order_items;

CREATE POLICY "Anyone can create order items with valid order" ON public.order_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id)
  );




----------------------------------------------
-- MIGRATION: 20260322092513_0ea168c8-99a9-4923-9ef6-9bb4dc4cd391.sql
----------------------------------------------
create extension if not exists pgcrypto schema public;



alter table public.stores
  add column if not exists payment_qr_image text,
  add column if not exists is_verified boolean not null default false;



create sequence if not exists public.order_public_seq start 100;



alter table public.orders
  add column if not exists public_order_id text,
  add column if not exists customer_phone_hash text;



update public.orders
set public_order_id = 'Q-' || lpad(nextval('public.order_public_seq')::text, 6, '0')
where public_order_id is null;



update public.orders
set customer_phone_hash = encode(extensions.digest(coalesce(customer_phone, '') || '|' || store_id::text, 'sha256'), 'hex')
where customer_phone_hash is null;



alter table public.orders
  alter column public_order_id set not null,
  alter column customer_phone_hash set not null;



create unique index if not exists orders_public_order_id_key on public.orders(public_order_id);



create or replace function public.set_order_public_id()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.public_order_id is null then
    new.public_order_id := 'Q-' || lpad(nextval('public.order_public_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;



drop trigger if exists trg_set_order_public_id on public.orders;

DROP TRIGGER IF EXISTS trg_set_order_public_id ON public.orders;

create trigger trg_set_order_public_id
before insert on public.orders
for each row
execute function public.set_order_public_id();



create table if not exists public.order_contacts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  customer_phone text not null,
  created_at timestamp with time zone not null default now()
);



alter table public.order_contacts enable row level security;



drop policy if exists "Store owners can view contact phones" on public.order_contacts;

DROP POLICY IF EXISTS "Store owners can view contact phones" ON public.order_contacts;

create policy "Store owners can view contact phones"
on public.order_contacts
for select
using (
  exists (
    select 1
    from public.stores
    where stores.id = order_contacts.store_id
      and stores.user_id = auth.uid()
  )
);



create table if not exists public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  phone_hash text not null,
  requester_ip text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected', 'suspicious')),
  created_at timestamp with time zone not null default now(),
  resolved_at timestamp with time zone
);



create index if not exists payment_attempts_order_id_idx on public.payment_attempts(order_id);


create index if not exists payment_attempts_store_id_idx on public.payment_attempts(store_id);


create index if not exists payment_attempts_phone_hash_idx on public.payment_attempts(phone_hash);


create index if not exists payment_attempts_requester_ip_idx on public.payment_attempts(requester_ip);



alter table public.payment_attempts enable row level security;



drop policy if exists "Store owners can view payment attempts" on public.payment_attempts;

DROP POLICY IF EXISTS "Store owners can view payment attempts" ON public.payment_attempts;

create policy "Store owners can view payment attempts"
on public.payment_attempts
for select
using (
  exists (
    select 1
    from public.stores
    where stores.id = payment_attempts.store_id
      and stores.user_id = auth.uid()
  )
);



drop policy if exists "Store owners can update payment attempts" on public.payment_attempts;

DROP POLICY IF EXISTS "Store owners can update payment attempts" ON public.payment_attempts;

create policy "Store owners can update payment attempts"
on public.payment_attempts
for update
using (
  exists (
    select 1
    from public.stores
    where stores.id = payment_attempts.store_id
      and stores.user_id = auth.uid()
  )
);



create or replace function public.recompute_store_verification(_store_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.stores
  set is_verified = (
    select count(*) >= 5
    from public.orders
    where orders.store_id = _store_id
      and orders.status = 'paid_confirmed'
  )
  where id = _store_id;
end;
$$;



create or replace function public.handle_store_verification_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recompute_store_verification(coalesce(new.store_id, old.store_id));
  return coalesce(new, old);
end;
$$;



drop trigger if exists trg_recompute_store_verification on public.orders;

DROP TRIGGER IF EXISTS trg_recompute_store_verification ON public.orders;

create trigger trg_recompute_store_verification
after insert or update of status or delete on public.orders
for each row
execute function public.handle_store_verification_trigger();



drop trigger if exists update_orders_updated_at on public.orders;

DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;

create trigger update_orders_updated_at
before update on public.orders
for each row
execute function public.update_updated_at_column();



drop trigger if exists update_stores_updated_at on public.stores;

DROP TRIGGER IF EXISTS update_stores_updated_at ON public.stores;

create trigger update_stores_updated_at
before update on public.stores
for each row
execute function public.update_updated_at_column();



drop policy if exists "Anyone can create orders with valid data" on public.orders;

DROP POLICY IF EXISTS "Anyone can create orders with valid data" ON public.orders;

create policy "Anyone can create orders with valid data"
on public.orders
for insert
to public
with check (
  customer_name is not null
  and length(trim(customer_name)) > 0
  and customer_phone is not null
  and length(trim(customer_phone)) >= 6
  and customer_phone_hash is not null
  and length(customer_phone_hash) > 10
  and customer_address is not null
  and length(trim(customer_address)) > 0
  and total_price > 0
  and status in ('new', 'awaiting_verification', 'payment_rejected', 'paid_confirmed', 'confirmed', 'shipped', 'delivered', 'cancelled')
  and exists (select 1 from public.stores where stores.id = orders.store_id)
);



drop policy if exists "Store owners can view public order ids" on public.orders;

DROP POLICY IF EXISTS "Store owners can view public order ids" ON public.orders;

create policy "Store owners can view public order ids"
on public.orders
for select
to public
using (
  exists (
    select 1
    from public.stores
    where stores.id = orders.store_id
      and stores.user_id = auth.uid()
  )
);

DO $$ BEGIN EXECUTE $dkan_stmt$

----------------------------------------------
-- MIGRATION: 20260323135527_2db7807b-e03a-4dae-802e-220b8cd15042.sql
----------------------------------------------

-- The previous migration partially applied. The product-images upload policy already existed.
-- Just add the delete policy if it doesn't exist.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Owners can delete product images' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Owners can delete product images"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'product-images' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;$dkan_stmt$; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped storage stmt: %', SQLERRM; END $$;




----------------------------------------------
-- MIGRATION: 20260323144555_0ec27b6c-c5ce-458d-89c8-e14968e7df1e.sql
----------------------------------------------

-- Add missing columns to stores table
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS hero_image_url text;


ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS hero_title text;


ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS hero_subtitle text;



-- Create product_images table if not exists
CREATE TABLE IF NOT EXISTS public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  image_url text NOT NULL,
  position integer DEFAULT 0,
  is_main boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);



ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN EXECUTE $dkan_stmt$

-- RLS for product_images
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view product images' AND tablename = 'product_images') THEN
    CREATE POLICY "Anyone can view product images" ON public.product_images FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Store owners can manage product images' AND tablename = 'product_images') THEN
    CREATE POLICY "Store owners can manage product images" ON public.product_images FOR ALL USING (
      EXISTS (
        SELECT 1 FROM public.products p JOIN public.stores s ON s.id = p.store_id
        WHERE p.id = product_images.product_id AND s.user_id = auth.uid()
      )
    );
  END IF;
END $$;$dkan_stmt$; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped ddl-do stmt: %', SQLERRM; END $$;

DO $$ BEGIN EXECUTE $dkan_stmt$

-- Create store-assets bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('store-assets', 'store-assets', true) ON CONFLICT (id) DO NOTHING;$dkan_stmt$; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped storage stmt: %', SQLERRM; END $$;

DO $$ BEGIN EXECUTE $dkan_stmt$

-- Create qr-codes bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('qr-codes', 'qr-codes', true) ON CONFLICT (id) DO NOTHING;$dkan_stmt$; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped storage stmt: %', SQLERRM; END $$;

DO $$ BEGIN EXECUTE $dkan_stmt$DROP POLICY IF EXISTS "Public read store-assets" ON storage.objects;


-- RLS for store-assets bucket
CREATE POLICY "Public read store-assets" ON storage.objects FOR SELECT USING (bucket_id = 'store-assets');$dkan_stmt$; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped storage stmt: %', SQLERRM; END $$;

DO $$ BEGIN EXECUTE $dkan_stmt$DROP POLICY IF EXISTS "Auth upload store-assets" ON storage.objects;

CREATE POLICY "Auth upload store-assets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'store-assets' AND auth.role() = 'authenticated');$dkan_stmt$; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped storage stmt: %', SQLERRM; END $$;

DO $$ BEGIN EXECUTE $dkan_stmt$DROP POLICY IF EXISTS "Auth update store-assets" ON storage.objects;

CREATE POLICY "Auth update store-assets" ON storage.objects FOR UPDATE USING (bucket_id = 'store-assets' AND auth.role() = 'authenticated');$dkan_stmt$; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped storage stmt: %', SQLERRM; END $$;

DO $$ BEGIN EXECUTE $dkan_stmt$DROP POLICY IF EXISTS "Auth delete store-assets" ON storage.objects;

CREATE POLICY "Auth delete store-assets" ON storage.objects FOR DELETE USING (bucket_id = 'store-assets' AND auth.role() = 'authenticated');$dkan_stmt$; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped storage stmt: %', SQLERRM; END $$;

DO $$ BEGIN EXECUTE $dkan_stmt$DROP POLICY IF EXISTS "Public read qr-codes" ON storage.objects;


-- RLS for qr-codes bucket
CREATE POLICY "Public read qr-codes" ON storage.objects FOR SELECT USING (bucket_id = 'qr-codes');$dkan_stmt$; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped storage stmt: %', SQLERRM; END $$;

DO $$ BEGIN EXECUTE $dkan_stmt$DROP POLICY IF EXISTS "Auth upload qr-codes" ON storage.objects;

CREATE POLICY "Auth upload qr-codes" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'qr-codes' AND auth.role() = 'authenticated');$dkan_stmt$; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped storage stmt: %', SQLERRM; END $$;

DO $$ BEGIN EXECUTE $dkan_stmt$DROP POLICY IF EXISTS "Auth update qr-codes" ON storage.objects;

CREATE POLICY "Auth update qr-codes" ON storage.objects FOR UPDATE USING (bucket_id = 'qr-codes' AND auth.role() = 'authenticated');$dkan_stmt$; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped storage stmt: %', SQLERRM; END $$;

DO $$ BEGIN EXECUTE $dkan_stmt$DROP POLICY IF EXISTS "Auth delete qr-codes" ON storage.objects;

CREATE POLICY "Auth delete qr-codes" ON storage.objects FOR DELETE USING (bucket_id = 'qr-codes' AND auth.role() = 'authenticated');$dkan_stmt$; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped storage stmt: %', SQLERRM; END $$;




----------------------------------------------
-- MIGRATION: 20260323150805_6bf48610-4b28-4e41-a104-d0410781238d.sql
----------------------------------------------
-- Allow anyone to view a specific order by its UUID (for public tracking page)
-- First drop old redundant policies
DROP POLICY IF EXISTS "Store owners can view public order ids" ON public.orders;


DROP POLICY IF EXISTS "Store owners can view their orders" ON public.orders;

DROP POLICY IF EXISTS "Anyone can view order by id" ON public.orders;


CREATE POLICY "Anyone can view order by id" ON public.orders
  FOR SELECT USING (true);



-- Allow anon to view order_items for their order
DROP POLICY IF EXISTS "Store owners can view order items" ON public.order_items;


DROP POLICY IF EXISTS "Anyone can view order items for their order" ON public.order_items;

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

DROP TRIGGER IF EXISTS trg_decrement_stock_on_payment ON public.orders;


CREATE TRIGGER trg_decrement_stock_on_payment
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_stock_on_payment();

DROP POLICY IF EXISTS "Anon can update order status to awaiting_verification" ON public.orders;


----------------------------------------------
-- MIGRATION: 20260323151949_d95baa9a-6778-4080-9d39-04f5ed04bf6d.sql
----------------------------------------------
-- Allow anon users to update order status (for "I Have Paid" button)
CREATE POLICY "Anon can update order status to awaiting_verification"
ON public.orders
FOR UPDATE
TO anon
USING (true)
WITH CHECK (
  status = 'awaiting_verification'
);



----------------------------------------------
-- MIGRATION: 20260323153750_b4d7215b-f158-461c-836b-33815dacd587.sql
----------------------------------------------
ALTER TABLE public.stores ADD COLUMN payment_phone text DEFAULT NULL;


ALTER TABLE public.stores ADD COLUMN payment_name text DEFAULT NULL;



----------------------------------------------
-- MIGRATION: 20260323162410_d49ccbe2-8985-41fb-9c1a-fc1ddc7aac71.sql
----------------------------------------------
ALTER TABLE public.orders DROP CONSTRAINT orders_status_check;


ALTER TABLE public.orders ADD CONSTRAINT orders_status_check CHECK (status = ANY (ARRAY['new'::text, 'awaiting_verification'::text, 'paid_confirmed'::text, 'payment_rejected'::text, 'confirmed'::text, 'shipped'::text, 'delivered'::text, 'cancelled'::text]));



----------------------------------------------
-- MIGRATION: 20260323164347_23e22449-da29-4b90-b818-350a367f5323.sql
----------------------------------------------

CREATE TABLE public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_type text NOT NULL,
  variant_value text NOT NULL,
  price_adjustment integer DEFAULT 0,
  position integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);



ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view product variants" ON public.product_variants;


CREATE POLICY "Anyone can view product variants"
ON public.product_variants FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Store owners can manage product variants" ON public.product_variants;


CREATE POLICY "Store owners can manage product variants"
ON public.product_variants FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1
    FROM products p
    JOIN stores s ON s.id = p.store_id
    WHERE p.id = product_variants.product_id AND s.user_id = auth.uid()
  )
);




----------------------------------------------
-- MIGRATION: 20260323165828_92b0cc3e-5fe6-44ec-a368-1267401b06fe.sql
----------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_cron SCHEMA pg_catalog;


CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;



----------------------------------------------
-- MIGRATION: 20260323174550_f7adda4e-e87e-4394-b0f2-3e93b20d5654.sql
----------------------------------------------
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS plan_type text NOT NULL DEFAULT 'free';


ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS subscription_active boolean NOT NULL DEFAULT false;



----------------------------------------------
-- MIGRATION: 20260323205843_815ccd33-6f8d-451e-b357-c82affe23b41.sql
----------------------------------------------

ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS social_platform text NOT NULL DEFAULT 'instagram';


ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category text DEFAULT NULL;




----------------------------------------------
-- MIGRATION: 20260323223839_be4436e3-71ca-4ee1-b855-3bda6e2c5499.sql
----------------------------------------------
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS tiktok_handle text,
  ADD COLUMN IF NOT EXISTS show_instagram boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_tiktok boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_telegram boolean NOT NULL DEFAULT false;



----------------------------------------------
-- MIGRATION: 20260323232837_0c6128b5-5ff5-45eb-b983-0441bb7c2856.sql
----------------------------------------------
DROP FUNCTION IF EXISTS public.decrement_stock_on_payment() CASCADE;



CREATE OR REPLACE FUNCTION public.decrement_stock_on_order_item_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.products
  SET stock = GREATEST(0, stock - NEW.quantity)
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$;



CREATE OR REPLACE FUNCTION public.restore_stock_on_cancel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

DROP TRIGGER IF EXISTS trg_decrement_stock_on_order_item ON public.order_items;


CREATE TRIGGER trg_decrement_stock_on_order_item
AFTER INSERT ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.decrement_stock_on_order_item_insert();

DROP TRIGGER IF EXISTS trg_restore_stock_on_cancel ON public.orders;


CREATE TRIGGER trg_restore_stock_on_cancel
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.restore_stock_on_cancel();



----------------------------------------------
-- MIGRATION: 20260323234044_7f5626fe-81bf-4ea8-b639-216727836f60.sql
----------------------------------------------
ALTER TABLE public.stores 
  ADD COLUMN IF NOT EXISTS subscription_screenshot_url text,
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'none';

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='stores') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.stores; END IF; END $$;



----------------------------------------------
-- MIGRATION: 20260324005651_e1010655-5f0b-400e-8f50-fb0b28b36215.sql
----------------------------------------------
ALTER TABLE public.orders ADD COLUMN reference_code text DEFAULT null;



----------------------------------------------
-- MIGRATION: 20260324020000_squash_early_baseline.sql
----------------------------------------------
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
--   20260323153750_*  – payment columns
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

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;


CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can insert their own profile"
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

DROP POLICY IF EXISTS "Anyone can view stores" ON public.stores;


CREATE POLICY "Anyone can view stores"
  ON public.stores FOR SELECT USING (true);

DROP POLICY IF EXISTS "Owners can insert stores" ON public.stores;

CREATE POLICY "Owners can insert stores"
  ON public.stores FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners can update stores" ON public.stores;

CREATE POLICY "Owners can update stores"
  ON public.stores FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners can delete stores" ON public.stores;

CREATE POLICY "Owners can delete stores"
  ON public.stores FOR DELETE USING (auth.uid() = user_id);



DROP TRIGGER IF EXISTS update_stores_updated_at ON public.stores;

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


ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS payment_phone text DEFAULT NULL;


ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS payment_name text DEFAULT NULL;


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

DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;


CREATE POLICY "Anyone can view active products"
  ON public.products FOR SELECT USING (
    is_active = true OR EXISTS (
      SELECT 1 FROM public.stores WHERE stores.id = products.store_id AND stores.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Store owners can insert products" ON public.products;

CREATE POLICY "Store owners can insert products"
  ON public.products FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.stores WHERE stores.id = products.store_id AND stores.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Store owners can update products" ON public.products;

CREATE POLICY "Store owners can update products"
  ON public.products FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.stores WHERE stores.id = products.store_id AND stores.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Store owners can delete products" ON public.products;

CREATE POLICY "Store owners can delete products"
  ON public.products FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.stores WHERE stores.id = products.store_id AND stores.user_id = auth.uid())
  );



DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;

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

DROP TRIGGER IF EXISTS trg_set_order_public_id ON public.orders;

CREATE TRIGGER trg_set_order_public_id
  BEFORE INSERT ON public.orders FOR EACH ROW
  EXECUTE FUNCTION public.set_order_public_id();

DROP POLICY IF EXISTS "Anyone can view order by id" ON public.orders;


-- Policies
CREATE POLICY "Anyone can view order by id"
  ON public.orders FOR SELECT USING (true);



DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;


DROP POLICY IF EXISTS "Store owners can view their orders" ON public.orders;


DROP POLICY IF EXISTS "Store owners can view public order ids" ON public.orders;

DROP POLICY IF EXISTS "Anyone can create orders with valid data" ON public.orders;


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

DROP POLICY IF EXISTS "Store owners can update orders" ON public.orders;


CREATE POLICY "Store owners can update orders"
  ON public.orders FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.stores WHERE stores.id = orders.store_id AND stores.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Anon can update order status to awaiting_verification" ON public.orders;


CREATE POLICY "Anon can update order status to awaiting_verification"
  ON public.orders FOR UPDATE TO anon
  USING (true)
  WITH CHECK (status = 'awaiting_verification');



DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;

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

DROP POLICY IF EXISTS "Anyone can view order items for their order" ON public.order_items;


CREATE POLICY "Anyone can view order items for their order"
  ON public.order_items FOR SELECT USING (true);



DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;

DROP POLICY IF EXISTS "Anyone can create order items with valid order" ON public.order_items;

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

DROP POLICY IF EXISTS "Anyone can view product images" ON public.product_images;


CREATE POLICY "Anyone can view product images"
  ON public.product_images FOR SELECT USING (true);

DROP POLICY IF EXISTS "Store owners can manage product images" ON public.product_images;


CREATE POLICY "Store owners can manage product images"
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

DROP POLICY IF EXISTS "Anyone can view product variants" ON public.product_variants;


CREATE POLICY "Anyone can view product variants"
  ON public.product_variants FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Store owners can manage product variants" ON public.product_variants;


CREATE POLICY "Store owners can manage product variants"
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

DROP POLICY IF EXISTS "Store owners can view contact phones" ON public.order_contacts;


CREATE POLICY "Store owners can view contact phones"
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

DROP POLICY IF EXISTS "Store owners can view payment attempts" ON public.payment_attempts;


CREATE POLICY "Store owners can view payment attempts"
  ON public.payment_attempts FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.stores WHERE stores.id = payment_attempts.store_id AND stores.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Store owners can update payment attempts" ON public.payment_attempts;


CREATE POLICY "Store owners can update payment attempts"
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

DROP TRIGGER IF EXISTS trg_decrement_stock_on_order_item ON public.order_items;


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

DROP TRIGGER IF EXISTS trg_restore_stock_on_cancel ON public.orders;


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

DROP TRIGGER IF EXISTS trg_recompute_store_verification ON public.orders;

CREATE TRIGGER trg_recompute_store_verification
  AFTER INSERT OR UPDATE OF status OR DELETE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_store_verification_trigger();

DO $$ BEGIN EXECUTE $dkan_stmt$

-- 15. Storage buckets ─────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;$dkan_stmt$; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped storage stmt: %', SQLERRM; END $$;

DO $$ BEGIN EXECUTE $dkan_stmt$

INSERT INTO storage.buckets (id, name, public)
VALUES ('store-assets', 'store-assets', true)
ON CONFLICT (id) DO NOTHING;$dkan_stmt$; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped storage stmt: %', SQLERRM; END $$;

DO $$ BEGIN EXECUTE $dkan_stmt$

INSERT INTO storage.buckets (id, name, public)
VALUES ('qr-codes', 'qr-codes', true)
ON CONFLICT (id) DO NOTHING;$dkan_stmt$; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped storage stmt: %', SQLERRM; END $$;

DO $$ BEGIN EXECUTE $dkan_stmt$DROP POLICY IF EXISTS "Anyone can view product images" ON storage.objects;


-- Product-images policies
CREATE POLICY "Anyone can view product images"
  ON storage.objects FOR SELECT USING (bucket_id = 'product-images');$dkan_stmt$; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped storage stmt: %', SQLERRM; END $$;

DO $$ BEGIN EXECUTE $dkan_stmt$DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;

CREATE POLICY "Authenticated users can upload product images"
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');$dkan_stmt$; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped storage stmt: %', SQLERRM; END $$;

DO $$ BEGIN EXECUTE $dkan_stmt$DROP POLICY IF EXISTS "Authenticated users can update product images" ON storage.objects;

CREATE POLICY "Authenticated users can update product images"
  ON storage.objects FOR UPDATE USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');$dkan_stmt$; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped storage stmt: %', SQLERRM; END $$;

DO $$ BEGIN EXECUTE $dkan_stmt$DROP POLICY IF EXISTS "Authenticated users can delete product images" ON storage.objects;

CREATE POLICY "Authenticated users can delete product images"
  ON storage.objects FOR DELETE USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');$dkan_stmt$; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped storage stmt: %', SQLERRM; END $$;

DO $$ BEGIN EXECUTE $dkan_stmt$DROP POLICY IF EXISTS "Owners can delete product images" ON storage.objects;

CREATE POLICY "Owners can delete product images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-images' AND (storage.foldername(name))[1] = auth.uid()::text);$dkan_stmt$; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped storage stmt: %', SQLERRM; END $$;

DO $$ BEGIN EXECUTE $dkan_stmt$DROP POLICY IF EXISTS "Public read store-assets" ON storage.objects;


-- Store-assets policies
CREATE POLICY "Public read store-assets"
  ON storage.objects FOR SELECT USING (bucket_id = 'store-assets');$dkan_stmt$; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped storage stmt: %', SQLERRM; END $$;

DO $$ BEGIN EXECUTE $dkan_stmt$DROP POLICY IF EXISTS "Auth upload store-assets" ON storage.objects;

CREATE POLICY "Auth upload store-assets"
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'store-assets' AND auth.role() = 'authenticated');$dkan_stmt$; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped storage stmt: %', SQLERRM; END $$;

DO $$ BEGIN EXECUTE $dkan_stmt$DROP POLICY IF EXISTS "Auth update store-assets" ON storage.objects;

CREATE POLICY "Auth update store-assets"
  ON storage.objects FOR UPDATE USING (bucket_id = 'store-assets' AND auth.role() = 'authenticated');$dkan_stmt$; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped storage stmt: %', SQLERRM; END $$;

DO $$ BEGIN EXECUTE $dkan_stmt$DROP POLICY IF EXISTS "Auth delete store-assets" ON storage.objects;

CREATE POLICY "Auth delete store-assets"
  ON storage.objects FOR DELETE USING (bucket_id = 'store-assets' AND auth.role() = 'authenticated');$dkan_stmt$; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped storage stmt: %', SQLERRM; END $$;

DO $$ BEGIN EXECUTE $dkan_stmt$DROP POLICY IF EXISTS "Public read qr-codes" ON storage.objects;


-- QR-codes policies
CREATE POLICY "Public read qr-codes"
  ON storage.objects FOR SELECT USING (bucket_id = 'qr-codes');$dkan_stmt$; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped storage stmt: %', SQLERRM; END $$;

DO $$ BEGIN EXECUTE $dkan_stmt$DROP POLICY IF EXISTS "Auth upload qr-codes" ON storage.objects;

CREATE POLICY "Auth upload qr-codes"
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'qr-codes' AND auth.role() = 'authenticated');$dkan_stmt$; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped storage stmt: %', SQLERRM; END $$;

DO $$ BEGIN EXECUTE $dkan_stmt$DROP POLICY IF EXISTS "Auth update qr-codes" ON storage.objects;

CREATE POLICY "Auth update qr-codes"
  ON storage.objects FOR UPDATE USING (bucket_id = 'qr-codes' AND auth.role() = 'authenticated');$dkan_stmt$; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped storage stmt: %', SQLERRM; END $$;

DO $$ BEGIN EXECUTE $dkan_stmt$DROP POLICY IF EXISTS "Auth delete qr-codes" ON storage.objects;

CREATE POLICY "Auth delete qr-codes"
  ON storage.objects FOR DELETE USING (bucket_id = 'qr-codes' AND auth.role() = 'authenticated');$dkan_stmt$; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped storage stmt: %', SQLERRM; END $$;



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

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='stores') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.stores; END IF; END $$;




----------------------------------------------
-- MIGRATION: 20260327190322_bba337b5-ae24-4b2b-be0b-3b6a7402df87.sql
----------------------------------------------

-- Singleton table to track the getUpdates offset for callback queries
CREATE TABLE public.telegram_bot_state (
  id int PRIMARY KEY CHECK (id = 1),
  update_offset bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);



-- Seed the single row
INSERT INTO public.telegram_bot_state (id, update_offset) VALUES (1, 0);



-- Enable RLS (only service_role should access this)
ALTER TABLE public.telegram_bot_state ENABLE ROW LEVEL SECURITY;




----------------------------------------------
-- MIGRATION: 20260327202648_06471835-98f5-47e2-b817-1d03fd8e8fc8.sql
----------------------------------------------
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS whatsapp_phone text DEFAULT NULL;

DROP POLICY IF EXISTS "Store owners can insert order contacts" ON public.order_contacts;


----------------------------------------------
-- MIGRATION: 20260327203027_1a1ccf82-acf8-4e4e-9719-ce36370ee435.sql
----------------------------------------------
CREATE POLICY "Store owners can insert order contacts"
ON public.order_contacts
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = order_contacts.store_id
    AND stores.user_id = auth.uid()
  )
);



----------------------------------------------
-- MIGRATION: 20260327210901_634e1ee6-1a8d-47e1-ab1f-b97e661fc838.sql
----------------------------------------------
CREATE TABLE public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_percent integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  max_uses integer DEFAULT NULL,
  used_count integer NOT NULL DEFAULT 0
);



ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active promo codes" ON public.promo_codes;


CREATE POLICY "Anyone can read active promo codes"
  ON public.promo_codes
  FOR SELECT
  TO public
  USING (is_active = true);



----------------------------------------------
-- MIGRATION: 20260328154500_dadc579e-7cf8-4cf4-adb9-6e6361461c98.sql
----------------------------------------------
ALTER TABLE public.stores ADD COLUMN default_language text NOT NULL DEFAULT 'en';



----------------------------------------------
-- MIGRATION: 20260328160640_f1428366-6a24-4206-a1dc-bdeb3cab363a.sql
----------------------------------------------
ALTER TABLE public.stores ADD COLUMN show_banner boolean NOT NULL DEFAULT true;



----------------------------------------------
-- MIGRATION: 20260328170136_e0fb0bcf-9986-4c7a-988d-a0e8b219d796.sql
----------------------------------------------
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS tax_enabled boolean NOT NULL DEFAULT false;


ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS tax_percent numeric NOT NULL DEFAULT 0;



----------------------------------------------
-- MIGRATION: 20260328200644_e9563442-3c9a-42bf-9874-8eafaf89fbe7.sql
----------------------------------------------
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS subscription_expiry timestamptz;



----------------------------------------------
-- MIGRATION: 20260328201601_545417f5-d764-4bae-8928-70dd06312808.sql
----------------------------------------------

CREATE TABLE public.store_promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  code text NOT NULL,
  discount_type text NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent', 'amount')),
  discount_value numeric NOT NULL DEFAULT 0,
  min_cart_amount integer DEFAULT 0,
  min_quantity integer DEFAULT 0,
  start_date timestamptz NOT NULL DEFAULT now(),
  end_date timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  used_count integer NOT NULL DEFAULT 0,
  max_uses integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(store_id, code)
);



ALTER TABLE public.store_promo_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Store owners can manage their promo codes" ON public.store_promo_codes;


CREATE POLICY "Store owners can manage their promo codes"
ON public.store_promo_codes FOR ALL
USING (EXISTS (SELECT 1 FROM public.stores WHERE stores.id = store_promo_codes.store_id AND stores.user_id = auth.uid()));

DROP POLICY IF EXISTS "Anyone can read active promo codes" ON public.store_promo_codes;


CREATE POLICY "Anyone can read active promo codes"
ON public.store_promo_codes FOR SELECT
USING (is_active = true);




----------------------------------------------
-- MIGRATION: 20260328203601_5cea29d3-e3fe-443b-b74c-0c9ebe453d60.sql
----------------------------------------------
ALTER TABLE public.orders ADD COLUMN promo_code text DEFAULT NULL;


ALTER TABLE public.orders ADD COLUMN discount_amount integer DEFAULT 0;



----------------------------------------------
-- MIGRATION: 20260328203653_d10407a8-9203-4a3e-b95f-6be4c9dfbf1b.sql
----------------------------------------------
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



----------------------------------------------
-- MIGRATION: 20260328223741_0a6dc23b-c1f7-4d72-9337-f16cef10d1b1.sql
----------------------------------------------

-- Create reviews table
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_phone_hash TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(order_id, product_id)
);



-- Add average_rating and review_count to stores
ALTER TABLE public.stores ADD COLUMN average_rating NUMERIC NOT NULL DEFAULT 0;


ALTER TABLE public.stores ADD COLUMN review_count INTEGER NOT NULL DEFAULT 0;



-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;


-- Anyone can read reviews
CREATE POLICY "Anyone can view reviews" ON public.reviews FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Anyone can insert reviews" ON public.reviews;


-- Anyone can insert reviews (validated in app logic via order check)
CREATE POLICY "Anyone can insert reviews" ON public.reviews FOR INSERT TO public WITH CHECK (true);



-- Create function to update store rating on review insert
CREATE OR REPLACE FUNCTION public.update_store_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE stores
  SET average_rating = (
    SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE store_id = NEW.store_id
  ),
  review_count = (
    SELECT COUNT(*) FROM reviews WHERE store_id = NEW.store_id
  )
  WHERE id = NEW.store_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_store_rating ON public.reviews;


-- Trigger on review insert
CREATE TRIGGER trg_update_store_rating
AFTER INSERT ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_store_rating();




----------------------------------------------
-- MIGRATION: 20260328230701_3954b1bf-fb63-4182-94f1-9f7fea1e50ec.sql
----------------------------------------------

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




----------------------------------------------
-- MIGRATION: 20260328231436_f04aefcb-6ade-4f99-bd13-5c09e0bb0b06.sql
----------------------------------------------

CREATE OR REPLACE FUNCTION public.unpause_on_upgrade()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.plan_type = 'free' AND NEW.plan_type != 'free' THEN
    NEW.is_paused := false;
  END IF;
  RETURN NEW;
END;
$$;



DROP TRIGGER IF EXISTS trg_unpause_on_upgrade ON public.stores;

DROP TRIGGER IF EXISTS trg_unpause_on_upgrade ON public.stores;

CREATE TRIGGER trg_unpause_on_upgrade
  BEFORE UPDATE OF plan_type ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION public.unpause_on_upgrade();




----------------------------------------------
-- MIGRATION: 20260328234113_060060c3-cc6a-4535-b413-436bba078ee6.sql
----------------------------------------------

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

DROP TRIGGER IF EXISTS trg_update_store_sales_count ON public.orders;


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




----------------------------------------------
-- MIGRATION: 20260331152027_b405f2fc-6829-4327-a5d8-0506044049ff.sql
----------------------------------------------

-- Create report reason enum
CREATE TYPE public.report_reason AS ENUM ('scam', 'inappropriate', 'counterfeit');



-- Create reports table
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  buyer_phone TEXT NOT NULL,
  reason public.report_reason NOT NULL,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);



-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit a report" ON public.reports;


-- Anyone can submit a report
CREATE POLICY "Anyone can submit a report"
  ON public.reports FOR INSERT
  TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "Store owners can view reports" ON public.reports;


-- Store owners can view reports on their store
CREATE POLICY "Store owners can view reports"
  ON public.reports FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.id = reports.store_id AND stores.user_id = auth.uid()
  ));



-- Add report_count to stores
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS report_count INTEGER NOT NULL DEFAULT 0;



-- Trigger function to increment report_count
CREATE OR REPLACE FUNCTION public.increment_report_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.stores
  SET report_count = report_count + 1
  WHERE id = NEW.store_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_report_insert ON public.reports;


CREATE TRIGGER on_report_insert
  AFTER INSERT ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_report_count();

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='orders') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.orders; END IF; END $$;



----------------------------------------------
-- MIGRATION: 20260403114426_d341036f-83dc-48d2-9298-875e219bf2e1.sql
----------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS subtotal integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount integer NOT NULL DEFAULT 0;



----------------------------------------------
-- MIGRATION: 20260407181626_email_infra.sql
----------------------------------------------
-- Email infrastructure
-- Creates the queue system, send log, send state, suppression, and unsubscribe
-- tables used by both auth and transactional emails.

-- Extensions required for queue processing
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;


DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    CREATE EXTENSION pg_cron;
  END IF;
END $$;


-- vault + pgmq may not be enabled on every plan — skip gracefully if unavailable
DO $$ BEGIN CREATE EXTENSION IF NOT EXISTS supabase_vault; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'supabase_vault unavailable, skipping (%): %', SQLSTATE, SQLERRM; END $$;


DO $$ BEGIN CREATE EXTENSION IF NOT EXISTS pgmq; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'pgmq unavailable, skipping (%): %', SQLSTATE, SQLERRM; END $$;



-- Create email queues (auth = high priority, transactional = normal)
-- Wrapped in DO blocks to handle "queue already exists" errors idempotently.
DO $$ BEGIN PERFORM pgmq.create('auth_emails'); EXCEPTION WHEN OTHERS THEN NULL; END $$;


DO $$ BEGIN PERFORM pgmq.create('transactional_emails'); EXCEPTION WHEN OTHERS THEN NULL; END $$;



-- Dead-letter queues for messages that exceed max retries
DO $$ BEGIN PERFORM pgmq.create('auth_emails_dlq'); EXCEPTION WHEN OTHERS THEN NULL; END $$;


DO $$ BEGIN PERFORM pgmq.create('transactional_emails_dlq'); EXCEPTION WHEN OTHERS THEN NULL; END $$;



-- Email send log table (audit trail for all send attempts)
-- UPDATE is allowed for the service role so the suppression edge function
-- can update a log record's status when a bounce/complaint/unsubscribe occurs.
CREATE TABLE IF NOT EXISTS public.email_send_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT,
  template_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'suppressed', 'failed', 'bounced', 'complained', 'dlq')),
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);



ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN EXECUTE $dkan_stmt$

DO $$ BEGIN
  CREATE POLICY "Service role can read send log"
    ON public.email_send_log FOR SELECT
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;$dkan_stmt$; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped ddl-do stmt: %', SQLERRM; END $$;

DO $$ BEGIN EXECUTE $dkan_stmt$

DO $$ BEGIN
  CREATE POLICY "Service role can insert send log"
    ON public.email_send_log FOR INSERT
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;$dkan_stmt$; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped ddl-do stmt: %', SQLERRM; END $$;

DO $$ BEGIN EXECUTE $dkan_stmt$

DO $$ BEGIN
  CREATE POLICY "Service role can update send log"
    ON public.email_send_log FOR UPDATE
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;$dkan_stmt$; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped ddl-do stmt: %', SQLERRM; END $$;



CREATE INDEX IF NOT EXISTS idx_email_send_log_created ON public.email_send_log(created_at DESC);


CREATE INDEX IF NOT EXISTS idx_email_send_log_recipient ON public.email_send_log(recipient_email);

DO $$ BEGIN EXECUTE $dkan_stmt$

-- Backfill: add message_id column to existing tables that predate this migration
DO $$ BEGIN
  ALTER TABLE public.email_send_log ADD COLUMN message_id TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;$dkan_stmt$; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped ddl-do stmt: %', SQLERRM; END $$;



CREATE INDEX IF NOT EXISTS idx_email_send_log_message ON public.email_send_log(message_id);



-- Prevent duplicate sends: only one 'sent' row per message_id.
-- If VT expires and another worker picks up the same message, the pre-send
-- check catches it. This index is a DB-level safety net for race conditions.
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_send_log_message_sent_unique
  ON public.email_send_log(message_id) WHERE status = 'sent';

DO $$ BEGIN EXECUTE $dkan_stmt$

-- Backfill: update status CHECK constraint for existing tables that predate new statuses
DO $$ BEGIN
  ALTER TABLE public.email_send_log DROP CONSTRAINT IF EXISTS email_send_log_status_check;
  ALTER TABLE public.email_send_log ADD CONSTRAINT email_send_log_status_check
    CHECK (status IN ('pending', 'sent', 'suppressed', 'failed', 'bounced', 'complained', 'dlq'));
END $$;$dkan_stmt$; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped ddl-do stmt: %', SQLERRM; END $$;



-- Rate-limit state and queue config (single row, tracks Retry-After cooldown + throughput settings)
CREATE TABLE IF NOT EXISTS public.email_send_state (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  retry_after_until TIMESTAMPTZ,
  batch_size INTEGER NOT NULL DEFAULT 10,
  send_delay_ms INTEGER NOT NULL DEFAULT 200,
  auth_email_ttl_minutes INTEGER NOT NULL DEFAULT 15,
  transactional_email_ttl_minutes INTEGER NOT NULL DEFAULT 60,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);



INSERT INTO public.email_send_state (id) VALUES (1) ON CONFLICT DO NOTHING;

DO $$ BEGIN EXECUTE $dkan_stmt$

-- Backfill: add config columns to existing tables that predate this migration
DO $$ BEGIN
  ALTER TABLE public.email_send_state ADD COLUMN batch_size INTEGER NOT NULL DEFAULT 10;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;$dkan_stmt$; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped ddl-do stmt: %', SQLERRM; END $$;

DO $$ BEGIN EXECUTE $dkan_stmt$
DO $$ BEGIN
  ALTER TABLE public.email_send_state ADD COLUMN send_delay_ms INTEGER NOT NULL DEFAULT 200;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;$dkan_stmt$; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped ddl-do stmt: %', SQLERRM; END $$;

DO $$ BEGIN EXECUTE $dkan_stmt$
DO $$ BEGIN
  ALTER TABLE public.email_send_state ADD COLUMN auth_email_ttl_minutes INTEGER NOT NULL DEFAULT 15;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;$dkan_stmt$; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped ddl-do stmt: %', SQLERRM; END $$;

DO $$ BEGIN EXECUTE $dkan_stmt$
DO $$ BEGIN
  ALTER TABLE public.email_send_state ADD COLUMN transactional_email_ttl_minutes INTEGER NOT NULL DEFAULT 60;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;$dkan_stmt$; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped ddl-do stmt: %', SQLERRM; END $$;



ALTER TABLE public.email_send_state ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN EXECUTE $dkan_stmt$

DO $$ BEGIN
  CREATE POLICY "Service role can manage send state"
    ON public.email_send_state FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;$dkan_stmt$; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped ddl-do stmt: %', SQLERRM; END $$;



-- RPC wrappers so Edge Functions can interact with pgmq via supabase.rpc()
-- (PostgREST only exposes functions in the public schema; pgmq functions are in the pgmq schema)
-- All wrappers auto-create the queue on undefined_table (42P01) so emails
-- are never lost if the queue was dropped (extension upgrade, restore, etc.).
CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name TEXT, payload JSONB)
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN pgmq.send(queue_name, payload);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END;
$$;



CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name TEXT, batch_size INT, vt INT)
RETURNS TABLE(msg_id BIGINT, read_ct INT, message JSONB)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN;
END;
$$;



CREATE OR REPLACE FUNCTION public.delete_email(queue_name TEXT, message_id BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$$;



CREATE OR REPLACE FUNCTION public.move_to_dlq(
  source_queue TEXT, dlq_name TEXT, message_id BIGINT, payload JSONB
)
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
EXCEPTION WHEN undefined_table THEN
  BEGIN
    PERFORM pgmq.create(dlq_name);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  BEGIN
    PERFORM pgmq.delete(source_queue, message_id);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;
  RETURN new_id;
END;
$$;



-- Restrict queue RPC wrappers to service_role only (SECURITY DEFINER runs as owner,
-- so without this any authenticated user could manipulate the email queues)
REVOKE EXECUTE ON FUNCTION public.enqueue_email(TEXT, JSONB) FROM PUBLIC;


GRANT EXECUTE ON FUNCTION public.enqueue_email(TEXT, JSONB) TO service_role;



REVOKE EXECUTE ON FUNCTION public.read_email_batch(TEXT, INT, INT) FROM PUBLIC;


GRANT EXECUTE ON FUNCTION public.read_email_batch(TEXT, INT, INT) TO service_role;



REVOKE EXECUTE ON FUNCTION public.delete_email(TEXT, BIGINT) FROM PUBLIC;


GRANT EXECUTE ON FUNCTION public.delete_email(TEXT, BIGINT) TO service_role;



REVOKE EXECUTE ON FUNCTION public.move_to_dlq(TEXT, TEXT, BIGINT, JSONB) FROM PUBLIC;


GRANT EXECUTE ON FUNCTION public.move_to_dlq(TEXT, TEXT, BIGINT, JSONB) TO service_role;



-- Suppressed emails table (tracks unsubscribes, bounces, complaints)
-- Append-only: no DELETE or UPDATE policies to prevent bypassing suppression.
CREATE TABLE IF NOT EXISTS public.suppressed_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('unsubscribe', 'bounce', 'complaint')),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(email)
);



ALTER TABLE public.suppressed_emails ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN EXECUTE $dkan_stmt$

DO $$ BEGIN
  CREATE POLICY "Service role can read suppressed emails"
    ON public.suppressed_emails FOR SELECT
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;$dkan_stmt$; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped ddl-do stmt: %', SQLERRM; END $$;

DO $$ BEGIN EXECUTE $dkan_stmt$

DO $$ BEGIN
  CREATE POLICY "Service role can insert suppressed emails"
    ON public.suppressed_emails FOR INSERT
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;$dkan_stmt$; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped ddl-do stmt: %', SQLERRM; END $$;



CREATE INDEX IF NOT EXISTS idx_suppressed_emails_email ON public.suppressed_emails(email);



-- Email unsubscribe tokens table (one token per email address for unsubscribe links)
-- No DELETE policy to prevent removing tokens. UPDATE allowed only to mark tokens as used.
CREATE TABLE IF NOT EXISTS public.email_unsubscribe_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_at TIMESTAMPTZ
);



ALTER TABLE public.email_unsubscribe_tokens ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN EXECUTE $dkan_stmt$

DO $$ BEGIN
  CREATE POLICY "Service role can read tokens"
    ON public.email_unsubscribe_tokens FOR SELECT
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;$dkan_stmt$; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped ddl-do stmt: %', SQLERRM; END $$;

DO $$ BEGIN EXECUTE $dkan_stmt$

DO $$ BEGIN
  CREATE POLICY "Service role can insert tokens"
    ON public.email_unsubscribe_tokens FOR INSERT
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;$dkan_stmt$; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped ddl-do stmt: %', SQLERRM; END $$;

DO $$ BEGIN EXECUTE $dkan_stmt$

DO $$ BEGIN
  CREATE POLICY "Service role can mark tokens as used"
    ON public.email_unsubscribe_tokens FOR UPDATE
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;$dkan_stmt$; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped ddl-do stmt: %', SQLERRM; END $$;



CREATE INDEX IF NOT EXISTS idx_unsubscribe_tokens_token ON public.email_unsubscribe_tokens(token);



-- ============================================================
-- POST-MIGRATION STEPS (applied dynamically by setup_email_infra)
-- These steps contain project-specific secrets and URLs and
-- cannot be expressed as static SQL. They are applied via the
-- Supabase Management API (ExecuteSQL) each time the tool runs.
-- ============================================================
--
-- 1. VAULT SECRET
--    Stores (or updates) the Supabase service_role key in
--    vault as 'email_queue_service_role_key'.
--    Uses vault.create_secret / vault.update_secret (upsert).
--    To revert: DELETE FROM vault.secrets WHERE name = 'email_queue_service_role_key';
--
-- 2. CRON JOB (pg_cron)
--    Creates job 'process-email-queue' with a 5-second interval.
--    The job checks:
--      a) rate-limit cooldown (email_send_state.retry_after_until)
--      b) whether auth_emails or transactional_emails queues have messages
--    If conditions are met, it calls the process-email-queue Edge Function
--    via net.http_post using the vault-stored service_role key.
--    To revert: SELECT cron.unschedule('process-email-queue');


----------------------------------------------
-- MIGRATION: 20260415110422_60b2a24c-e157-459b-9c3a-424115b056e1.sql
----------------------------------------------
ALTER TABLE public.stores ADD COLUMN theme_preset text NOT NULL DEFAULT 'classic';



----------------------------------------------
-- MIGRATION: 20260419182656_analytics-aggregation-function.sql
----------------------------------------------
-- Analytics aggregation function
-- Returns aggregated metrics for orders within a date range, optionally filtered by store.
-- Granularity: 'daily' (default) returns overall + daily breakdown, 'hourly' includes per-hour buckets.
CREATE OR REPLACE FUNCTION analytics_aggregation(
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL,
  p_store_id uuid DEFAULT NULL,
  p_granularity text DEFAULT 'daily'
) RETURNS jsonb AS $$
DECLARE
  total_orders bigint;
  total_revenue bigint;
  avg_order_value numeric;
  success_rate numeric;
  hourly_data jsonb;
  top_products_json jsonb;
  marketing_stats_json jsonb;
  series_json jsonb;
  daily_series_json jsonb;
  promo_usage_count bigint;
  promo_revenue bigint;
  total_discount bigint;
  avg_order_value_promo numeric;
  avg_order_value_regular numeric;
BEGIN
  -- Create temp table to hold filtered orders (used by multiple queries below)
  CREATE TEMP TABLE _filtered_orders ON COMMIT DROP AS
  SELECT
    id, total_price, status, created_at, promo_code, discount_amount
  FROM orders
  WHERE
    (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at < p_end_date)
    AND (p_store_id IS NULL OR orders.store_id = p_store_id);

  -- Overall aggregates
  SELECT
    COUNT(*) AS orders,
    SUM(total_price) AS revenue,
    AVG(total_price) AS avg_order_value,
    (COUNT(CASE WHEN status = 'delivered' THEN 1 END)::float /
      NULLIF(COUNT(CASE WHEN status != 'cancelled' THEN 1 END), 0) * 100) AS success_rate,
    COUNT(CASE WHEN promo_code IS NOT NULL THEN 1 END) AS promo_usage_count,
    SUM(CASE WHEN promo_code IS NOT NULL THEN total_price ELSE 0 END) AS promo_revenue,
    SUM(discount_amount) AS total_discount,
    AVG(CASE WHEN promo_code IS NOT NULL THEN total_price END) AS avg_order_value_promo,
    AVG(CASE WHEN promo_code IS NULL THEN total_price END) AS avg_order_value_regular
  INTO total_orders, total_revenue, avg_order_value, success_rate,
       promo_usage_count, promo_revenue, total_discount,
       avg_order_value_promo, avg_order_value_regular
  FROM _filtered_orders;

  -- Top products (join with order_items)
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'name', tp.name,
        'units_sold', tp.units_sold,
        'revenue', tp.revenue,
        'share', CASE WHEN total_revenue > 0 THEN (tp.revenue * 100.0 / total_revenue) ELSE 0 END
      )
    ),
    '[]'::jsonb
  )
  INTO top_products_json
  FROM (
    SELECT
      oi.product_name AS name,
      SUM(oi.quantity) AS units_sold,
      SUM(oi.product_price * oi.quantity) AS revenue
    FROM _filtered_orders fo
    JOIN order_items oi ON fo.id = oi.order_id
    GROUP BY oi.product_name
    ORDER BY revenue DESC
    LIMIT 5
  ) tp;

  -- Hourly distribution of order counts (0-23, across all days)
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object('hour', hd.hour, 'count', hd.count)
    ),
    '[]'::jsonb
  )
  INTO series_json
  FROM (
    SELECT
      EXTRACT(HOUR FROM created_at)::integer AS hour,
      COUNT(*) AS count
    FROM _filtered_orders
    GROUP BY EXTRACT(HOUR FROM created_at)
    ORDER BY hour
  ) hd;

  -- Daily breakdown: period (date), revenue, orders (for the revenue trend chart)
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'period', db.period,
        'revenue', db.revenue,
        'orders', db.orders
      )
    ),
    '[]'::jsonb
  )
  INTO daily_series_json
  FROM (
    SELECT
      date_trunc('day', created_at)::date::text AS period,
      SUM(total_price)::bigint AS revenue,
      COUNT(*)::bigint AS orders
    FROM _filtered_orders
    GROUP BY date_trunc('day', created_at)::date::text
    ORDER BY period
  ) db;

  -- Marketing stats
  SELECT jsonb_build_object(
    'promo_usage_count', COALESCE(promo_usage_count, 0),
    'promo_roi', CASE
      WHEN COALESCE(total_discount, 0) > 0
      THEN ((promo_revenue - total_discount) * 100.0 / total_discount)
      ELSE 0
    END,
    'avg_order_value_promo', COALESCE(avg_order_value_promo, 0),
    'avg_order_value_regular', COALESCE(avg_order_value_regular, 0),
    'total_discount', COALESCE(total_discount, 0)
  )
  INTO marketing_stats_json;

  -- Compute hourly breakdown only if p_granularity = 'hourly'
  IF p_granularity = 'hourly' THEN
    SELECT jsonb_agg(
      jsonb_build_object(
        'hour', hour_bucket,
        'revenue', revenue,
        'orders', orders,
        'avg_order_value', avg_order_value,
        'success_rate', success_rate
      )
    )
    INTO hourly_data
    FROM (
      SELECT
        date_trunc('hour', created_at) AS hour_bucket,
        COUNT(*) AS orders,
        SUM(total_price) AS revenue,
        AVG(total_price) AS avg_order_value,
        (COUNT(CASE WHEN status = 'delivered' THEN 1 END)::float /
          NULLIF(COUNT(CASE WHEN status != 'cancelled' THEN 1 END), 0) * 100) AS success_rate
      FROM _filtered_orders
      GROUP BY date_trunc('hour', created_at)
      ORDER BY hour_bucket
    ) h;
  ELSE
    hourly_data := '[]'::jsonb;
  END IF;

  -- Drop temp table
  DROP TABLE IF EXISTS _filtered_orders;

  -- Return final JSON
  RETURN jsonb_build_object(
    'revenue', COALESCE(total_revenue, 0),
    'orders', COALESCE(total_orders, 0),
    'avg_order_value', COALESCE(avg_order_value, 0),
    'success_rate', COALESCE(success_rate, 0),
    'top_products', COALESCE(top_products_json, '[]'::jsonb),
    'marketing_stats', COALESCE(marketing_stats_json, '{}'::jsonb),
    'series', COALESCE(series_json, '[]'::jsonb),
    'daily_series', COALESCE(daily_series_json, '[]'::jsonb),
    'hourly', COALESCE(hourly_data, '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;




----------------------------------------------
-- MIGRATION: 20260422133000_add_categories_table_and_product_category_column.sql
----------------------------------------------
-- Add a unified categories table and ensure products store a category reference.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS category TEXT;



CREATE TABLE IF NOT EXISTS public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);



CREATE UNIQUE INDEX IF NOT EXISTS categories_store_id_name_unique ON public.categories (store_id, name);



ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;



DROP TRIGGER IF EXISTS update_categories_updated_at ON public.categories;

DROP TRIGGER IF EXISTS update_categories_updated_at ON public.categories;

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();



DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;


DROP POLICY IF EXISTS "Store owners can insert categories" ON public.categories;


DROP POLICY IF EXISTS "Store owners can update categories" ON public.categories;


DROP POLICY IF EXISTS "Store owners can delete categories" ON public.categories;

DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;


CREATE POLICY "Anyone can view categories" ON public.categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Store owners can insert categories" ON public.categories;

CREATE POLICY "Store owners can insert categories" ON public.categories FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.stores WHERE stores.id = categories.store_id AND stores.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Store owners can update categories" ON public.categories;

CREATE POLICY "Store owners can update categories" ON public.categories FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.stores WHERE stores.id = categories.store_id AND stores.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Store owners can delete categories" ON public.categories;

CREATE POLICY "Store owners can delete categories" ON public.categories FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.stores WHERE stores.id = categories.store_id AND stores.user_id = auth.uid()
  )
);




----------------------------------------------
-- MIGRATION: 20260422134600_remove_is_pinned_column.sql
----------------------------------------------
-- 1. 删除索引（如果存在）
DROP INDEX IF EXISTS public.idx_products_is_pinned;



-- 2. 删除字段（添加 IF EXISTS 确保不会因为重复运行而报错）
ALTER TABLE public.products 
DROP COLUMN IF EXISTS is_pinned;

DO $$ BEGIN EXECUTE $dkan_stmt$

----------------------------------------------
-- MIGRATION: 20260423000000_update_storage_cache_ttl.sql
----------------------------------------------
-- Update Supabase Storage Cache TTL — no-op on newer storage where the
-- cache_control column does not exist.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'storage' AND table_name = 'buckets' AND column_name = 'cache_control'
  ) THEN
    UPDATE storage.buckets
    SET cache_control = 'max-age=31536000, immutable'
    WHERE name IN ('product-images', 'product-assets');
    RAISE NOTICE 'Updated cache_control for product-images/product-assets buckets';
  ELSE
    RAISE NOTICE 'storage.buckets.cache_control does not exist — skipping cache TTL update';
  END IF;
END $$;$dkan_stmt$; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped storage stmt: %', SQLERRM; END $$;

DO $$ BEGIN EXECUTE $dkan_stmt$


----------------------------------------------
-- MIGRATION: 20260424000000_storage_cdn_config.sql
----------------------------------------------
-- Set cache control defaults — no-op on newer storage where the
-- cache_control column does not exist.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'storage' AND table_name = 'buckets' AND column_name = 'cache_control'
  ) THEN
    UPDATE storage.buckets
    SET cache_control = 'max-age=31536000, immutable'
    WHERE name IN ('store-assets', 'qr-codes');
  END IF;
END $$;$dkan_stmt$; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped storage stmt: %', SQLERRM; END $$;

DO $$ BEGIN EXECUTE $dkan_stmt$

-- Add image transformation sizing rule (max dimensions) via a storage hook
-- This ensures uploaded images are auto-resized to reasonable limits
CREATE OR REPLACE FUNCTION storage.resize_on_upload()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Set content-type defaults for uploads missing it
  IF NEW.content_type IS NULL THEN
    NEW.content_type := 'image/webp';
  END IF;
  RETURN NEW;
END;
$$;$dkan_stmt$; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skipped storage stmt: %', SQLERRM; END $$;




----------------------------------------------
-- MIGRATION: 20260502141155_add_product_advanced_business_fields.sql
----------------------------------------------
-- Add optional advanced business information fields to products table
ALTER TABLE public.products
  ADD COLUMN barcode_gtin TEXT,
  ADD COLUMN ntin TEXT,
  ADD COLUMN country_of_origin TEXT;




----------------------------------------------
-- MIGRATION: 20260502203321_add_return_requests.sql
----------------------------------------------
-- Add return_requests table for customer-initiated return/refund flow
CREATE TABLE IF NOT EXISTS public.return_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);



CREATE INDEX IF NOT EXISTS idx_return_requests_order ON public.return_requests (order_id);


CREATE INDEX IF NOT EXISTS idx_return_requests_store ON public.return_requests (store_id, created_at DESC);




----------------------------------------------
-- MIGRATION: 20260502203322_add_low_stock_threshold.sql
----------------------------------------------
-- Add per-product low stock threshold for Telegram alerts
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER NOT NULL DEFAULT 3 CHECK (low_stock_threshold >= 1);

DROP POLICY IF EXISTS "Allow anon insert return_requests" ON public.return_requests;



----------------------------------------------
-- MIGRATION: 20260502210000_add_return_requests_rls.sql
----------------------------------------------
-- Allow anonymous users (customers) to insert return requests
-- The return_requests table is write-only for customers (no read)
CREATE POLICY "Allow anon insert return_requests" ON public.return_requests
  FOR INSERT TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Store owners can view return_requests" ON public.return_requests;


-- Allow store owners to view their own return requests
CREATE POLICY "Store owners can view return_requests" ON public.return_requests
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = return_requests.store_id
        AND stores.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Store owners can update return_requests" ON public.return_requests;


-- Allow store owners to update their own return requests
CREATE POLICY "Store owners can update return_requests" ON public.return_requests
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = return_requests.store_id
        AND stores.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = return_requests.store_id
        AND stores.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Store owners can delete return_requests" ON public.return_requests;


-- Allow store owners to delete their own return requests
CREATE POLICY "Store owners can delete return_requests" ON public.return_requests
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = return_requests.store_id
        AND stores.user_id = auth.uid()
    )
  );




----------------------------------------------
-- MIGRATION: 20260503000000_analytics_v2.sql
----------------------------------------------
-- Analytics v2: product images + previous period comparison + store funnel data
-- Overwrites the original analytics_aggregation function
CREATE OR REPLACE FUNCTION analytics_aggregation(
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL,
  p_store_id uuid DEFAULT NULL,
  p_granularity text DEFAULT 'daily'
) RETURNS jsonb AS $$
DECLARE
  total_orders bigint;
  total_revenue bigint;
  avg_order_value numeric;
  success_rate numeric;
  hourly_data jsonb;
  top_products_json jsonb;
  marketing_stats_json jsonb;
  series_json jsonb;
  daily_series_json jsonb;
  promo_usage_count bigint;
  promo_revenue bigint;
  total_discount bigint;
  avg_order_value_promo numeric;
  avg_order_value_regular numeric;
  prev_revenue bigint;
  prev_orders bigint;
  prev_success_rate numeric;
  store_views bigint;
  store_sales_total bigint;
  interval_dur interval;
  prev_start timestamptz;
  prev_end timestamptz;
BEGIN
  -- Compute previous period bounds
  IF p_start_date IS NOT NULL AND p_end_date IS NOT NULL THEN
    interval_dur := p_end_date - p_start_date;
    prev_start := p_start_date - interval_dur;
    prev_end := p_start_date;
  ELSE
    prev_start := NULL;
    prev_end := NULL;
  END IF;

  -- Create temp table for current period orders
  CREATE TEMP TABLE _filtered_orders ON COMMIT DROP AS
  SELECT
    id, total_price, status, created_at, promo_code, discount_amount
  FROM orders
  WHERE
    (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at < p_end_date)
    AND (p_store_id IS NULL OR orders.store_id = p_store_id);

  -- Overall aggregates
  SELECT
    COUNT(*) AS orders,
    SUM(total_price) AS revenue,
    AVG(total_price) AS avg_order_value,
    (COUNT(CASE WHEN status = 'delivered' THEN 1 END)::float /
      NULLIF(COUNT(CASE WHEN status != 'cancelled' THEN 1 END), 0) * 100) AS success_rate,
    COUNT(CASE WHEN promo_code IS NOT NULL THEN 1 END) AS promo_usage_count,
    SUM(CASE WHEN promo_code IS NOT NULL THEN total_price ELSE 0 END) AS promo_revenue,
    SUM(discount_amount) AS total_discount,
    AVG(CASE WHEN promo_code IS NOT NULL THEN total_price END) AS avg_order_value_promo,
    AVG(CASE WHEN promo_code IS NULL THEN total_price END) AS avg_order_value_regular
  INTO total_orders, total_revenue, avg_order_value, success_rate,
       promo_usage_count, promo_revenue, total_discount,
       avg_order_value_promo, avg_order_value_regular
  FROM _filtered_orders;

  -- Previous period aggregates
  IF prev_start IS NOT NULL AND prev_end IS NOT NULL THEN
    SELECT
      COALESCE(SUM(total_price), 0)::bigint,
      COALESCE(COUNT(*), 0)::bigint,
      COALESCE(
        (COUNT(CASE WHEN status = 'delivered' THEN 1 END)::float /
         NULLIF(COUNT(CASE WHEN status != 'cancelled' THEN 1 END), 0) * 100),
        0
      )
    INTO prev_revenue, prev_orders, prev_success_rate
    FROM orders
    WHERE
      created_at >= prev_start
      AND created_at < prev_end
      AND (p_store_id IS NULL OR orders.store_id = p_store_id);
  ELSE
    prev_revenue := 0;
    prev_orders := 0;
    prev_success_rate := 0;
  END IF;

  -- Store funnel data
  SELECT COALESCE(total_views, 0)::bigint, COALESCE(total_sales_count, 0)::bigint
  INTO store_views, store_sales_total
  FROM stores
  WHERE id = p_store_id;

  IF store_views IS NULL THEN
    store_views := 0;
    store_sales_total := 0;
  END IF;

  -- Top products (join with products for image_url)
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'name', tp.name,
        'units_sold', tp.units_sold,
        'revenue', tp.revenue,
        'share', CASE WHEN total_revenue > 0 THEN (tp.revenue * 100.0 / total_revenue) ELSE 0 END,
        'product_id', tp.product_id,
        'image_url', tp.image_url
      )
    ),
    '[]'::jsonb
  )
  INTO top_products_json
  FROM (
    SELECT
      oi.product_name AS name,
      SUM(oi.quantity) AS units_sold,
      SUM(oi.product_price * oi.quantity) AS revenue,
      oi.product_id,
      p.image_url
    FROM _filtered_orders fo
    JOIN order_items oi ON fo.id = oi.order_id
    LEFT JOIN products p ON oi.product_id = p.id
    GROUP BY oi.product_name, oi.product_id, p.image_url
    ORDER BY revenue DESC
    LIMIT 5
  ) tp;

  -- Hourly distribution of order counts (0-23, across all days)
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object('hour', hd.hour, 'count', hd.count)
    ),
    '[]'::jsonb
  )
  INTO series_json
  FROM (
    SELECT
      EXTRACT(HOUR FROM created_at)::integer AS hour,
      COUNT(*) AS count
    FROM _filtered_orders
    GROUP BY EXTRACT(HOUR FROM created_at)
    ORDER BY hour
  ) hd;

  -- Daily breakdown: period (date), revenue, orders
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'period', db.period,
        'revenue', db.revenue,
        'orders', db.orders
      )
    ),
    '[]'::jsonb
  )
  INTO daily_series_json
  FROM (
    SELECT
      date_trunc('day', created_at)::date::text AS period,
      SUM(total_price)::bigint AS revenue,
      COUNT(*)::bigint AS orders
    FROM _filtered_orders
    GROUP BY date_trunc('day', created_at)::date::text
    ORDER BY period
  ) db;

  -- Marketing stats
  SELECT jsonb_build_object(
    'promo_usage_count', COALESCE(promo_usage_count, 0),
    'promo_roi', CASE
      WHEN COALESCE(total_discount, 0) > 0
      THEN ((promo_revenue - total_discount) * 100.0 / total_discount)
      ELSE 0
    END,
    'avg_order_value_promo', COALESCE(avg_order_value_promo, 0),
    'avg_order_value_regular', COALESCE(avg_order_value_regular, 0),
    'total_discount', COALESCE(total_discount, 0)
  )
  INTO marketing_stats_json;

  -- Hourly breakdown (only when granularity = 'hourly')
  IF p_granularity = 'hourly' THEN
    SELECT jsonb_agg(
      jsonb_build_object(
        'hour', hour_bucket,
        'revenue', revenue,
        'orders', orders,
        'avg_order_value', avg_order_value,
        'success_rate', success_rate
      )
    )
    INTO hourly_data
    FROM (
      SELECT
        date_trunc('hour', created_at) AS hour_bucket,
        COUNT(*) AS orders,
        SUM(total_price) AS revenue,
        AVG(total_price) AS avg_order_value,
        (COUNT(CASE WHEN status = 'delivered' THEN 1 END)::float /
          NULLIF(COUNT(CASE WHEN status != 'cancelled' THEN 1 END), 0) * 100) AS success_rate
      FROM _filtered_orders
      GROUP BY date_trunc('hour', created_at)
      ORDER BY hour_bucket
    ) h;
  ELSE
    hourly_data := '[]'::jsonb;
  END IF;

  DROP TABLE IF EXISTS _filtered_orders;

  RETURN jsonb_build_object(
    'revenue', COALESCE(total_revenue, 0),
    'orders', COALESCE(total_orders, 0),
    'avg_order_value', COALESCE(avg_order_value, 0),
    'success_rate', COALESCE(success_rate, 0),
    'top_products', COALESCE(top_products_json, '[]'::jsonb),
    'marketing_stats', COALESCE(marketing_stats_json, '{}'::jsonb),
    'series', COALESCE(series_json, '[]'::jsonb),
    'daily_series', COALESCE(daily_series_json, '[]'::jsonb),
    'hourly', COALESCE(hourly_data, '[]'::jsonb),
    'prev_revenue', COALESCE(prev_revenue, 0),
    'prev_orders', COALESCE(prev_orders, 0),
    'prev_success_rate', COALESCE(prev_success_rate, 0),
    'store_views', COALESCE(store_views, 0),
    'store_sales_total', COALESCE(store_sales_total, 0)
  );
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;




----------------------------------------------
-- MIGRATION: 20260505120000_fix_rls_order_access.sql
----------------------------------------------
-- Fix critical RLS data leaks on orders and order_items tables.
-- Drops broad USING(true) policies and replaces them with:
--   - Authenticated store-owner access
--   - SECURITY DEFINER RPC wrappers for anon order tracking

-- 1. Replace orders SELECT policy ------------------------------------------------

DROP POLICY IF EXISTS "Anyone can view order by id" ON public.orders;

DROP POLICY IF EXISTS "Store owners can view their orders" ON public.orders;


CREATE POLICY "Store owners can view their orders"
  ON public.orders FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = orders.store_id AND s.user_id = auth.uid()
    )
  );



-- 2. Replace order_items SELECT policy -------------------------------------------

DROP POLICY IF EXISTS "Anyone can view order items for their order" ON public.order_items;

DROP POLICY IF EXISTS "Store owners can view their order items" ON public.order_items;


CREATE POLICY "Store owners can view their order items"
  ON public.order_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.stores s ON s.id = o.store_id
      WHERE o.id = order_items.order_id AND s.user_id = auth.uid()
    )
  );



-- 3. Drop unused anon UPDATE policy ----------------------------------------------

DROP POLICY IF EXISTS "Anon can update order status to awaiting_verification" ON public.orders;



-- 4. RPC functions for anon order tracking ---------------------------------------

-- Lookup a single order by its UUID (capability URL pattern)
CREATE OR REPLACE FUNCTION public.get_order_public(p_order_id UUID)
RETURNS SETOF public.orders
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.orders WHERE id = p_order_id LIMIT 1;
END;
$$;



-- Lookup order items for a given order UUID
CREATE OR REPLACE FUNCTION public.get_order_items_public(p_order_id UUID)
RETURNS SETOF public.order_items
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.order_items WHERE order_id = p_order_id;
END;
$$;



-- Grant access to anon/authenticated roles
GRANT EXECUTE ON FUNCTION public.get_order_public(UUID) TO PUBLIC;


GRANT EXECUTE ON FUNCTION public.get_order_items_public(UUID) TO PUBLIC;




----------------------------------------------
-- MIGRATION: 20260505120001_fix_security_definer_search_path.sql
----------------------------------------------
-- Fix SECURITY DEFINER functions missing SET search_path.
-- Without a locked search_path, an attacker with CREATE privilege on the public
-- schema can shadow objects and escalate privileges.

-- 4 email queue wrappers --------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name TEXT, payload JSONB)
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN pgmq.send(queue_name, payload);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END;
$$;



CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name TEXT, batch_size INT, vt INT)
RETURNS TABLE(msg_id BIGINT, read_ct INT, message JSONB)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN;
END;
$$;



CREATE OR REPLACE FUNCTION public.delete_email(queue_name TEXT, message_id BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$$;



CREATE OR REPLACE FUNCTION public.move_to_dlq(
  source_queue TEXT, dlq_name TEXT, message_id BIGINT, payload JSONB
)
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
EXCEPTION WHEN undefined_table THEN
  BEGIN
    PERFORM pgmq.create(dlq_name);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  BEGIN
    PERFORM pgmq.delete(source_queue, message_id);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;
  RETURN new_id;
END;
$$;



-- Re-apply permission restrictions (OR REPLACE resets grants)
REVOKE EXECUTE ON FUNCTION public.enqueue_email(TEXT, JSONB) FROM PUBLIC;


GRANT EXECUTE ON FUNCTION public.enqueue_email(TEXT, JSONB) TO service_role;


REVOKE EXECUTE ON FUNCTION public.read_email_batch(TEXT, INT, INT) FROM PUBLIC;


GRANT EXECUTE ON FUNCTION public.read_email_batch(TEXT, INT, INT) TO service_role;


REVOKE EXECUTE ON FUNCTION public.delete_email(TEXT, BIGINT) FROM PUBLIC;


GRANT EXECUTE ON FUNCTION public.delete_email(TEXT, BIGINT) TO service_role;


REVOKE EXECUTE ON FUNCTION public.move_to_dlq(TEXT, TEXT, BIGINT, JSONB) FROM PUBLIC;


GRANT EXECUTE ON FUNCTION public.move_to_dlq(TEXT, TEXT, BIGINT, JSONB) TO service_role;



-- analytics_aggregation (v2 — exact body from 20260503000000, only add SET search_path)

CREATE OR REPLACE FUNCTION analytics_aggregation(
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL,
  p_store_id uuid DEFAULT NULL,
  p_granularity text DEFAULT 'daily'
) RETURNS jsonb AS $$
DECLARE
  total_orders bigint;
  total_revenue bigint;
  avg_order_value numeric;
  success_rate numeric;
  hourly_data jsonb;
  top_products_json jsonb;
  marketing_stats_json jsonb;
  series_json jsonb;
  daily_series_json jsonb;
  promo_usage_count bigint;
  promo_revenue bigint;
  total_discount bigint;
  avg_order_value_promo numeric;
  avg_order_value_regular numeric;
  prev_revenue bigint;
  prev_orders bigint;
  prev_success_rate numeric;
  store_views bigint;
  store_sales_total bigint;
  interval_dur interval;
  prev_start timestamptz;
  prev_end timestamptz;
BEGIN
  -- Compute previous period bounds
  IF p_start_date IS NOT NULL AND p_end_date IS NOT NULL THEN
    interval_dur := p_end_date - p_start_date;
    prev_start := p_start_date - interval_dur;
    prev_end := p_start_date;
  ELSE
    prev_start := NULL;
    prev_end := NULL;
  END IF;

  -- Create temp table for current period orders
  CREATE TEMP TABLE _filtered_orders ON COMMIT DROP AS
  SELECT
    id, total_price, status, created_at, promo_code, discount_amount
  FROM orders
  WHERE
    (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at < p_end_date)
    AND (p_store_id IS NULL OR orders.store_id = p_store_id);

  -- Overall aggregates
  SELECT
    COUNT(*) AS orders,
    SUM(total_price) AS revenue,
    AVG(total_price) AS avg_order_value,
    (COUNT(CASE WHEN status = 'delivered' THEN 1 END)::float /
      NULLIF(COUNT(CASE WHEN status != 'cancelled' THEN 1 END), 0) * 100) AS success_rate,
    COUNT(CASE WHEN promo_code IS NOT NULL THEN 1 END) AS promo_usage_count,
    SUM(CASE WHEN promo_code IS NOT NULL THEN total_price ELSE 0 END) AS promo_revenue,
    SUM(discount_amount) AS total_discount,
    AVG(CASE WHEN promo_code IS NOT NULL THEN total_price END) AS avg_order_value_promo,
    AVG(CASE WHEN promo_code IS NULL THEN total_price END) AS avg_order_value_regular
  INTO total_orders, total_revenue, avg_order_value, success_rate,
       promo_usage_count, promo_revenue, total_discount,
       avg_order_value_promo, avg_order_value_regular
  FROM _filtered_orders;

  -- Previous period aggregates
  IF prev_start IS NOT NULL AND prev_end IS NOT NULL THEN
    SELECT
      COALESCE(SUM(total_price), 0)::bigint,
      COALESCE(COUNT(*), 0)::bigint,
      COALESCE(
        (COUNT(CASE WHEN status = 'delivered' THEN 1 END)::float /
         NULLIF(COUNT(CASE WHEN status != 'cancelled' THEN 1 END), 0) * 100),
        0
      )
    INTO prev_revenue, prev_orders, prev_success_rate
    FROM orders
    WHERE
      created_at >= prev_start
      AND created_at < prev_end
      AND (p_store_id IS NULL OR orders.store_id = p_store_id);
  ELSE
    prev_revenue := 0;
    prev_orders := 0;
    prev_success_rate := 0;
  END IF;

  -- Store funnel data
  SELECT COALESCE(total_views, 0)::bigint, COALESCE(total_sales_count, 0)::bigint
  INTO store_views, store_sales_total
  FROM stores
  WHERE id = p_store_id;

  IF store_views IS NULL THEN
    store_views := 0;
    store_sales_total := 0;
  END IF;

  -- Top products (join with products for image_url)
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'name', tp.name,
        'units_sold', tp.units_sold,
        'revenue', tp.revenue,
        'share', CASE WHEN total_revenue > 0 THEN (tp.revenue * 100.0 / total_revenue) ELSE 0 END,
        'product_id', tp.product_id,
        'image_url', tp.image_url
      )
    ),
    '[]'::jsonb
  )
  INTO top_products_json
  FROM (
    SELECT
      oi.product_name AS name,
      SUM(oi.quantity) AS units_sold,
      SUM(oi.product_price * oi.quantity) AS revenue,
      oi.product_id,
      p.image_url
    FROM _filtered_orders fo
    JOIN order_items oi ON fo.id = oi.order_id
    LEFT JOIN products p ON oi.product_id = p.id
    GROUP BY oi.product_name, oi.product_id, p.image_url
    ORDER BY revenue DESC
    LIMIT 5
  ) tp;

  -- Hourly distribution of order counts (0-23, across all days)
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object('hour', hd.hour, 'count', hd.count)
    ),
    '[]'::jsonb
  )
  INTO series_json
  FROM (
    SELECT
      EXTRACT(HOUR FROM created_at)::integer AS hour,
      COUNT(*) AS count
    FROM _filtered_orders
    GROUP BY EXTRACT(HOUR FROM created_at)
    ORDER BY hour
  ) hd;

  -- Daily breakdown: period (date), revenue, orders
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'period', db.period,
        'revenue', db.revenue,
        'orders', db.orders
      )
    ),
    '[]'::jsonb
  )
  INTO daily_series_json
  FROM (
    SELECT
      date_trunc('day', created_at)::date::text AS period,
      SUM(total_price)::bigint AS revenue,
      COUNT(*)::bigint AS orders
    FROM _filtered_orders
    GROUP BY date_trunc('day', created_at)::date::text
    ORDER BY period
  ) db;

  -- Marketing stats
  SELECT jsonb_build_object(
    'promo_usage_count', COALESCE(promo_usage_count, 0),
    'promo_roi', CASE
      WHEN COALESCE(total_discount, 0) > 0
      THEN ((promo_revenue - total_discount) * 100.0 / total_discount)
      ELSE 0
    END,
    'avg_order_value_promo', COALESCE(avg_order_value_promo, 0),
    'avg_order_value_regular', COALESCE(avg_order_value_regular, 0),
    'total_discount', COALESCE(total_discount, 0)
  )
  INTO marketing_stats_json;

  -- Hourly breakdown (only when granularity = 'hourly')
  IF p_granularity = 'hourly' THEN
    SELECT jsonb_agg(
      jsonb_build_object(
        'hour', hour_bucket,
        'revenue', revenue,
        'orders', orders,
        'avg_order_value', avg_order_value,
        'success_rate', success_rate
      )
    )
    INTO hourly_data
    FROM (
      SELECT
        date_trunc('hour', created_at) AS hour_bucket,
        COUNT(*) AS orders,
        SUM(total_price) AS revenue,
        AVG(total_price) AS avg_order_value,
        (COUNT(CASE WHEN status = 'delivered' THEN 1 END)::float /
          NULLIF(COUNT(CASE WHEN status != 'cancelled' THEN 1 END), 0) * 100) AS success_rate
      FROM _filtered_orders
      GROUP BY date_trunc('hour', created_at)
      ORDER BY hour_bucket
    ) h;
  ELSE
    hourly_data := '[]'::jsonb;
  END IF;

  DROP TABLE IF EXISTS _filtered_orders;

  RETURN jsonb_build_object(
    'revenue', COALESCE(total_revenue, 0),
    'orders', COALESCE(total_orders, 0),
    'avg_order_value', COALESCE(avg_order_value, 0),
    'success_rate', COALESCE(success_rate, 0),
    'top_products', COALESCE(top_products_json, '[]'::jsonb),
    'marketing_stats', COALESCE(marketing_stats_json, '{}'::jsonb),
    'series', COALESCE(series_json, '[]'::jsonb),
    'daily_series', COALESCE(daily_series_json, '[]'::jsonb),
    'hourly', COALESCE(hourly_data, '[]'::jsonb),
    'prev_revenue', COALESCE(prev_revenue, 0),
    'prev_orders', COALESCE(prev_orders, 0),
    'prev_success_rate', COALESCE(prev_success_rate, 0),
    'store_views', COALESCE(store_views, 0),
    'store_sales_total', COALESCE(store_sales_total, 0)
  );
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public;



-- Re-apply permission (OR REPLACE resets grants)
GRANT EXECUTE ON FUNCTION analytics_aggregation(timestamptz, timestamptz, uuid, text) TO authenticated, service_role;




----------------------------------------------
-- MIGRATION: 20260505120002_fix_reviews_insert_policy.sql
----------------------------------------------
-- Fix reviews INSERT policy: replace WITH CHECK(true) with a policy that
-- validates the review references a real order and product in that order.
-- Phone-hash validation still happens in the submit-review Edge Function.

DROP POLICY IF EXISTS "Anyone can insert reviews" ON public.reviews;

DROP POLICY IF EXISTS "Reviews must reference valid order" ON public.reviews;


CREATE POLICY "Reviews must reference valid order"
  ON public.reviews FOR INSERT TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = reviews.order_id AND o.store_id = reviews.store_id
    )
    AND EXISTS (
      SELECT 1 FROM public.order_items oi
      WHERE oi.order_id = reviews.order_id AND oi.product_id = reviews.product_id
    )
  );




----------------------------------------------
-- MIGRATION: 20260505130000_multi_store_architecture.sql
----------------------------------------------
-- Multi-Store Architecture: store_members table + RLS rewrite.
-- Replaces the 1:1 stores.user_id ownership model with a many-to-many
-- store_members table that supports owner/manager/viewer roles.
--
-- 1. Create store_members table
-- 2. Backfill existing stores.user_id → store_members (role=owner)
-- 3. Create is_store_member() helper for RLS policies
-- 4. Rewrite all owner-check RLS policies to use store_members

-- 1. store_members table -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.store_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'manager', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id, user_id)
);



ALTER TABLE public.store_members ENABLE ROW LEVEL SECURITY;



-- 2. Backfill existing owners ------------------------------------------------------
INSERT INTO public.store_members (store_id, user_id, role)
SELECT id, user_id, 'owner'
FROM public.stores
ON CONFLICT (store_id, user_id) DO NOTHING;



-- 3. Helper: is_store_member -------------------------------------------------------
-- SECURITY DEFINER bypasses RLS on store_members, preventing circularity.
CREATE OR REPLACE FUNCTION public.is_store_member(_store_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.store_members
    WHERE store_id = _store_id AND user_id = auth.uid()
  );
$$;

DROP POLICY IF EXISTS "Users can view own memberships" ON public.store_members;


-- 4. store_members RLS -------------------------------------------------------------
-- Users can see their own memberships
CREATE POLICY "Users can view own memberships"
  ON public.store_members FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Store owners can insert members" ON public.store_members;


-- Only store owners can manage members (avoids circularity by checking stores.user_id)
CREATE POLICY "Store owners can insert members"
  ON public.store_members FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.stores WHERE stores.id = store_members.store_id AND stores.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Store owners can update members" ON public.store_members;


CREATE POLICY "Store owners can update members"
  ON public.store_members FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.stores WHERE stores.id = store_members.store_id AND stores.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Store owners can delete members" ON public.store_members;


CREATE POLICY "Store owners can delete members"
  ON public.store_members FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.stores WHERE stores.id = store_members.store_id AND stores.user_id = auth.uid())
  );



-- 5. Rewrite stores policies -------------------------------------------------------
DROP POLICY IF EXISTS "Owners can update stores" ON public.stores;


DROP POLICY IF EXISTS "Owners can delete stores" ON public.stores;

DROP POLICY IF EXISTS "Owners can update stores" ON public.stores;


CREATE POLICY "Owners can update stores"
  ON public.stores FOR UPDATE
  USING (public.is_store_member(id));

DROP POLICY IF EXISTS "Owners can delete stores" ON public.stores;


CREATE POLICY "Owners can delete stores"
  ON public.stores FOR DELETE
  USING (public.is_store_member(id));



-- 6. Rewrite products policies -----------------------------------------------------
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;


DROP POLICY IF EXISTS "Store owners can insert products" ON public.products;


DROP POLICY IF EXISTS "Store owners can update products" ON public.products;


DROP POLICY IF EXISTS "Store owners can delete products" ON public.products;

DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;


CREATE POLICY "Anyone can view active products"
  ON public.products FOR SELECT USING (
    is_active = true OR public.is_store_member(store_id)
  );

DROP POLICY IF EXISTS "Store owners can insert products" ON public.products;


CREATE POLICY "Store owners can insert products"
  ON public.products FOR INSERT
  WITH CHECK (public.is_store_member(store_id));

DROP POLICY IF EXISTS "Store owners can update products" ON public.products;


CREATE POLICY "Store owners can update products"
  ON public.products FOR UPDATE
  USING (public.is_store_member(store_id));

DROP POLICY IF EXISTS "Store owners can delete products" ON public.products;


CREATE POLICY "Store owners can delete products"
  ON public.products FOR DELETE
  USING (public.is_store_member(store_id));



-- 7. Rewrite orders policies -------------------------------------------------------
DROP POLICY IF EXISTS "Store owners can view their orders" ON public.orders;


DROP POLICY IF EXISTS "Store owners can update orders" ON public.orders;

DROP POLICY IF EXISTS "Store owners can view their orders" ON public.orders;


CREATE POLICY "Store owners can view their orders"
  ON public.orders FOR SELECT TO authenticated
  USING (public.is_store_member(store_id));

DROP POLICY IF EXISTS "Store owners can update orders" ON public.orders;


CREATE POLICY "Store owners can update orders"
  ON public.orders FOR UPDATE
  USING (public.is_store_member(store_id));



-- 8. Rewrite order_items policies --------------------------------------------------
DROP POLICY IF EXISTS "Store owners can view their order items" ON public.order_items;

DROP POLICY IF EXISTS "Store owners can view their order items" ON public.order_items;


CREATE POLICY "Store owners can view their order items"
  ON public.order_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id AND public.is_store_member(o.store_id)
    )
  );



-- 9. Rewrite product_images policies -----------------------------------------------
DROP POLICY IF EXISTS "Store owners can manage product images" ON public.product_images;

DROP POLICY IF EXISTS "Store owners can manage product images" ON public.product_images;


CREATE POLICY "Store owners can manage product images"
  ON public.product_images FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_images.product_id AND public.is_store_member(p.store_id)
    )
  );



-- 10. Rewrite product_variants policies --------------------------------------------
DROP POLICY IF EXISTS "Store owners can manage product variants" ON public.product_variants;

DROP POLICY IF EXISTS "Store owners can manage product variants" ON public.product_variants;


CREATE POLICY "Store owners can manage product variants"
  ON public.product_variants FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_variants.product_id AND public.is_store_member(p.store_id)
    )
  );



-- 11. Rewrite order_contacts policies ----------------------------------------------
DROP POLICY IF EXISTS "Store owners can view contact phones" ON public.order_contacts;


DROP POLICY IF EXISTS "Store owners can insert order contacts" ON public.order_contacts;

DROP POLICY IF EXISTS "Store owners can view contact phones" ON public.order_contacts;


CREATE POLICY "Store owners can view contact phones"
  ON public.order_contacts FOR SELECT
  USING (public.is_store_member(store_id));

DROP POLICY IF EXISTS "Store owners can insert order contacts" ON public.order_contacts;


CREATE POLICY "Store owners can insert order contacts"
  ON public.order_contacts FOR INSERT TO authenticated
  WITH CHECK (public.is_store_member(store_id));



-- 12. Rewrite payment_attempts policies --------------------------------------------
DROP POLICY IF EXISTS "Store owners can view payment attempts" ON public.payment_attempts;


DROP POLICY IF EXISTS "Store owners can update payment attempts" ON public.payment_attempts;

DROP POLICY IF EXISTS "Store owners can view payment attempts" ON public.payment_attempts;


CREATE POLICY "Store owners can view payment attempts"
  ON public.payment_attempts FOR SELECT
  USING (public.is_store_member(store_id));

DROP POLICY IF EXISTS "Store owners can update payment attempts" ON public.payment_attempts;


CREATE POLICY "Store owners can update payment attempts"
  ON public.payment_attempts FOR UPDATE
  USING (public.is_store_member(store_id));



-- 13. Rewrite store_promo_codes policies -------------------------------------------
DROP POLICY IF EXISTS "Store owners can manage their promo codes" ON public.store_promo_codes;

DROP POLICY IF EXISTS "Store owners can manage their promo codes" ON public.store_promo_codes;


CREATE POLICY "Store owners can manage their promo codes"
  ON public.store_promo_codes FOR ALL
  USING (public.is_store_member(store_id));



-- 14. Rewrite categories policies --------------------------------------------------
DROP POLICY IF EXISTS "Store owners can insert categories" ON public.categories;


DROP POLICY IF EXISTS "Store owners can update categories" ON public.categories;


DROP POLICY IF EXISTS "Store owners can delete categories" ON public.categories;

DROP POLICY IF EXISTS "Store owners can insert categories" ON public.categories;


CREATE POLICY "Store owners can insert categories"
  ON public.categories FOR INSERT
  WITH CHECK (public.is_store_member(store_id));

DROP POLICY IF EXISTS "Store owners can update categories" ON public.categories;


CREATE POLICY "Store owners can update categories"
  ON public.categories FOR UPDATE
  USING (public.is_store_member(store_id));

DROP POLICY IF EXISTS "Store owners can delete categories" ON public.categories;


CREATE POLICY "Store owners can delete categories"
  ON public.categories FOR DELETE
  USING (public.is_store_member(store_id));



-- 15. Rewrite reports policies -----------------------------------------------------
DROP POLICY IF EXISTS "Store owners can view reports" ON public.reports;

DROP POLICY IF EXISTS "Store owners can view reports" ON public.reports;


CREATE POLICY "Store owners can view reports"
  ON public.reports FOR SELECT TO authenticated
  USING (public.is_store_member(store_id));



-- 16. Rewrite return_requests policies ---------------------------------------------
DROP POLICY IF EXISTS "Store owners can view return_requests" ON public.return_requests;


DROP POLICY IF EXISTS "Store owners can update return_requests" ON public.return_requests;


DROP POLICY IF EXISTS "Store owners can delete return_requests" ON public.return_requests;

DROP POLICY IF EXISTS "Store owners can view return_requests" ON public.return_requests;


CREATE POLICY "Store owners can view return_requests"
  ON public.return_requests FOR SELECT TO authenticated
  USING (public.is_store_member(store_id));

DROP POLICY IF EXISTS "Store owners can update return_requests" ON public.return_requests;


CREATE POLICY "Store owners can update return_requests"
  ON public.return_requests FOR UPDATE TO authenticated
  USING (public.is_store_member(store_id))
  WITH CHECK (public.is_store_member(store_id));

DROP POLICY IF EXISTS "Store owners can delete return_requests" ON public.return_requests;


CREATE POLICY "Store owners can delete return_requests"
  ON public.return_requests FOR DELETE TO authenticated
  USING (public.is_store_member(store_id));



-- 17. Index ------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_store_members_user_id ON public.store_members(user_id);


CREATE INDEX IF NOT EXISTS idx_store_members_store_id ON public.store_members(store_id);




----------------------------------------------
-- MIGRATION: 20260505140000_auto_add_store_owner_to_members.sql
----------------------------------------------
-- Automatically add store creator to store_members as owner.
-- Prevents RLS lockout when a new store is created but no store_members row exists.

CREATE OR REPLACE FUNCTION public.add_store_owner_to_members()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.store_members (store_id, user_id, role)
  VALUES (NEW.id, NEW.user_id, 'owner')
  ON CONFLICT (store_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;



DROP TRIGGER IF EXISTS trg_add_store_owner_to_members ON public.stores;

DROP TRIGGER IF EXISTS trg_add_store_owner_to_members ON public.stores;

CREATE TRIGGER trg_add_store_owner_to_members
  AFTER INSERT ON public.stores FOR EACH ROW
  EXECUTE FUNCTION public.add_store_owner_to_members();




----------------------------------------------
-- MIGRATION: 20260505150000_user_subscription_profiles.sql
----------------------------------------------
-- Migrate Pro subscription from per-store to per-user (profiles table).
-- One Pro payment covers all stores owned by the user.

-- 1. Add subscription columns to profiles -----------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_type TEXT NOT NULL DEFAULT 'free';


ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_active BOOLEAN NOT NULL DEFAULT false;


ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'none';


ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_screenshot_url TEXT;


ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_expiry TIMESTAMPTZ;



-- 2. Backfill from most premium store per user ------------------------------------
-- Priority: pro_year > pro_month > pre_authorized > free
UPDATE public.profiles p
SET
  plan_type = COALESCE(backfill.plan_type, 'free'),
  subscription_active = COALESCE(backfill.subscription_active, false),
  subscription_status = COALESCE(backfill.subscription_status, 'none'),
  subscription_screenshot_url = backfill.subscription_screenshot_url,
  subscription_expiry = backfill.subscription_expiry
FROM (
  SELECT DISTINCT ON (s.user_id)
    s.user_id,
    s.plan_type,
    s.subscription_active,
    s.subscription_status,
    s.subscription_screenshot_url,
    s.subscription_expiry
  FROM public.stores s
  WHERE s.plan_type != 'free' OR s.subscription_status != 'none'
  ORDER BY s.user_id,
    CASE s.plan_type
      WHEN 'pro_year' THEN 1
      WHEN 'pro_month' THEN 2
      ELSE 3
    END,
    s.subscription_expiry DESC NULLS LAST
) backfill
WHERE p.user_id = backfill.user_id;




----------------------------------------------
-- MIGRATION: 20260506000000_admin_rls.sql
----------------------------------------------
-- Admin Dashboard RLS: role column, is_admin() helper, admin-bypass policies.
-- Gives admins (profiles.role = 'admin') read/write access to all tables.

-- 1. Ensure role column exists on profiles (idempotent) --------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';



-- 2. is_admin() helper -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;


-- 3. Admin SELECT policies (read any row in restricted tables) -------------------

CREATE POLICY "Admins can view all orders"
  ON public.orders FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all order items" ON public.order_items;


CREATE POLICY "Admins can view all order items"
  ON public.order_items FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all store memberships" ON public.store_members;


CREATE POLICY "Admins can view all store memberships"
  ON public.store_members FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;


CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all reports" ON public.reports;


CREATE POLICY "Admins can view all reports"
  ON public.reports FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all payment attempts" ON public.payment_attempts;


CREATE POLICY "Admins can view all payment attempts"
  ON public.payment_attempts FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all return requests" ON public.return_requests;


CREATE POLICY "Admins can view all return requests"
  ON public.return_requests FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all verification audit log" ON public.verification_audit_log;


CREATE POLICY "Admins can view all verification audit log"
  ON public.verification_audit_log FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all reviews" ON public.reviews;


CREATE POLICY "Admins can view all reviews"
  ON public.reviews FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all order contacts" ON public.order_contacts;


CREATE POLICY "Admins can view all order contacts"
  ON public.order_contacts FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all products" ON public.products;


-- Products: admins can also see inactive products
CREATE POLICY "Admins can view all products"
  ON public.products FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update any store" ON public.stores;


-- 4. Admin mutation policies -----------------------------------------------------

CREATE POLICY "Admins can update any store"
  ON public.stores FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete any store" ON public.stores;


CREATE POLICY "Admins can delete any store"
  ON public.stores FOR DELETE TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update any product" ON public.products;


CREATE POLICY "Admins can update any product"
  ON public.products FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update any order" ON public.orders;


CREATE POLICY "Admins can update any order"
  ON public.orders FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;


CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());




----------------------------------------------
-- MIGRATION: 20260506000001_audit_fixes.sql
----------------------------------------------
-- Functional audit fixes:
--   1. Enable RLS on verification_audit_log (was missing)
--   2. Enable RLS on return_requests (was missing — policies were inert)
--   3. Admin INSERT/DELETE policies for tables the admin dashboard touches
--   4. Admin SELECT for store_promo_codes (sees all, including inactive)
--   5. Revoke authenticated direct access to analytics_aggregation (no ownership check)

-- 1. Enable RLS on tables missing it -----------------------------------------------

ALTER TABLE public.verification_audit_log ENABLE ROW LEVEL SECURITY;


ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can insert stores" ON public.stores;


-- verification_audit_log is written by edge functions (service_role) and read by admins
-- Edge functions bypass RLS via service_role key; admin SELECT policy already exists.
-- No additional policies needed — the existing "Admins can view all verification audit log"
-- policy from 20260506000000 becomes active once RLS is enabled.

-- return_requests already has policies from 20260505130000 (multi-store rewrite) and
-- the original anon INSERT from 20260502210000. Enabling RLS activates them.

-- 2. Admin INSERT/DELETE policies --------------------------------------------------

CREATE POLICY "Admins can insert stores"
  ON public.stores FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert products" ON public.products;


CREATE POLICY "Admins can insert products"
  ON public.products FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete products" ON public.products;


CREATE POLICY "Admins can delete products"
  ON public.products FOR DELETE TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;


CREATE POLICY "Admins can manage categories"
  ON public.categories FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage promo codes" ON public.promo_codes;


CREATE POLICY "Admins can manage promo codes"
  ON public.promo_codes FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all store promo codes" ON public.store_promo_codes;


-- 3. Admin SELECT for store_promo_codes (incl. inactive) ---------------------------

CREATE POLICY "Admins can view all store promo codes"
  ON public.store_promo_codes FOR SELECT TO authenticated
  USING (public.is_admin());



-- 4. Lock analytics_aggregation to service_role only -------------------------------
-- The function is SECURITY DEFINER with no ownership check — any authenticated user
-- can query any store's analytics by passing any UUID.
-- Frontend must use the analytics-aggregation Edge Function instead.

REVOKE EXECUTE ON FUNCTION public.analytics_aggregation(timestamptz, timestamptz, uuid, text) FROM authenticated, PUBLIC;


GRANT EXECUTE ON FUNCTION public.analytics_aggregation(timestamptz, timestamptz, uuid, text) TO service_role;




----------------------------------------------
-- MIGRATION: 20260506000002_add_missing_fk_indexes.sql
----------------------------------------------
-- Add indexes for 9 unindexed foreign-key columns identified in audit H8.
-- These columns are the join targets for the most common dashboard queries.
-- Without them, every join on these FKs triggers a sequential scan.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);


CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_images_product_id ON public.product_images(product_id);


CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_variants_product_id ON public.product_variants(product_id);


CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_contacts_store_id ON public.order_contacts(store_id);


CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_promo_codes_store_id ON public.store_promo_codes(store_id);


CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_product_id ON public.reviews(product_id);


CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_store_id ON public.reviews(store_id);


CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_order_id ON public.reviews(order_id);


CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reports_store_id ON public.reports(store_id);




----------------------------------------------
-- MIGRATION: 20260507200000_setup_cron_jobs.sql
----------------------------------------------
-- ============================================================
-- pg_cron Jobs — expire-stale-orders, process-email-queue
-- ============================================================
-- Prerequisites (already applied):
--   pg_cron extension  ✓
--   pg_net  extension  ✓
--   vault.create_secret('dokan_supabase_url') ✓
--   vault.create_secret('dokan_anon_key')     ✓
--
-- Status: APPLIED via Management API / SQL editor
-- ============================================================

-- === SCHEMA: cron_helper ===
-- Use a dedicated schema instead of cron to avoid DDL restrictions

create extension if not exists pg_cron;


create schema if not exists cron_helper;



-- === HELPER: get vault secret by name ===
create or replace function cron_helper.vault_secret(name text)
returns text
language plpgsql
security definer
stable
as $$
declare
  val text;
begin
  select decrypted_secret into val
  from vault.decrypted_secrets
  where vault.decrypted_secrets.name = vault_secret.name
  limit 1;
  return val;
end;
$$;



-- === HELPER: call an edge function via net.http_post ===
create or replace function cron_helper.invoke_edge(function_name text, body jsonb default '{}'::jsonb)
returns bigint
language plpgsql
security definer
as $$
declare
  url text;
  anon_key text;
  req_id bigint;
begin
  url := cron_helper.vault_secret('dokan_supabase_url');
  if url is null then
    raise warning 'dokan_supabase_url not set — skipping %', function_name;
    return -1;
  end if;
  anon_key := cron_helper.vault_secret('dokan_anon_key');
  select net.http_post(
    url := url || '/functions/v1/' || function_name,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(anon_key, '')
    ),
    body := coalesce(body, '{}'::jsonb)
  ) into req_id;
  return req_id;
end;
$$;



grant usage on schema cron_helper to public;


grant execute on all functions in schema cron_helper to public;



-- === CRON: expire-stale-orders ===
-- Runs every 5 minutes, cancels "new" (>30 min) and "awaiting_verification" (>24h) orders
select cron.schedule(
  'expire-stale-orders',
  '*/5 * * * *',
  $$select cron_helper.invoke_edge('expire-stale-orders');$$
);



-- === CRON: process-email-queue ===
-- Runs every minute, drains auth and transactional email queues
select cron.schedule(
  'process-email-queue',
  '* * * * *',
  $$select cron_helper.invoke_edge('process-email-queue');$$
);




----------------------------------------------
-- MIGRATION: 20260508000002_cleanup_old_rls_policies.sql
----------------------------------------------
-- Cleanup: drop old RLS policies that still use stores.user_id = auth.uid().
-- These were superseded by the multi_store_architecture migration but the old
-- policies were not explicitly dropped in all cases.

-- 1. categories: old ALL policy "Allow store owners to manage categories"
--    was left behind. Superseded by individual INSERT/UPDATE/DELETE policies.
DROP POLICY IF EXISTS "Allow store owners to manage categories" ON public.categories;



-- 2. order_items: old "Store owners can view order items" was left behind.
--    Superseded by "Store owners can view their order items" which uses
--    is_store_member() via orders.store_id.
DROP POLICY IF EXISTS "Store owners can view order items" ON public.order_items;



-- 3. orders: old "Store owners can view public order ids" was left behind.
--    Superseded by "Store owners can view their orders" which uses is_store_member().
DROP POLICY IF EXISTS "Store owners can view public order ids" ON public.orders;




----------------------------------------------
-- MIGRATION: 20260509000000_add_return_statuses.sql
----------------------------------------------
-- Add returned/refunded order statuses for off-platform return handling
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;


ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status = ANY (ARRAY[
    'new', 'awaiting_verification', 'paid_confirmed', 'payment_rejected',
    'confirmed', 'shipped', 'delivered', 'cancelled', 'returned', 'refunded'
  ]));




----------------------------------------------
-- MIGRATION: 20260509000001_fix_return_stock_and_analytics.sql
----------------------------------------------
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




----------------------------------------------
-- MIGRATION: 20260511000001_fix_return_requests_rls.sql
----------------------------------------------
-- Fix critical security: return_requests anon INSERT had WITH CHECK(true),
-- allowing anyone to submit unlimited return requests with arbitrary data.
--
-- New policy validates:
--   1. reason is non-empty
--   2. status is locked to 'pending' (can't forge approved/rejected)
--   3. the order_id actually exists and belongs to the claimed store_id

DROP POLICY IF EXISTS "Allow anon insert return_requests" ON public.return_requests;

DROP POLICY IF EXISTS "Allow anon insert return_requests" ON public.return_requests;


CREATE POLICY "Allow anon insert return_requests" ON public.return_requests
  FOR INSERT TO anon
  WITH CHECK (
    reason IS NOT NULL
    AND reason != ''
    AND status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_id
        AND orders.store_id = store_id
    )
  );




----------------------------------------------
-- MIGRATION: 20260511000002_restrict_stores_columns.sql
----------------------------------------------
-- Restrict direct public table access to stores so sensitive columns
-- (payment_phone, total_earned, subscription_* etc.) are not exposed.
--
-- Approach:
--   1. Create a SECURITY DEFINER function that returns only public-safe columns
--   2. Route public storefront queries through it instead of direct table access
--   3. Keep the existing "Anyone can view stores" for authenticated users
--      who need it (store members fetching their own store data)
--
-- Public-safe columns for the storefront:
--   id, name, slug, description, user_id,
--   instagram, tiktok_handle, telegram_chat_id,
--   hero_image_url, hero_title, hero_subtitle,
--   payment_qr_image, is_verified, verification_status,
--   is_paused,
--   show_instagram, show_tiktok, show_telegram, show_banner,
--   default_language, theme_preset,
--   tax_enabled, tax_percent,
--   created_at, updated_at

CREATE OR REPLACE FUNCTION public.get_public_store(p_slug TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  description TEXT,
  user_id UUID,
  instagram TEXT,
  tiktok_handle TEXT,
  telegram_chat_id TEXT,
  hero_image_url TEXT,
  hero_title TEXT,
  hero_subtitle TEXT,
  payment_qr_image TEXT,
  is_verified BOOLEAN,
  verification_status TEXT,
  is_paused BOOLEAN,
  show_instagram BOOLEAN,
  show_tiktok BOOLEAN,
  show_telegram BOOLEAN,
  show_banner BOOLEAN,
  default_language TEXT,
  theme_preset TEXT,
  tax_enabled BOOLEAN,
  tax_percent NUMERIC,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id, s.name, s.slug, s.description, s.user_id,
    s.instagram, s.tiktok_handle, s.telegram_chat_id,
    s.hero_image_url, s.hero_title, s.hero_subtitle,
    s.payment_qr_image, s.is_verified, s.verification_status,
    s.is_paused,
    s.show_instagram, s.show_tiktok, s.show_telegram, s.show_banner,
    s.default_language, s.theme_preset,
    s.tax_enabled, s.tax_percent,
    s.created_at, s.updated_at
  FROM public.stores s
  WHERE s.slug = p_slug
  LIMIT 1;
END;
$$;



GRANT EXECUTE ON FUNCTION public.get_public_store(TEXT) TO PUBLIC;




----------------------------------------------
-- MIGRATION: 20260511000003_enforce_free_product_limit.sql
----------------------------------------------
-- Enforce FREE_PRODUCT_LIMIT (5) server-side via a BEFORE INSERT trigger.
-- Previously, the limit was only checked client-side, allowing free-tier users
-- to bypass it via direct API calls.

CREATE OR REPLACE FUNCTION public.check_free_product_limit()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _plan_type TEXT;
  _product_count INTEGER;
BEGIN
  -- Look up the store owner's plan type
  SELECT p.plan_type INTO _plan_type
  FROM public.profiles p
  JOIN public.stores s ON s.user_id = p.user_id
  WHERE s.id = NEW.store_id;

  IF _plan_type = 'free' THEN
    SELECT COUNT(*) INTO _product_count
    FROM public.products
    WHERE store_id = NEW.store_id;

    IF _product_count >= 5 THEN
      RAISE EXCEPTION 'Free plan limit reached: maximum 5 products per store'
        USING HINT = 'Upgrade to Pro to create more products';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;



DROP TRIGGER IF EXISTS trg_check_free_product_limit ON public.products;

DROP TRIGGER IF EXISTS trg_check_free_product_limit ON public.products;

CREATE TRIGGER trg_check_free_product_limit
  BEFORE INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.check_free_product_limit();




----------------------------------------------
-- MIGRATION: 20260511000004_fix_stock_race_condition.sql
----------------------------------------------
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




----------------------------------------------
-- MIGRATION: 20260513000001_downgrade_expired_subscriptions.sql
----------------------------------------------
-- ============================================================
-- Cron job: downgrade-expired — daily at 3 AM local time
-- ============================================================
-- Finds profiles where plan_type is pro/... and
-- subscription_expiry < now(), then resets to free.
-- ============================================================

select cron.schedule(
  'downgrade-expired',
  '0 3 * * *',
  $$select cron_helper.invoke_edge('downgrade-expired');$$
);




----------------------------------------------
-- MIGRATION: 20260519000001_add_slug_customized.sql
----------------------------------------------
ALTER TABLE stores ADD COLUMN IF NOT EXISTS slug_customized boolean DEFAULT false NOT NULL;




----------------------------------------------
-- MIGRATION: 20260521000001_admin_user_emails.sql
----------------------------------------------
-- Admin function to get user emails from auth.users
-- Only callable by admin users via SECURITY DEFINER
CREATE OR REPLACE FUNCTION get_user_emails(user_ids JSONB)
RETURNS TABLE(user_id UUID, email TEXT)
SECURITY DEFINER
AS $$
BEGIN
  -- Check that the caller is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT au.id::UUID, au.email::TEXT
  FROM auth.users au
  WHERE au.id = ANY(SELECT jsonb_array_elements_text(user_ids)::UUID);
END;
$$ LANGUAGE plpgsql;




----------------------------------------------
-- MIGRATION: 20260521000002_fix_get_user_emails.sql
----------------------------------------------
-- Fix get_user_emails to accept JSONB (compatible with supabase-js array params)
DROP FUNCTION IF EXISTS get_user_emails;



CREATE OR REPLACE FUNCTION get_user_emails(user_ids JSONB)
RETURNS TABLE(user_id UUID, email TEXT)
SECURITY DEFINER
AS $$
BEGIN
  -- Check that the caller is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT au.id::UUID, au.email::TEXT
  FROM auth.users au
  WHERE au.id = ANY(SELECT jsonb_array_elements_text(user_ids)::UUID);
END;
$$ LANGUAGE plpgsql;



----------------------------------------------
-- MIGRATION: 20260521000003_grant_get_user_emails.sql
----------------------------------------------
-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_emails(JSONB) TO authenticated;



----------------------------------------------
-- MIGRATION: 20260521000004_add_email_to_profiles.sql
----------------------------------------------
-- Add email column to profiles (synced from auth.users)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;



-- Update the auto-create trigger to also store email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email), NEW.email)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;



-- Backfill emails for existing profiles
UPDATE public.profiles p
SET email = au.email
FROM auth.users au
WHERE p.user_id = au.id
  AND p.email IS NULL;



-- Drop the RPC function (no longer needed — query profiles.email directly)
DROP FUNCTION IF EXISTS get_user_emails;




----------------------------------------------
-- MIGRATION: 20260521000005_delete_test_accounts.sql
----------------------------------------------
-- Delete test user accounts (delete in dependency order since not all FK constraints are CASCADE)
DELETE FROM public.store_members WHERE user_id IN (
  SELECT id FROM auth.users WHERE email IN ('playwright-test@dokan.com', 'test-1778527363205@dokan.com', 'test-1778527330315@dokan.com')
);


DELETE FROM public.stores WHERE user_id IN (
  SELECT id FROM auth.users WHERE email IN ('playwright-test@dokan.com', 'test-1778527363205@dokan.com', 'test-1778527330315@dokan.com')
);


DELETE FROM public.profiles WHERE user_id IN (
  SELECT id FROM auth.users WHERE email IN ('playwright-test@dokan.com', 'test-1778527363205@dokan.com', 'test-1778527330315@dokan.com')
);


DELETE FROM auth.users
WHERE email IN (
  'playwright-test@dokan.com',
  'test-1778527363205@dokan.com',
  'test-1778527330315@dokan.com'
);




----------------------------------------------
-- MIGRATION: 20260521000006_fix_total_sales_count_trigger.sql
----------------------------------------------
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




----------------------------------------------
-- MIGRATION: 20260521000007_add_full_daily_series.sql
----------------------------------------------
-- Add full_daily_series to analytics_aggregation for the OrderContributionChart heatmap.
-- The existing daily_series only covers the requested date range (7/30/90 days),
-- but the heatmap renders a rolling 12-month window. Without full data ~98 % of cells
-- are empty. This new field always returns 12 months of daily order counts.

CREATE OR REPLACE FUNCTION analytics_aggregation(
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL,
  p_store_id uuid DEFAULT NULL,
  p_granularity text DEFAULT 'daily'
) RETURNS jsonb AS $$
DECLARE
  total_orders bigint;
  total_revenue bigint;
  avg_order_value numeric;
  success_rate numeric;
  hourly_data jsonb;
  top_products_json jsonb;
  marketing_stats_json jsonb;
  series_json jsonb;
  daily_series_json jsonb;
  full_daily_series_json jsonb;
  promo_usage_count bigint;
  promo_revenue bigint;
  total_discount bigint;
  avg_order_value_promo numeric;
  avg_order_value_regular numeric;
  prev_revenue bigint;
  prev_orders bigint;
  prev_success_rate numeric;
  store_views bigint;
  store_sales_total bigint;
  interval_dur interval;
  prev_start timestamptz;
  prev_end timestamptz;
BEGIN
  -- Compute previous period bounds
  IF p_start_date IS NOT NULL AND p_end_date IS NOT NULL THEN
    interval_dur := p_end_date - p_start_date;
    prev_start := p_start_date - interval_dur;
    prev_end := p_start_date;
  ELSE
    prev_start := NULL;
    prev_end := NULL;
  END IF;

  -- Create temp table for current period orders
  CREATE TEMP TABLE _filtered_orders ON COMMIT DROP AS
  SELECT
    id, total_price, status, created_at, promo_code, discount_amount
  FROM orders
  WHERE
    (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at < p_end_date)
    AND (p_store_id IS NULL OR orders.store_id = p_store_id);

  -- Overall aggregates
  SELECT
    COUNT(*) AS orders,
    SUM(total_price) AS revenue,
    AVG(total_price) AS avg_order_value,
    (COUNT(CASE WHEN status = 'delivered' THEN 1 END)::float /
      NULLIF(COUNT(CASE WHEN status != 'cancelled' THEN 1 END), 0) * 100) AS success_rate,
    COUNT(CASE WHEN promo_code IS NOT NULL THEN 1 END) AS promo_usage_count,
    SUM(CASE WHEN promo_code IS NOT NULL THEN total_price ELSE 0 END) AS promo_revenue,
    SUM(discount_amount) AS total_discount,
    AVG(CASE WHEN promo_code IS NOT NULL THEN total_price END) AS avg_order_value_promo,
    AVG(CASE WHEN promo_code IS NULL THEN total_price END) AS avg_order_value_regular
  INTO total_orders, total_revenue, avg_order_value, success_rate,
       promo_usage_count, promo_revenue, total_discount,
       avg_order_value_promo, avg_order_value_regular
  FROM _filtered_orders;

  -- Previous period aggregates
  IF prev_start IS NOT NULL AND prev_end IS NOT NULL THEN
    SELECT
      COALESCE(SUM(total_price), 0)::bigint,
      COALESCE(COUNT(*), 0)::bigint,
      COALESCE(
        (COUNT(CASE WHEN status = 'delivered' THEN 1 END)::float /
         NULLIF(COUNT(CASE WHEN status != 'cancelled' THEN 1 END), 0) * 100),
        0
      )
    INTO prev_revenue, prev_orders, prev_success_rate
    FROM orders
    WHERE
      created_at >= prev_start
      AND created_at < prev_end
      AND (p_store_id IS NULL OR orders.store_id = p_store_id);
  ELSE
    prev_revenue := 0;
    prev_orders := 0;
    prev_success_rate := 0;
  END IF;

  -- Store funnel data
  SELECT COALESCE(total_views, 0)::bigint, COALESCE(total_sales_count, 0)::bigint
  INTO store_views, store_sales_total
  FROM stores
  WHERE id = p_store_id;

  IF store_views IS NULL THEN
    store_views := 0;
    store_sales_total := 0;
  END IF;

  -- Top products (join with products for image_url)
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'name', tp.name,
        'units_sold', tp.units_sold,
        'revenue', tp.revenue,
        'share', CASE WHEN total_revenue > 0 THEN (tp.revenue * 100.0 / total_revenue) ELSE 0 END,
        'product_id', tp.product_id,
        'image_url', tp.image_url
      )
    ),
    '[]'::jsonb
  )
  INTO top_products_json
  FROM (
    SELECT
      oi.product_name AS name,
      SUM(oi.quantity) AS units_sold,
      SUM(oi.product_price * oi.quantity) AS revenue,
      oi.product_id,
      p.image_url
    FROM _filtered_orders fo
    JOIN order_items oi ON fo.id = oi.order_id
    LEFT JOIN products p ON oi.product_id = p.id
    GROUP BY oi.product_name, oi.product_id, p.image_url
    ORDER BY revenue DESC
    LIMIT 5
  ) tp;

  -- Hourly distribution of order counts (0-23, across all days)
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object('hour', hd.hour, 'count', hd.count)
    ),
    '[]'::jsonb
  )
  INTO series_json
  FROM (
    SELECT
      EXTRACT(HOUR FROM created_at)::integer AS hour,
      COUNT(*) AS count
    FROM _filtered_orders
    GROUP BY EXTRACT(HOUR FROM created_at)
    ORDER BY hour
  ) hd;

  -- Daily breakdown for selected date range (used by RevenueChart + KPIs)
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'period', db.period,
        'revenue', db.revenue,
        'orders', db.orders
      )
    ),
    '[]'::jsonb
  )
  INTO daily_series_json
  FROM (
    SELECT
      date_trunc('day', created_at)::date::text AS period,
      SUM(total_price)::bigint AS revenue,
      COUNT(*)::bigint AS orders
    FROM _filtered_orders
    GROUP BY date_trunc('day', created_at)::date::text
    ORDER BY period
  ) db;

  -- Full 12-month daily series for the OrderContributionChart heatmap
  -- Always returns 12 months of data regardless of the selected date range
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'period', db.period,
        'revenue', db.revenue,
        'orders', db.orders
      )
    ),
    '[]'::jsonb
  )
  INTO full_daily_series_json
  FROM (
    SELECT
      date_trunc('day', created_at)::date::text AS period,
      SUM(total_price)::bigint AS revenue,
      COUNT(*)::bigint AS orders
    FROM orders
    WHERE
      created_at >= date_trunc('day', NOW()) - INTERVAL '12 months'
      AND (p_store_id IS NULL OR orders.store_id = p_store_id)
    GROUP BY date_trunc('day', created_at)::date::text
    ORDER BY period
  ) db;

  -- Marketing stats
  SELECT jsonb_build_object(
    'promo_usage_count', COALESCE(promo_usage_count, 0),
    'promo_roi', CASE
      WHEN COALESCE(total_discount, 0) > 0
      THEN ((promo_revenue - total_discount) * 100.0 / total_discount)
      ELSE 0
    END,
    'avg_order_value_promo', COALESCE(avg_order_value_promo, 0),
    'avg_order_value_regular', COALESCE(avg_order_value_regular, 0),
    'total_discount', COALESCE(total_discount, 0)
  )
  INTO marketing_stats_json;

  -- Hourly breakdown (only when granularity = 'hourly')
  IF p_granularity = 'hourly' THEN
    SELECT jsonb_agg(
      jsonb_build_object(
        'hour', hour_bucket,
        'revenue', revenue,
        'orders', orders,
        'avg_order_value', avg_order_value,
        'success_rate', success_rate
      )
    )
    INTO hourly_data
    FROM (
      SELECT
        date_trunc('hour', created_at) AS hour_bucket,
        COUNT(*) AS orders,
        SUM(total_price) AS revenue,
        AVG(total_price) AS avg_order_value,
        (COUNT(CASE WHEN status = 'delivered' THEN 1 END)::float /
          NULLIF(COUNT(CASE WHEN status != 'cancelled' THEN 1 END), 0) * 100) AS success_rate
      FROM _filtered_orders
      GROUP BY date_trunc('hour', created_at)
      ORDER BY hour_bucket
    ) h;
  ELSE
    hourly_data := '[]'::jsonb;
  END IF;

  DROP TABLE IF EXISTS _filtered_orders;

  RETURN jsonb_build_object(
    'revenue', COALESCE(total_revenue, 0),
    'orders', COALESCE(total_orders, 0),
    'avg_order_value', COALESCE(avg_order_value, 0),
    'success_rate', COALESCE(success_rate, 0),
    'top_products', COALESCE(top_products_json, '[]'::jsonb),
    'marketing_stats', COALESCE(marketing_stats_json, '{}'::jsonb),
    'series', COALESCE(series_json, '[]'::jsonb),
    'daily_series', COALESCE(daily_series_json, '[]'::jsonb),
    'full_daily_series', COALESCE(full_daily_series_json, '[]'::jsonb),
    'hourly', COALESCE(hourly_data, '[]'::jsonb),
    'prev_revenue', COALESCE(prev_revenue, 0),
    'prev_orders', COALESCE(prev_orders, 0),
    'prev_success_rate', COALESCE(prev_success_rate, 0),
    'store_views', COALESCE(store_views, 0),
    'store_sales_total', COALESCE(store_sales_total, 0)
  );
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public;



-- Re-apply permission (OR REPLACE resets grants)
GRANT EXECUTE ON FUNCTION analytics_aggregation(timestamptz, timestamptz, uuid, text) TO authenticated, service_role;




----------------------------------------------
-- SEED: seed_makeup_store.sql (testbyme@dokan.com / 123456)
----------------------------------------------
-- Seed: GLAM BEAUTY makeup store for testbyme@dokan.com demo
-- User ID: 5ee8ca6a-020e-4284-a653-645402565934
-- Password: 123456

DO $$
DECLARE
  target_user_id uuid := '5ee8ca6a-020e-4284-a653-645402565934';
  v_store_id uuid;
  prod_ids uuid[] := ARRAY[]::uuid[];
  prod_names text[] := ARRAY[
    'Velvet Matte Lipstick', 'Glossy Lip Gloss',
    'Aurora Eyeshadow Palette', 'Liquid Eyeliner',
    'Volume Mascara', 'CC Cream Perfect Skin',
    'Glow Highlighter', 'Pro Brush Set',
    'Matte Setting Powder', 'Concealer'
  ];
  prod_prices int[] := ARRAY[3500, 2500, 5500, 2000, 3000, 4500, 3500, 6000, 3000, 2500];
  prod_cats text[] := ARRAY['Lips', 'Lips', 'Eyes', 'Eyes', 'Eyes', 'Face', 'Face', 'Face', 'Face', 'Face'];
  prod_desc text[] := ARRAY[
    'Long-lasting matte lipstick with rich color. Hydrates and does not dry the lips.',
    'Shimmering lip gloss with a plumping effect. Contains Vitamin E.',
    'Palette of 12 shades: from nude to smoky. Silky texture, easy to blend.',
    'Precise eyeliner with a fine applicator. Rich black color, lasts 12h.',
    'Volumizing mascara with a false-lash effect. The brush separates every lash.',
    'BB+CC cream 3-in-1: hydration, tone, SPF15. For glowing skin.',
    'Liquid highlighter with micro-particles. Gives skin a healthy glow.',
    'Professional set of 8 brushes. Natural bristles, ergonomic handles.',
    'Light loose powder. Mattifies and sets makeup for 8 hours.',
    'Full-coverage concealer to mask dark circles and imperfections.'
  ];
  d date;
  v_order_id uuid;
  hour_val int;
  num_orders int;
  pidx int;
  prod_id uuid;
  idx int;
  oid_count int;
  status_val text;
  customer_phones text[] := ARRAY['+8801123456', '+8801987654', '+8801555443', '+8801777889', '+8801999000', '+8801765432', '+8801111222', '+8801333444'];
  customer_names text[] := ARRAY['Ayesha', 'Tahmina', 'Nusrat', 'Farhana', 'Sadia', 'Mehjabin', 'Rafia', 'Sumaiya'];
  customer_addr text[] := ARRAY['Dhaka, Banani', 'Dhaka, Dhanmondi', 'Chattogram, Agrabad', 'Dhaka, Uttara', 'Sylhet, Zindabazar', 'Khulna, Sonadanga', 'Rajshahi, Shaheb Bazar', 'Dhaka, Mirpur'];
BEGIN
  -- 0. Create the auth user (email + password login) if it does not exist
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = target_user_id) THEN
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      target_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'testbyme@dokan.com', crypt('123456', gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}',
      '{"email":"testbyme@dokan.com","email_verified":true}', now(), now()
    );
    INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
    VALUES (
      target_user_id, target_user_id, 'testbyme@dokan.com', 'email',
      jsonb_build_object('sub', target_user_id::text, 'email', 'testbyme@dokan.com'),
      now(), now(), now()
    );
  END IF;

  -- 1. Create/ensure profile
  INSERT INTO public.profiles (id, user_id, display_name, role, plan_type, subscription_active, subscription_status)
  VALUES (target_user_id, target_user_id, 'Ayesha', 'user', 'pro_month', true, 'pre_authorized')
  ON CONFLICT (user_id) DO UPDATE SET display_name = 'Ayesha', plan_type = 'pro_month', subscription_active = true;

  -- 2. Delete existing store data for this user (clean slate)
  DELETE FROM public.reviews WHERE reviews.store_id IN (SELECT s.id FROM public.stores s WHERE s.user_id = target_user_id);
  DELETE FROM public.order_items WHERE order_items.order_id IN (SELECT o.id FROM public.orders o JOIN public.stores s ON o.store_id = s.id WHERE s.user_id = target_user_id);
  DELETE FROM public.order_contacts WHERE order_contacts.order_id IN (SELECT o.id FROM public.orders o JOIN public.stores s ON o.store_id = s.id WHERE s.user_id = target_user_id);
  DELETE FROM public.orders WHERE orders.store_id IN (SELECT s.id FROM public.stores s WHERE s.user_id = target_user_id);
  DELETE FROM public.product_images WHERE product_images.product_id IN (SELECT p.id FROM public.products p JOIN public.stores s ON p.store_id = s.id WHERE s.user_id = target_user_id);
  DELETE FROM public.products WHERE products.store_id IN (SELECT s.id FROM public.stores s WHERE s.user_id = target_user_id);
  DELETE FROM public.categories WHERE categories.store_id IN (SELECT s.id FROM public.stores s WHERE s.user_id = target_user_id);
  DELETE FROM public.store_members WHERE store_members.store_id IN (SELECT s.id FROM public.stores s WHERE s.user_id = target_user_id);
  DELETE FROM public.stores WHERE stores.user_id = target_user_id;

  -- 3. Create the store
  INSERT INTO public.stores (
    user_id, name, slug, description,
    hero_title, hero_subtitle, show_banner,
    instagram, tiktok_handle, whatsapp_phone,
    payment_phone, payment_name,
    theme_preset, default_language, social_platform,
    plan_type, subscription_active, subscription_status,
    is_verified,
    slug_customized
  ) VALUES (
    target_user_id, 'GLAM BEAUTY', 'glam-beauty', 'Premium cosmetics and accessories with delivery across Bangladesh.',
    'GLAM BEAUTY', 'Premium cosmetics, delivered in Bangladesh', true,
    'glam_beauty_bd', 'glambeautybangladesh', '+88011234567',
    '+88011234567', 'Ayesha',
    'rose', 'bn', 'instagram',
    'pro_month', true, 'pre_authorized',
    true,
    true
  ) RETURNING stores.id INTO v_store_id;

  -- 4. Create categories
  INSERT INTO public.categories (store_id, name) VALUES
    (v_store_id, 'Lips'), (v_store_id, 'Eyes'),
    (v_store_id, 'Face'), (v_store_id, 'Nails');

  -- 5. Create 10 products
  FOR idx IN 1..10 LOOP
    INSERT INTO public.products (store_id, name, price, description, stock, is_active, category)
    VALUES (v_store_id, prod_names[idx], prod_prices[idx], prod_desc[idx], 20 + idx * 3, true, prod_cats[idx])
    RETURNING products.id INTO prod_id;
    prod_ids := array_append(prod_ids, prod_id);
  END LOOP;

  -- 6. Create orders across 30 days
  FOR d IN SELECT generate_series(current_date - interval '30 days', current_date, interval '1 day')::date LOOP
    IF EXTRACT(DOW FROM d) IN (0, 5, 6) THEN num_orders := 2 + floor(random() * 3)::int;
    ELSE num_orders := 1 + floor(random() * 2)::int;
    END IF;

    FOR idx IN 1..num_orders LOOP
      pidx := 1 + floor(random() * 10)::int;
      v_order_id := gen_random_uuid();

      IF random() < 0.35 THEN hour_val := 10 + floor(random() * 5)::int;
      ELSIF random() < 0.45 THEN hour_val := 19 + floor(random() * 3)::int;
      ELSE hour_val := floor(random() * 24)::int;
      END IF;

      IF random() < 0.50 THEN status_val := 'delivered';
      ELSIF random() < 0.70 THEN status_val := 'shipped';
      ELSIF random() < 0.82 THEN status_val := 'paid_confirmed';
      ELSIF random() < 0.90 THEN status_val := 'confirmed';
      ELSE status_val := 'cancelled';
      END IF;

      INSERT INTO public.orders (id, store_id, total_price, status, created_at, customer_name, customer_phone, customer_address, customer_phone_hash, subtotal)
      VALUES (v_order_id, v_store_id, prod_prices[pidx], status_val,
        (d + (hour_val || ' hours')::interval + (floor(random() * 60) || ' minutes')::interval),
        customer_names[1 + floor(random() * 8)::int],
        customer_phones[1 + floor(random() * 8)::int],
        customer_addr[1 + floor(random() * 8)::int],
        encode(digest(customer_phones[1 + floor(random() * 8)::int], 'sha256'), 'hex'),
        prod_prices[pidx]);

      INSERT INTO public.order_items (order_id, product_id, product_name, product_price, quantity)
      VALUES (v_order_id, prod_ids[pidx], prod_names[pidx], prod_prices[pidx], 1);
    END LOOP;
  END LOOP;

  -- 7. Create reviews for delivered orders (up to 15)
  FOR idx IN 1..15 LOOP
    pidx := 1 + floor(random() * 10)::int;
    INSERT INTO public.reviews (product_id, store_id, order_id, customer_phone_hash, rating, comment)
    SELECT prod_ids[pidx], v_store_id, orders.id,
      encode(digest(customer_phones[1 + floor(random() * 8)::int], 'sha256'), 'hex'),
      4 + floor(random() * 2)::int,
      (CASE floor(random() * 6)::int
        WHEN 0 THEN 'Great quality! Fast delivery.'
        WHEN 1 THEN 'Very happy with my purchase, will order again.'
        WHEN 2 THEN 'Good product for the price.'
        WHEN 3 THEN 'Matches the description, thank you!'
        WHEN 4 THEN 'Wonderful store, highly recommend!'
        ELSE 'Everything is great, top quality.'
      END)
    FROM public.orders
    WHERE orders.store_id = v_store_id AND orders.status = 'delivered'
      AND NOT EXISTS (SELECT 1 FROM public.reviews WHERE reviews.order_id = orders.id)
    LIMIT 1;
  END LOOP;

  -- 8. Update store stats counters
  SELECT COUNT(*) INTO oid_count FROM public.orders o WHERE o.store_id = v_store_id AND o.status NOT IN ('cancelled', 'returned', 'refunded');

  UPDATE public.stores SET
    total_views = 1247,
    total_sales_count = oid_count,
    total_earned = (SELECT COALESCE(SUM(o.total_price), 0) FROM public.orders o WHERE o.store_id = v_store_id AND o.status IN ('paid_confirmed', 'confirmed', 'shipped', 'delivered')),
    average_rating = 4.6,
    review_count = (SELECT COUNT(*) FROM public.reviews r WHERE r.store_id = v_store_id)
  WHERE stores.id = v_store_id;

  RAISE NOTICE 'GLAM BEAUTY store seeded! Store ID: %', v_store_id;
END $$;
