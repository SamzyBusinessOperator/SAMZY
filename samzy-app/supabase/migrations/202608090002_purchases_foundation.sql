begin;

-- =========================================================
-- SUPPLIERS
-- =========================================================

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete cascade,

  name text not null,

  contact_name text,
  email text,
  phone text,

  vat_number text,
  address text,
  city text,
  postal_code text,
  country_code text default 'PT',

  notes text,

  status text not null default 'active'
    check (
      status in (
        'active',
        'inactive'
      )
    ),

  created_by uuid not null
    references auth.users(id),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists suppliers_organization_id_idx
on public.suppliers(organization_id);

create index if not exists suppliers_name_idx
on public.suppliers(name);


-- =========================================================
-- PURCHASES
-- =========================================================

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete cascade,

  supplier_id uuid
    references public.suppliers(id)
    on delete set null,

  purchase_number text not null,

  supplier_reference text,

  status text not null default 'draft'
    check (
      status in (
        'draft',
        'ordered',
        'partially_received',
        'received',
        'cancelled'
      )
    ),

  purchase_date date not null default current_date,

  expected_date date,

  currency text not null default 'EUR',

  subtotal numeric not null default 0,
  vat_total numeric not null default 0,
  total numeric not null default 0,

  notes text,

  created_by uuid not null
    references auth.users(id),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (
    organization_id,
    purchase_number
  )
);

create index if not exists purchases_organization_id_idx
on public.purchases(organization_id);

create index if not exists purchases_supplier_id_idx
on public.purchases(supplier_id);

create index if not exists purchases_status_idx
on public.purchases(status);

create index if not exists purchases_purchase_date_idx
on public.purchases(purchase_date desc);


-- =========================================================
-- PURCHASE ITEMS
-- =========================================================

create table if not exists public.purchase_items (
  id uuid primary key default gen_random_uuid(),

  organization_id uuid not null
    references public.organizations(id)
    on delete cascade,

  purchase_id uuid not null
    references public.purchases(id)
    on delete cascade,

  product_id uuid not null
    references public.products(id)
    on delete restrict,

  ordered_quantity numeric not null
    check (ordered_quantity > 0),

  received_quantity numeric not null default 0
    check (received_quantity >= 0),

  unit_cost numeric not null default 0
    check (unit_cost >= 0),

  vat_rate numeric not null default 0
    check (vat_rate >= 0),

  line_subtotal numeric not null default 0,
  line_vat numeric not null default 0,
  line_total numeric not null default 0,

  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (
    purchase_id,
    product_id
  )
);

create index if not exists purchase_items_organization_id_idx
on public.purchase_items(organization_id);

create index if not exists purchase_items_purchase_id_idx
on public.purchase_items(purchase_id);

create index if not exists purchase_items_product_id_idx
on public.purchase_items(product_id);


-- =========================================================
-- PURCHASE NUMBER GENERATION
-- =========================================================

create sequence if not exists public.purchase_number_seq;

create or replace function public.generate_purchase_number()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_number bigint;
begin
  next_number := nextval('public.purchase_number_seq');

  return
    'PUR-'
    || lpad(
      next_number::text,
      6,
      '0'
    );
end;
$$;


-- =========================================================
-- PURCHASE ITEM TOTALS
-- =========================================================

create or replace function public.calculate_purchase_item_totals()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.line_subtotal :=
    new.ordered_quantity * new.unit_cost;

  new.line_vat :=
    new.line_subtotal
    * (new.vat_rate / 100);

  new.line_total :=
    new.line_subtotal
    + new.line_vat;

  new.updated_at := now();

  return new;
end;
$$;

drop trigger if exists purchase_items_calculate_totals
on public.purchase_items;

create trigger purchase_items_calculate_totals
before insert or update
on public.purchase_items
for each row
execute function public.calculate_purchase_item_totals();


-- =========================================================
-- PURCHASE TOTALS REFRESH
-- =========================================================

