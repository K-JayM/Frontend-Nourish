insert into public.locations (
  id,
  name,
  address_line,
  postcode,
  latitude,
  longitude,
  opening_info,
  urgent
)
values
  (
    '10000000-0000-4000-8000-000000000001',
    'Ladywood Foodbank',
    '13 Guild Close',
    'B16 8RP',
    52.480100,
    -1.919800,
    'Mon-Thu 10:00 AM - 2:00 PM',
    true
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'BCG Food Pantry',
    'Freeth Street, Magreal Estate',
    'B16 0QZ',
    52.485100,
    -1.926200,
    'Tue-Wed 11:00 AM - 1:00 PM',
    false
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    'Incredible Surplus (Ladywood Hub)',
    'St John''s & St Peter''s Church, Darnley Road',
    'B16 8TF',
    52.478900,
    -1.924800,
    'Fri 12:00 PM - 2:00 PM',
    false
  ),
  (
    '10000000-0000-4000-8000-000000000004',
    'Birmingham Central Foodbank',
    'Parade, Ladywood Ward Border',
    'B1 3QQ',
    52.482800,
    -1.910300,
    'Tue 9:30 AM and Fri 10:00 AM',
    false
  )
on conflict (id) do update
set
  name = excluded.name,
  address_line = excluded.address_line,
  postcode = excluded.postcode,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  opening_info = excluded.opening_info,
  urgent = excluded.urgent;

insert into public.inventory_items (
  id,
  location_id,
  name,
  description,
  category,
  quantity_available,
  collect_by
)
values
  (
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'Tinned tomatoes',
    'Ambient parcel supplies',
    'Cold Food',
    24,
    now() + interval '30 days'
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    'Fresh fruit and vegetables',
    'Weekly surplus shop selection',
    'Cold Food',
    18,
    now() + interval '7 days'
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000003',
    'Rescued supermarket surplus',
    'Mixed same-day surplus food',
    'Cold Food',
    12,
    now() + interval '2 days'
  ),
  (
    '20000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000004',
    'Emergency food parcel',
    'Three-day balanced crisis supply',
    'Cold Food',
    10,
    now() + interval '14 days'
  )
on conflict (id) do update
set
  location_id = excluded.location_id,
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  quantity_available = excluded.quantity_available,
  collect_by = excluded.collect_by,
  status = excluded.status;
