begin;

-- =========================================================
-- INVENTORY MOVEMENTS
-- =========================================================

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete cascade,

  product_id uuid not null
    references public.products(id)
    on delete cascade,

  movement_type text not null
    check (
      movement_type in (
        'stock_in',
        'stock_out',
        'adjustment_in',
        'adjustment_out'
      )
    ),

  quantity numeric not null
    check (quantity > 0),

  before_stock numeric not null default 0,
  after_stock numeric not null default 0,

  source text not null default 'manual'
    check (
      source in (
        'manual',
        'purchase',
        'sale',
        'scanner',
        'system'
      )
    ),

  reference_type text,
  reference_id uuid,

  reason text,
  notes text,

  created_by uuid not null
    references auth.users(id),

  created_at timestamptz not null default now()
);

-- =========================================================
-- INDEXES
-- =========================================================

create index if not exists inventory_movements_organization_id_idx
on public.inventory_movements(organization_id);

create index if not exists inventory_movements_product_id_idx
on public.inventory_movements(product_id);

create index if not exists inventory_movements_created_at_idx
on public.inventory_movements(created_at desc);

create index if not exists inventory_movements_product_created_at_idx
on public.inventory_movements(product_id, created_at desc);

-- =========================================================
-- APPLY INVENTORY MOVEMENT
-- Every movement automatically updates products.current_stock
-- =========================================================

create or replace function public.apply_inventory_movement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_product_stock numeric;
  stock_delta numeric;
  resulting_stock numeric;
begin

  -- Lock product row to prevent concurrent stock updates
  -- from overwriting each other.
  select current_stock
  into current_product_stock
  from public.products
  where id = new.product_id
    and organization_id = new.organization_id
  for update;

  if not found then
    raise exception
      'Product does not exist in this organization';
  end if;

  -- Determine whether movement increases or decreases stock.
  case new.movement_type

    when 'stock_in' then
      stock_delta := new.quantity;

    when 'adjustment_in' then
      stock_delta := new.quantity;

    when 'stock_out' then
      stock_delta := -new.quantity;

    when 'adjustment_out' then
      stock_delta := -new.quantity;

    else
      raise exception 'Invalid inventory movement type';

  end case;

  resulting_stock :=
    current_product_stock + stock_delta;

  -- Store stock state in movement history.
  new.before_stock := current_product_stock;
  new.after_stock := resulting_stock;

  -- Update product stock atomically.
  update public.products
  set
    current_stock = resulting_stock,
    updated_at = now()
  where id = new.product_id
    and organization_id = new.organization_id;

  return new;

end;
$$;

drop trigger if exists inventory_movement_apply_stock
on public.inventory_movements;

create trigger inventory_movement_apply_stock
before insert
on public.inventory_movements
for each row
execute function public.apply_inventory_movement();

-- =========================================================
-- APPEND-ONLY INVENTORY HISTORY
-- Corrections must be made using another movement.
-- =========================================================

create or replace function public.prevent_inventory_movement_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception
    'Inventory movements cannot be modified or deleted. Create a correcting movement instead.';
end;
$$;

drop trigger if exists inventory_movements_prevent_update
on public.inventory_movements;

create trigger inventory_movements_prevent_update
before update
on public.inventory_movements
for each row
execute function public.prevent_inventory_movement_changes();

drop trigger if exists inventory_movements_prevent_delete
on public.inventory_movements;

create trigger inventory_movements_prevent_delete
before delete
on public.inventory_movements
for each row
execute function public.prevent_inventory_movement_changes();

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================

alter table public.inventory_movements
enable row level security;

drop policy if exists inventory_movements_select_members
on public.inventory_movements;

create policy inventory_movements_select_members
on public.inventory_movements
for select
to authenticated
using (
  public.is_organization_member(organization_id)
);

drop policy if exists inventory_movements_insert_members
on public.inventory_movements;

create policy inventory_movements_insert_members
on public.inventory_movements
for insert
to authenticated
with check (
  public.is_organization_member(organization_id)
  and created_by = auth.uid()
);

-- =========================================================
-- PERMISSIONS
-- Authenticated users may read and create movements.
-- Inventory history cannot be directly modified or deleted.
-- =========================================================

grant select, insert
on table public.inventory_movements
to authenticated;

revoke update, delete
on table public.inventory_movements
from authenticated;

commit;