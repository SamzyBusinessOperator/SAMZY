begin;

-- =====================================================
-- CATEGORIES
-- =====================================================

create table if not exists public.categories (
    id uuid primary key default gen_random_uuid(),

    organization_id uuid not null
        references public.organizations(id)
        on delete cascade,

    name text not null
        check (char_length(trim(name)) between 2 and 120),

    color text not null default '#FF6A00',

    icon text,

    created_by uuid not null
        references auth.users(id),

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    unique (organization_id, name)
);

-- =====================================================
-- PRODUCTS
-- =====================================================

create table if not exists public.products (

    id uuid primary key default gen_random_uuid(),

    organization_id uuid not null
        references public.organizations(id)
        on delete cascade,

    category_id uuid
        references public.categories(id)
        on delete set null,

    name text not null
        check (char_length(trim(name)) between 2 and 180),

    sku text,

    barcode text,

    brand text,

    description text,

    image_url text,

    cost_price numeric(12,2)
        not null
        default 0
        check (cost_price >= 0),

    selling_price numeric(12,2)
        not null
        default 0
        check (selling_price >= 0),

    vat_rate numeric(5,2)
        not null
        default 23
        check (vat_rate >= 0 and vat_rate <= 100),

    current_stock numeric(12,2)
        not null
        default 0,

    reserved_stock numeric(12,2)
        not null
        default 0,

    reorder_level numeric(12,2)
        not null
        default 0,

    unit text
        not null
        default 'pcs',

    status text
        not null
        default 'active'
        check (
            status in (
                'active',
                'inactive',
                'archived'
            )
        ),

    created_by uuid not null
        references auth.users(id),

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    unique (organization_id, sku),

    unique (organization_id, barcode)
);
-- =====================================================
-- INDEXES
-- =====================================================

create index if not exists categories_organization_id_idx
    on public.categories(organization_id);

create index if not exists categories_name_idx
    on public.categories(organization_id, name);

create index if not exists products_organization_id_idx
    on public.products(organization_id);

create index if not exists products_category_id_idx
    on public.products(category_id);

create index if not exists products_status_idx
    on public.products(organization_id, status);

create index if not exists products_name_idx
    on public.products(organization_id, name);

create index if not exists products_sku_idx
    on public.products(organization_id, sku);

create index if not exists products_barcode_idx
    on public.products(organization_id, barcode);

-- =====================================================
-- UPDATED_AT TRIGGER FUNCTION
-- =====================================================

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

-- =====================================================
-- UPDATED_AT TRIGGERS
-- =====================================================

drop trigger if exists categories_set_updated_at
on public.categories;

create trigger categories_set_updated_at
before update on public.categories
for each row
execute function public.set_updated_at();

drop trigger if exists products_set_updated_at
on public.products;

create trigger products_set_updated_at
before update on public.products
for each row
execute function public.set_updated_at();
-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

alter table public.categories enable row level security;
alter table public.products enable row level security;

-- =====================================================
-- CATEGORY POLICIES
-- =====================================================

drop policy if exists categories_select_members
on public.categories;

create policy categories_select_members
on public.categories
for select
to authenticated
using (
    public.is_organization_member(organization_id)
);

drop policy if exists categories_insert_members
on public.categories;

create policy categories_insert_members
on public.categories
for insert
to authenticated
with check (
    public.is_organization_member(organization_id)
    and created_by = auth.uid()
);

drop policy if exists categories_update_members
on public.categories;

create policy categories_update_members
on public.categories
for update
to authenticated
using (
    public.is_organization_member(organization_id)
)
with check (
    public.is_organization_member(organization_id)
);

drop policy if exists categories_delete_members
on public.categories;

create policy categories_delete_members
on public.categories
for delete
to authenticated
using (
    public.is_organization_member(organization_id)
);

-- =====================================================
-- PRODUCT POLICIES
-- =====================================================

drop policy if exists products_select_members
on public.products;

create policy products_select_members
on public.products
for select
to authenticated
using (
    public.is_organization_member(organization_id)
);

drop policy if exists products_insert_members
on public.products;

create policy products_insert_members
on public.products
for insert
to authenticated
with check (
    public.is_organization_member(organization_id)
    and created_by = auth.uid()
);

drop policy if exists products_update_members
on public.products;

create policy products_update_members
on public.products
for update
to authenticated
using (
    public.is_organization_member(organization_id)
)
with check (
    public.is_organization_member(organization_id)
);

drop policy if exists products_delete_members
on public.products;

create policy products_delete_members
on public.products
for delete
to authenticated
using (
    public.is_organization_member(organization_id)
);
-- =====================================================
-- PRIVILEGES
-- =====================================================

grant select, insert, update, delete
on public.categories
to authenticated;

grant select, insert, update, delete
on public.products
to authenticated;

-- =====================================================
-- COMPLETE MIGRATION
-- =====================================================

commit;