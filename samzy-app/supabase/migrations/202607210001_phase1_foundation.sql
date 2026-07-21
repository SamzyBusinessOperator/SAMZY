begin;

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  locale text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  slug text not null unique,
  country_code text not null default 'PT',
  currency text not null default 'EUR',
  timezone text not null default 'Europe/Lisbon',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  user_id uuid not null
    references auth.users(id) on delete cascade,
  role text not null default 'member'
    check (role in ('owner', 'admin', 'manager', 'member')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 120),
  is_default boolean not null default false,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists organization_members_user_id_idx
  on public.organization_members(user_id);

create index if not exists workspaces_organization_id_idx
  on public.workspaces(organization_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    full_name
  )
  values (
    new.id,
    nullif(
      trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')),
      ''
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

insert into public.profiles (
  id,
  full_name
)
select
  id,
  nullif(
    trim(coalesce(raw_user_meta_data ->> 'full_name', '')),
    ''
  )
from auth.users
on conflict (id) do nothing;

create or replace function public.is_organization_member(
  requested_organization_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = requested_organization_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.create_organization_with_workspace(
  organization_name text,
  workspace_name text default 'Main Workspace',
  organization_currency text default 'EUR',
  organization_timezone text default 'Europe/Lisbon',
  organization_country_code text default 'PT'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  new_organization_id uuid;
  generated_slug text;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if length(trim(organization_name)) < 2 then
    raise exception 'Organization name is required';
  end if;

  if exists (
    select 1
    from public.organization_members
    where user_id = current_user_id
  ) then
    raise exception 'This account already belongs to an organization';
  end if;

  generated_slug :=
    trim(
      both '-'
      from regexp_replace(
        lower(trim(organization_name)),
        '[^a-z0-9]+',
        '-',
        'g'
      )
    )
    || '-'
    || substring(
      replace(gen_random_uuid()::text, '-', '')
      from 1 for 8
    );

  insert into public.organizations (
    name,
    slug,
    country_code,
    currency,
    timezone,
    created_by
  )
  values (
    trim(organization_name),
    generated_slug,
    upper(trim(organization_country_code)),
    upper(trim(organization_currency)),
    trim(organization_timezone),
    current_user_id
  )
  returning id into new_organization_id;

  insert into public.organization_members (
    organization_id,
    user_id,
    role
  )
  values (
    new_organization_id,
    current_user_id,
    'owner'
  );

  insert into public.workspaces (
    organization_id,
    name,
    is_default,
    created_by
  )
  values (
    new_organization_id,
    coalesce(
      nullif(trim(workspace_name), ''),
      'Main Workspace'
    ),
    true,
    current_user_id
  );

  return new_organization_id;
end;
$$;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.workspaces enable row level security;

drop policy if exists profiles_select_own
on public.profiles;

create policy profiles_select_own
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists profiles_update_own
on public.profiles;

create policy profiles_update_own
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists organizations_select_members
on public.organizations;

create policy organizations_select_members
on public.organizations
for select
to authenticated
using (public.is_organization_member(id));

drop policy if exists organization_members_select_own
on public.organization_members;

create policy organization_members_select_own
on public.organization_members
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists workspaces_select_members
on public.workspaces;

create policy workspaces_select_members
on public.workspaces
for select
to authenticated
using (
  public.is_organization_member(organization_id)
);

grant execute on function public.create_organization_with_workspace(
  text,
  text,
  text,
  text,
  text
) to authenticated;

grant execute on function public.is_organization_member(uuid)
to authenticated;

commit;
