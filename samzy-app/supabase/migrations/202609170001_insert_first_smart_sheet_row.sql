begin;

-- ============================================================
-- SMART SHEETS — SECURE FIRST ROW INSERTION
-- ============================================================
--
-- Purpose:
-- The existing insert_smart_sheet_row_secure() function requires
-- an anchor row. A genuinely empty Smart Sheet has no anchor.
--
-- This function creates ONLY row 1 and ONLY when the sheet has
-- no existing rows. After row 1 exists, SAMZY continues using the
-- existing anchor-based row insertion engine.
--
-- No supplier/invoice/product/business values are created here.
-- The row is structurally blank.
-- ============================================================

create or replace function public.insert_first_smart_sheet_row_secure(
  requested_sheet_id uuid
)
returns table (
  row_id uuid,
  row_number integer
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_user_id uuid;
  sheet_organization_id uuid;
  sheet_status text;
  inserted_row_id uuid;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select
    s.organization_id,
    s.status
  into
    sheet_organization_id,
    sheet_status
  from public.smart_sheets s
  where s.id = requested_sheet_id
  for update;

  if not found then
    raise exception 'Smart Sheet not found';
  end if;

  if not public.is_organization_member(
    sheet_organization_id
  ) then
    raise exception
      'You do not have access to this Smart Sheet';
  end if;

  if sheet_status not in ('draft', 'processing') then
    raise exception
      'Only Draft Smart Sheets can be edited';
  end if;

  if exists (
    select 1
    from public.smart_sheet_rows r
    where r.smart_sheet_id = requested_sheet_id
      and r.organization_id = sheet_organization_id
  ) then
    raise exception
      'This Smart Sheet already contains rows';
  end if;

  insert into public.smart_sheet_rows (
    organization_id,
    smart_sheet_id,
    row_number
  )
  values (
    sheet_organization_id,
    requested_sheet_id,
    1
  )
  returning
    smart_sheet_rows.id
  into
    inserted_row_id;

  perform public.recalculate_smart_sheet(
    requested_sheet_id
  );

  return query
  select
    inserted_row_id,
    1::integer;
end;
$function$;


-- Do not rely on PostgreSQL's default PUBLIC function execution.
revoke all
on function public.insert_first_smart_sheet_row_secure(uuid)
from public;

grant execute
on function public.insert_first_smart_sheet_row_secure(uuid)
to authenticated;

commit;
