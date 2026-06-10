-- Ensure the referenced collection locations exist on a fresh database.
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
    'Smethwick Foodbank',
    'Smethwick High Street',
    'B66 3NJ',
    52.492700,
    -1.966700,
    'Tue and Fri 11:00 AM - 3:00 PM',
    false
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    'Walsall Community Hub',
    'Walsall Town Centre',
    'WS1 1PT',
    52.586200,
    -1.982900,
    'Mon-Fri 9:30 AM - 4:00 PM',
    false
  ),
  (
    '10000000-0000-4000-8000-000000000004',
    'Coventry Central Foodbank',
    'Coventry City Centre',
    'CV1 1AH',
    52.408100,
    -1.510600,
    'Wed-Sat 10:00 AM - 2:00 PM',
    true
  )
on conflict (id) do update set
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
  collect_by,
  status
)
values
  (
    '20000000-0000-4000-8000-000000000101',
    '10000000-0000-4000-8000-000000000001',
    'Vegetable soup portions',
    'Fresh soup ready for collection',
    'Hot Food',
    16,
    now() + interval '3 days',
    'available'
  ),
  (
    '20000000-0000-4000-8000-000000000102',
    '10000000-0000-4000-8000-000000000001',
    'Breakfast cereal boxes',
    'Assorted family-size cereal boxes',
    'Cold Food',
    20,
    now() + interval '21 days',
    'available'
  ),
  (
    '20000000-0000-4000-8000-000000000103',
    '10000000-0000-4000-8000-000000000001',
    'Bottled water packs',
    'Multipacks of bottled water',
    'Drinks',
    14,
    now() + interval '30 days',
    'available'
  ),
  (
    '20000000-0000-4000-8000-000000000104',
    '10000000-0000-4000-8000-000000000002',
    'Pasta meal portions',
    'Prepared pasta meals for reheating',
    'Hot Food',
    10,
    now() + interval '2 days',
    'available'
  ),
  (
    '20000000-0000-4000-8000-000000000105',
    '10000000-0000-4000-8000-000000000002',
    'Bakery selection',
    'Mixed bread rolls and pastries',
    'Cold Food',
    18,
    now() + interval '5 days',
    'available'
  ),
  (
    '20000000-0000-4000-8000-000000000106',
    '10000000-0000-4000-8000-000000000002',
    'Fruit juice cartons',
    'Assorted long-life fruit juices',
    'Drinks',
    24,
    now() + interval '14 days',
    'available'
  ),
  (
    '20000000-0000-4000-8000-000000000107',
    '10000000-0000-4000-8000-000000000003',
    'Vegetable curry portions',
    'Prepared vegetable curry meals',
    'Hot Food',
    12,
    now() + interval '1 day',
    'available'
  ),
  (
    '20000000-0000-4000-8000-000000000108',
    '10000000-0000-4000-8000-000000000003',
    'Dairy and chilled selection',
    'Mixed yoghurt, cheese and chilled items',
    'Cold Food',
    9,
    now() + interval '4 days',
    'available'
  ),
  (
    '20000000-0000-4000-8000-000000000109',
    '10000000-0000-4000-8000-000000000003',
    'Hygiene packs',
    'Soap, toothpaste and essential toiletries',
    'Other',
    15,
    now() + interval '45 days',
    'available'
  ),
  (
    '20000000-0000-4000-8000-000000000110',
    '10000000-0000-4000-8000-000000000004',
    'Jacket potato portions',
    'Prepared jacket potatoes with fillings',
    'Hot Food',
    8,
    now() + interval '2 days',
    'available'
  ),
  (
    '20000000-0000-4000-8000-000000000111',
    '10000000-0000-4000-8000-000000000004',
    'Rice and tinned beans bundle',
    'Ambient staples for family meals',
    'Cold Food',
    22,
    now() + interval '28 days',
    'available'
  ),
  (
    '20000000-0000-4000-8000-000000000112',
    '10000000-0000-4000-8000-000000000004',
    'Tea and coffee packs',
    'Assorted hot drink supplies',
    'Drinks',
    17,
    now() + interval '35 days',
    'available'
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
