-- SAMZY General Smart Sheet Foundation
--
-- A Smart Sheet is a general-purpose spreadsheet.
-- Document/business classifications are optional context and must not
-- define or restrict the existence of a Smart Sheet.
--
-- Backward compatibility:
-- Existing supplier_invoice and sales_receipt values remain valid.
-- Existing rows and document workflows are not modified.

alter table public.smart_sheets
  alter column sheet_type drop default;

alter table public.smart_sheets
  alter column sheet_type drop not null;

alter table public.smart_sheets
  drop constraint if exists smart_sheets_sheet_type_check;

alter table public.smart_sheets
  add constraint smart_sheets_sheet_type_check
  check (
    sheet_type is null
    or sheet_type in ('supplier_invoice', 'sales_receipt')
  );
