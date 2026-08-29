begin;

-- Core organization access
grant select
on table public.organization_members
to authenticated;

grant select
on table public.organizations
to authenticated;

grant select
on table public.workspaces
to authenticated;

-- Products module
grant select, insert, update, delete
on table public.products
to authenticated;

grant select, insert, update, delete
on table public.categories
to authenticated;

commit;