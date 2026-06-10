create or replace function public.reserve_inventory(
  p_inventory_item_id uuid,
  p_quantity integer
)
returns table (
  reservation_id uuid,
  collection_code text,
  remaining_quantity integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_item public.inventory_items%rowtype;
  v_reservation_id uuid;
  v_collection_code text;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if p_quantity is null or p_quantity <= 0 or p_quantity > 1000 then
    raise exception 'invalid_quantity';
  end if;

  -- Lock stock before validation so concurrent reservations cannot oversell it.
  select inventory_items.*
  into v_item
  from public.inventory_items
  join public.locations
    on locations.id = inventory_items.location_id
  where inventory_items.id = p_inventory_item_id
    and locations.active
  for update of inventory_items;

  if not found then
    raise exception 'inventory_not_found';
  end if;

  if v_item.status <> 'available'
    or v_item.quantity_available <= 0
    or v_item.collect_by < now()
  then
    raise exception 'inventory_unavailable';
  end if;

  if v_item.quantity_available < p_quantity then
    raise exception 'insufficient_inventory';
  end if;

  -- Collection codes are random, non-sequential and safe to give to the recipient.
  v_collection_code :=
    'NR-' || upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 16));

  insert into public.reservations (
    inventory_item_id,
    user_id,
    quantity,
    collection_code
  )
  values (
    p_inventory_item_id,
    v_user_id,
    p_quantity,
    v_collection_code
  )
  returning id into v_reservation_id;

  update public.inventory_items
  set
    quantity_available = quantity_available - p_quantity,
    status = case
      when quantity_available - p_quantity = 0 then 'unavailable'
      else status
    end
  where id = p_inventory_item_id;

  return query
  select
    v_reservation_id,
    v_collection_code,
    v_item.quantity_available - p_quantity;
end;
$$;

create or replace function public.mark_reservation_collected(
  p_reservation_id uuid
)
returns table (
  reservation_id uuid,
  reservation_status text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reservation public.reservations%rowtype;
begin
  if not public.is_admin() then
    raise exception 'admin_required';
  end if;

  -- Lock the reservation so it cannot be collected and cancelled concurrently.
  select *
  into v_reservation
  from public.reservations
  where id = p_reservation_id
  for update;

  if not found then
    raise exception 'reservation_not_found';
  end if;

  if v_reservation.status <> 'held' then
    raise exception 'reservation_not_held';
  end if;

  update public.reservations
  set status = 'collected', resolved_at = now()
  where id = p_reservation_id;

  return query select p_reservation_id, 'collected'::text;
end;
$$;

create or replace function public.cancel_reservation(
  p_reservation_id uuid
)
returns table (
  reservation_id uuid,
  reservation_status text,
  restored_quantity integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reservation public.reservations%rowtype;
begin
  if not public.is_admin() then
    raise exception 'admin_required';
  end if;

  -- Cancellation and stock restoration happen in the same transaction.
  select *
  into v_reservation
  from public.reservations
  where id = p_reservation_id
  for update;

  if not found then
    raise exception 'reservation_not_found';
  end if;

  if v_reservation.status <> 'held' then
    raise exception 'reservation_not_held';
  end if;

  update public.reservations
  set status = 'cancelled', resolved_at = now()
  where id = p_reservation_id;

  update public.inventory_items
  set
    quantity_available = quantity_available + v_reservation.quantity,
    status = 'available'
  where id = v_reservation.inventory_item_id;

  return query
  select p_reservation_id, 'cancelled'::text, v_reservation.quantity;
end;
$$;

revoke all on function public.reserve_inventory(uuid, integer) from public;
revoke all on function public.mark_reservation_collected(uuid) from public;
revoke all on function public.cancel_reservation(uuid) from public;

grant execute on function public.reserve_inventory(uuid, integer) to authenticated;
grant execute on function public.mark_reservation_collected(uuid) to authenticated;
grant execute on function public.cancel_reservation(uuid) to authenticated;
