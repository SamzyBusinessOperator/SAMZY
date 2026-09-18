-- ============================================================
-- SAMZY — Dynamic Smart Sheet Columns V1
-- ============================================================
-- Purpose:
-- Introduce persistent, user-defined spreadsheet columns without
-- removing or changing the existing fixed Smart Sheet business
-- schema.
--
-- This is an additive migration.
-- Existing Smart Sheet behaviour remains untouched.
-- ============================================================

create table if not exists public.smart_sheet_columns (
    id uuid primary key default gen_random_uuid(),

    organization_id uuid not null,
    smart_sheet_id uuid not null,

    -- Compatibility key used by the current Smart Sheet engine.
    -- The permanent column identity is this row's UUID `id`.
    -- Future generic cells will reference the column UUID directly.
    column_key text not null,

    -- Customer-facing column name.
    label text not null,

    -- Excel-style horizontal position.
    position integer not null,

    -- Presentation defaults.
    width integer not null default 100,
    hidden boolean not null default false,

    -- Generic spreadsheet data type.
    data_type text not null default 'general',

    -- Optional display metadata.
    number_format text null,
    decimal_places integer null,

    -- Optional SAMZY business understanding.
    -- A custom column does NOT require a semantic role.
    semantic_role text null,

    -- Future calculation / integration metadata.
    formula_definition jsonb null,
    business_mapping jsonb null,
    metadata jsonb not null default '{}'::jsonb,

    -- Distinguishes today's built-in compatibility columns
    -- from freely created customer columns.
    is_system boolean not null default false,

    created_by uuid null default auth.uid(),
    updated_by uuid null default auth.uid(),

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint smart_sheet_columns_sheet_key_unique
        unique (smart_sheet_id, column_key),

    constraint smart_sheet_columns_position_nonnegative
        check (position >= 0),

    constraint smart_sheet_columns_width_valid
        check (width >= 40 and width <= 1000),

    constraint smart_sheet_columns_data_type_valid
        check (
            data_type in (
                'general',
                'text',
                'number',
                'currency',
                'percentage',
                'date',
                'datetime',
                'boolean'
            )
        )
);

create index if not exists smart_sheet_columns_sheet_position_idx
    on public.smart_sheet_columns (
        smart_sheet_id,
        position
    );

create index if not exists smart_sheet_columns_organization_idx
    on public.smart_sheet_columns (
        organization_id
    );

create index if not exists smart_sheet_columns_semantic_role_idx
    on public.smart_sheet_columns (
        smart_sheet_id,
        semantic_role
    )
    where semantic_role is not null;

alter table public.smart_sheet_columns
    enable row level security;

grant select, insert, update, delete
    on public.smart_sheet_columns
    to authenticated;

-- ============================================================
-- RLS
-- ============================================================

drop policy if exists
    "smart_sheet_columns_select_org"
    on public.smart_sheet_columns;

create policy
    "smart_sheet_columns_select_org"
on public.smart_sheet_columns
for select
to authenticated
using (
    exists (
        select 1
        from public.organization_members om
        where om.organization_id =
            smart_sheet_columns.organization_id
          and om.user_id = auth.uid()
    )
);

drop policy if exists
    "smart_sheet_columns_insert_org"
    on public.smart_sheet_columns;

create policy
    "smart_sheet_columns_insert_org"
on public.smart_sheet_columns
for insert
to authenticated
with check (
    exists (
        select 1
        from public.organization_members om
        where om.organization_id =
            smart_sheet_columns.organization_id
          and om.user_id = auth.uid()
    )
    and exists (
        select 1
        from public.smart_sheets ss
        where ss.id =
            smart_sheet_columns.smart_sheet_id
          and ss.organization_id =
            smart_sheet_columns.organization_id
    )
);

drop policy if exists
    "smart_sheet_columns_update_org"
    on public.smart_sheet_columns;

create policy
    "smart_sheet_columns_update_org"
on public.smart_sheet_columns
for update
to authenticated
using (
    exists (
        select 1
        from public.organization_members om
        where om.organization_id =
            smart_sheet_columns.organization_id
          and om.user_id = auth.uid()
    )
)
with check (
    exists (
        select 1
        from public.organization_members om
        where om.organization_id =
            smart_sheet_columns.organization_id
          and om.user_id = auth.uid()
    )
    and exists (
        select 1
        from public.smart_sheets ss
        where ss.id =
            smart_sheet_columns.smart_sheet_id
          and ss.organization_id =
            smart_sheet_columns.organization_id
    )
);

drop policy if exists
    "smart_sheet_columns_delete_org"
    on public.smart_sheet_columns;

create policy
    "smart_sheet_columns_delete_org"
on public.smart_sheet_columns
for delete
to authenticated
using (
    exists (
        select 1
        from public.organization_members om
        where om.organization_id =
            smart_sheet_columns.organization_id
          and om.user_id = auth.uid()
    )
);
