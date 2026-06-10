-- Keep hosted data aligned with the permanent sample labels in seed.sql.
update public.inventory_items as inventory
set
  name = labels.name,
  description = labels.description
from (
  values
    (
      '20000000-0000-4000-8000-000000000101'::uuid,
      'Vegetable soup portions',
      'Fresh soup ready for collection'
    ),
    (
      '20000000-0000-4000-8000-000000000102'::uuid,
      'Breakfast cereal boxes',
      'Assorted family-size cereal boxes'
    ),
    (
      '20000000-0000-4000-8000-000000000103'::uuid,
      'Bottled water packs',
      'Multipacks of bottled water'
    ),
    (
      '20000000-0000-4000-8000-000000000104'::uuid,
      'Pasta meal portions',
      'Prepared pasta meals for reheating'
    ),
    (
      '20000000-0000-4000-8000-000000000105'::uuid,
      'Bakery selection',
      'Mixed bread rolls and pastries'
    ),
    (
      '20000000-0000-4000-8000-000000000106'::uuid,
      'Fruit juice cartons',
      'Assorted long-life fruit juices'
    ),
    (
      '20000000-0000-4000-8000-000000000107'::uuid,
      'Vegetable curry portions',
      'Prepared vegetable curry meals'
    ),
    (
      '20000000-0000-4000-8000-000000000108'::uuid,
      'Dairy and chilled selection',
      'Mixed yoghurt, cheese and chilled items'
    ),
    (
      '20000000-0000-4000-8000-000000000109'::uuid,
      'Hygiene packs',
      'Soap, toothpaste and essential toiletries'
    ),
    (
      '20000000-0000-4000-8000-000000000110'::uuid,
      'Jacket potato portions',
      'Prepared jacket potatoes with fillings'
    ),
    (
      '20000000-0000-4000-8000-000000000111'::uuid,
      'Rice and tinned beans bundle',
      'Ambient staples for family meals'
    ),
    (
      '20000000-0000-4000-8000-000000000112'::uuid,
      'Tea and coffee packs',
      'Assorted hot drink supplies'
    )
) as labels(id, name, description)
where inventory.id = labels.id;
