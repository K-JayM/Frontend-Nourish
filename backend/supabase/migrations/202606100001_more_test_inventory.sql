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
    'Test vegetable soup portions',
    'Demonstration hot-food inventory',
    'Hot Food',
    16,
    now() + interval '3 days',
    'available'
  ),
  (
    '20000000-0000-4000-8000-000000000102',
    '10000000-0000-4000-8000-000000000001',
    'Test breakfast cereal boxes',
    'Demonstration ambient-food inventory',
    'Cold Food',
    20,
    now() + interval '21 days',
    'available'
  ),
  (
    '20000000-0000-4000-8000-000000000103',
    '10000000-0000-4000-8000-000000000001',
    'Test bottled water packs',
    'Demonstration drinks inventory',
    'Drinks',
    14,
    now() + interval '30 days',
    'available'
  ),
  (
    '20000000-0000-4000-8000-000000000104',
    '10000000-0000-4000-8000-000000000002',
    'Test pasta meal portions',
    'Demonstration hot-food inventory',
    'Hot Food',
    10,
    now() + interval '2 days',
    'available'
  ),
  (
    '20000000-0000-4000-8000-000000000105',
    '10000000-0000-4000-8000-000000000002',
    'Test bakery selection',
    'Demonstration bread and pastry inventory',
    'Cold Food',
    18,
    now() + interval '5 days',
    'available'
  ),
  (
    '20000000-0000-4000-8000-000000000106',
    '10000000-0000-4000-8000-000000000002',
    'Test fruit juice cartons',
    'Demonstration drinks inventory',
    'Drinks',
    24,
    now() + interval '14 days',
    'available'
  ),
  (
    '20000000-0000-4000-8000-000000000107',
    '10000000-0000-4000-8000-000000000003',
    'Test vegetable curry portions',
    'Demonstration same-day hot-food inventory',
    'Hot Food',
    12,
    now() + interval '1 day',
    'available'
  ),
  (
    '20000000-0000-4000-8000-000000000108',
    '10000000-0000-4000-8000-000000000003',
    'Test dairy and chilled selection',
    'Demonstration refrigerated inventory',
    'Cold Food',
    9,
    now() + interval '4 days',
    'available'
  ),
  (
    '20000000-0000-4000-8000-000000000109',
    '10000000-0000-4000-8000-000000000003',
    'Test hygiene packs',
    'Demonstration non-food essentials',
    'Other',
    15,
    now() + interval '45 days',
    'available'
  ),
  (
    '20000000-0000-4000-8000-000000000110',
    '10000000-0000-4000-8000-000000000004',
    'Test jacket potato portions',
    'Demonstration hot-food inventory',
    'Hot Food',
    8,
    now() + interval '2 days',
    'available'
  ),
  (
    '20000000-0000-4000-8000-000000000111',
    '10000000-0000-4000-8000-000000000004',
    'Test rice and tinned beans bundle',
    'Demonstration ambient-food bundle',
    'Cold Food',
    22,
    now() + interval '28 days',
    'available'
  ),
  (
    '20000000-0000-4000-8000-000000000112',
    '10000000-0000-4000-8000-000000000004',
    'Test tea and coffee packs',
    'Demonstration drinks supplies',
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