create or replace function public.refresh_purchase_totals()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_purchase_id uuid;
begin
  affected_purchase_id :=
    coalesce(
      new.purchase_id,
      old.purchase_id
    );

  update public.purchases
  set
    subtotal = coalesce(
      (
        select sum(line_subtotal)
        from public.purchase_items
        where purchase_id = affected_purchase_id
      ),
      0
    ),

    vat_total = coalesce(
      (
        select sum(line_vat)
        from public.purchase_items
        where purchase_id = affected_purchase_id
      ),
      0
    ),

    total = coalesce(
      (
        select sum(line_total)
        from public.purchase_items
        where purchase_id = affected_purchase_id
      ),
      0
    ),

    updated_at = now()

  where id = affected_purchase_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists purchase_items_refresh_purchase_totals
on public.purchase_items;

create trigger purchase_items_refresh_purchase_totals
after insert or update or delete
on public.purchase_items
for each row
execute function public.refresh_purchase_totals();


-- =========================================================
-- PURCHASE RECEIVING FUNCTION
-- Receives ONE purchase item quantity at a time.
-- Creates inventory movement automatically.
-- =========================================================

create or replace function public.receive_purchase_item(
  requested_purchase_item_id uuid,
  requested_quantity numeric
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;

  item_record record;
  purchase_record record;

  remaining_quantity numeric;
  new_received_quantity numeric;

  new_purchase_status text;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if requested_quantity is null
     or requested_quantity <= 0 then
    raise exception
      'Received quantity must be greater than zero';
  end if;

  select
    pi.id,
    pi.organization_id,
    pi.purchase_id,
    pi.product_id,
    pi.ordered_quantity,
    pi.received_quantity
  into item_record
  from public.purchase_items pi
  where pi.id = requested_purchase_item_id
  for update;

  if not found then
    raise exception
      'Purchase item not found';
  end if;

  if not public.is_organization_member(
    item_record.organization_id
  ) then
    raise exception
      'You do not have access to this purchase';
  end if;

  select
    p.id,
    p.organization_id,
    p.purchase_number,
    p.status
  into purchase_record
  from public.purchases p
  where p.id = item_record.purchase_id
  for update;

  if purchase_record.status = 'cancelled' then
    raise exception
      'Cancelled purchases cannot be received';
  end if;

  if purchase_record.status = 'draft' then
    raise exception
      'Draft purchases must be ordered before receiving';
  end if;

  remaining_quantity :=
    item_record.ordered_quantity
    - item_record.received_quantity;

  if requested_quantity > remaining_quantity then
    raise exception
      'Received quantity exceeds remaining ordered quantity';
  end if;

  new_received_quantity :=
    item_record.received_quantity
    + requested_quantity;

  update public.purchase_items
  set
    received_quantity =
      new_received_quantity,
    updated_at = now()
  where id = item_record.id;

  -- Inventory engine handles product.current_stock automatically.
  insert into public.inventory_movements (
    organization_id,
    product_id,
    movement_type,
    quantity,
    source,
    reference_type,
    reference_id,
    reason,
    created_by
  )
  values (
    item_record.organization_id,
    item_record.product_id,
    'stock_in',
    requested_quantity,
    'purchase',
    'purchase',
    item_record.purchase_id,
    'Purchase receipt '
      || purchase_record.purchase_number,
    current_user_id
  );

  -- Determine purchase receiving status.
  if exists (
    select 1
    from public.purchase_items
    where purchase_id =
      item_record.purchase_id
      and received_quantity <
          ordered_quantity
  ) then

    if exists (
      select 1
      from public.purchase_items
      where purchase_id =
        item_record.purchase_id
        and received_quantity > 0
    ) then
      new_purchase_status :=
        'partially_received';
    else
      new_purchase_status :=
        'ordered';
    end if;

  else
    new_purchase_status := 'received';
  end if;

  update public.purchases
  set
    status = new_purchase_status,
    updated_at = now()
  where id = item_record.purchase_id;
end;
$$;


-- =========================================================
-- UPDATED_AT HELPERS
-- =========================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists suppliers_set_updated_at
on public.suppliers;

create trigger suppliers_set_updated_at
before update
on public.suppliers
for each row
execute function public.set_updated_at();

drop trigger if exists purchases_set_updated_at
on public.purchases;

create trigger purchases_set_updated_at
before update
on public.purchases
for each row
execute function public.set_updated_at();


-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================

alter table public.suppliers
enable row level security;

alter table public.purchases
enable row level security;

alter table public.purchase_items
enable row level security;


-- SUPPLIERS

drop policy if exists suppliers_select_members
on public.suppliers;

create policy suppliers_select_members
on public.suppliers
for select
to authenticated
using (
  public.is_organization_member(
    organization_id
  )
);

drop policy if exists suppliers_insert_members
on public.suppliers;

create policy suppliers_insert_members
on public.suppliers
for insert
to authenticated
with check (
  public.is_organization_member(
    organization_id
  )
  and created_by = auth.uid()
);

drop policy if exists suppliers_update_members
on public.suppliers;

create policy suppliers_update_members
on public.suppliers
for update
to authenticated
using (
  public.is_organization_member(
    organization_id
  )
)
with check (
  public.is_organization_member(
    organization_id
  )
);

drop policy if exists suppliers_delete_members
on public.suppliers;

create policy suppliers_delete_members
on public.suppliers
for delete
to authenticated
using (
  public.is_organization_member(
    organization_id
  )
);


-- PURCHASES

drop policy if exists purchases_select_members
on public.purchases;

create policy purchases_select_members
on public.purchases
for select
to authenticated
using (
  public.is_organization_member(
    organization_id
  )
);

drop policy if exists purchases_insert_members
on public.purchases;

create policy purchases_insert_members
on public.purchases
for insert
to authenticated
with check (
  public.is_organization_member(
    organization_id
  )
  and created_by = auth.uid()
);

drop policy if exists purchases_update_members
on public.purchases;

create policy purchases_update_members
on public.purchases
for update
to authenticated
using (
  public.is_organization_member(
    organization_id
  )
)
with check (
  public.is_organization_member(
    organization_id
  )
);

drop policy if exists purchases_delete_members
on public.purchases;

create policy purchases_delete_members
on public.purchases
for delete
to authenticated
using (
  public.is_organization_member(
    organization_id
  )
);


-- PURCHASE ITEMS

drop policy if exists purchase_items_select_members
on public.purchase_items;

create policy purchase_items_select_members
on public.purchase_items
for select
to authenticated
using (
  public.is_organization_member(
    organization_id
  )
);

drop policy if exists purchase_items_insert_members
on public.purchase_items;

create policy purchase_items_insert_members
on public.purchase_items
for insert
to authenticated
with check (
  public.is_organization_member(
    organization_id
  )
);

drop policy if exists purchase_items_update_members
on public.purchase_items;

create policy purchase_items_update_members
on public.purchase_items
for update
to authenticated
using (
  public.is_organization_member(
    organization_id
  )
)
with check (
  public.is_organization_member(
    organization_id
  )
);

drop policy if exists purchase_items_delete_members
on public.purchase_items;

create policy purchase_items_delete_members
on public.purchase_items
for delete
to authenticated
using (
  public.is_organization_member(
    organization_id
  )
);


-- =========================================================
-- TABLE GRANTS
-- =========================================================

grant select, insert, update, delete
on table public.suppliers
to authenticated;

grant select, insert, update, delete
on table public.purchases
to authenticated;

grant select, insert, update, delete
on table public.purchase_items
to authenticated;


-- =========================================================
-- FUNCTION GRANTS
-- =========================================================

grant execute
on function public.generate_purchase_number()
to authenticated;

grant execute
on function public.receive_purchase_item(
  uuid,
  numeric
)
to authenticated;


commit;