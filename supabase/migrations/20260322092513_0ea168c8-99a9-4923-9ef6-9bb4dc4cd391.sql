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
create trigger trg_recompute_store_verification
after insert or update of status or delete on public.orders
for each row
execute function public.handle_store_verification_trigger();

drop trigger if exists update_orders_updated_at on public.orders;
create trigger update_orders_updated_at
before update on public.orders
for each row
execute function public.update_updated_at_column();

drop trigger if exists update_stores_updated_at on public.stores;
create trigger update_stores_updated_at
before update on public.stores
for each row
execute function public.update_updated_at_column();

drop policy if exists "Anyone can create orders with valid data" on public.orders;
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