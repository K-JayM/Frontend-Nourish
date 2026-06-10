create extension if not exists pgcrypto with schema extensions;

-- Core records shared by the public catalogue and administrator dashboard.
create table public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 160),
  address_line text not null check (char_length(address_line) between 1 and 300),
  postcode text not null check (char_length(postcode) between 2 and 16),
  latitude numeric(9, 6) not null check (latitude between -90 and 90),
  longitude numeric(9, 6) not null check (longitude between -180 and 180),
  opening_info text,
  urgent boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete restrict,
  name text not null check (char_length(name) between 1 and 160),
  description text check (description is null or char_length(description) <= 1000),
  category text not null check (char_length(category) between 1 and 80),
  quantity_available integer not null
    check (quantity_available between 0 and 1000000),
  collect_by timestamptz not null,
  status text not null default 'available'
    check (status in ('available', 'unavailable')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid not null references public.inventory_items(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  collection_code text not null unique
    check (collection_code ~ '^NR-[A-F0-9]{16}$'),
  status text not null default 'held'
    check (status in ('held', 'collected', 'cancelled')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  updated_at timestamptz not null default now(),
  check (
    (status = 'held' and resolved_at is null)
    or (status in ('collected', 'cancelled') and resolved_at is not null)
  )
);

-- Support the public catalogue filters and administrator reservation queues.
create index inventory_items_location_id_idx
  on public.inventory_items(location_id);
create index inventory_items_public_search_idx
  on public.inventory_items(status, collect_by, quantity_available);
create index inventory_items_category_idx
  on public.inventory_items(category);
create index reservations_user_id_idx
  on public.reservations(user_id);
create index reservations_inventory_item_id_idx
  on public.reservations(inventory_item_id);
create index reservations_status_idx
  on public.reservations(status);

-- Keep audit timestamps consistent regardless of which client performs an update.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger locations_set_updated_at
before update on public.locations
for each row execute function public.set_updated_at();

create trigger inventory_items_set_updated_at
before update on public.inventory_items
for each row execute function public.set_updated_at();

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger reservations_set_updated_at
before update on public.reservations
for each row execute function public.set_updated_at();

-- Centralize the role check used by row-level security and database functions.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where user_id = (select auth.uid())
      and role = 'admin'
  );
$$;

alter table public.locations enable row level security;
alter table public.inventory_items enable row level security;
alter table public.profiles enable row level security;
alter table public.reservations enable row level security;

-- Public users see active locations; administrators may also inspect inactive ones.
create policy locations_public_read
on public.locations
for select
to anon, authenticated
using (active or (select public.is_admin()));

create policy locations_admin_insert
on public.locations
for insert
to authenticated
with check ((select public.is_admin()));

create policy locations_admin_update
on public.locations
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy locations_admin_delete
on public.locations
for delete
to authenticated
using ((select public.is_admin()));

-- Expired, empty and unavailable stock never appears in the public catalogue.
create policy inventory_public_read
on public.inventory_items
for select
to anon, authenticated
using (
  (select public.is_admin())
  or (
    status = 'available'
    and quantity_available > 0
    and collect_by >= now()
    and exists (
      select 1
      from public.locations
      where locations.id = inventory_items.location_id
        and locations.active
    )
  )
);

create policy inventory_admin_insert
on public.inventory_items
for insert
to authenticated
with check ((select public.is_admin()));

create policy inventory_admin_update
on public.inventory_items
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy inventory_admin_delete
on public.inventory_items
for delete
to authenticated
using ((select public.is_admin()));

create policy profiles_own_or_admin_read
on public.profiles
for select
to authenticated
using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy reservations_owner_or_admin_read
on public.reservations
for select
to authenticated
using (user_id = (select auth.uid()) or (select public.is_admin()));

-- Table grants define possible operations; row-level policies decide permitted rows.
grant usage on schema public to anon, authenticated;
grant select on public.locations, public.inventory_items to anon, authenticated;
grant select on public.profiles, public.reservations to authenticated;
grant insert, update, delete on public.locations, public.inventory_items to authenticated;

revoke all on function public.set_updated_at() from public;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;
