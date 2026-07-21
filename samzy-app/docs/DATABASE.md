# SAMZY Database Architecture

## Purpose

The SAMZY database is the central source of truth for all business operations.

It must support:

- Millions of users
- Millions of organizations
- Large product catalogs
- High-volume inventory movements
- Spreadsheet data
- OCR document processing
- AI conversations
- Reports
- Team collaboration
- Billing
- Audit history

The database must be secure, scalable, multi-tenant, and easy to evolve through version-controlled migrations.

---

# Core Database Principles

1. Every business-owned record belongs to an organization.
2. Organization data must be isolated using Row Level Security.
3. Every table must use UUID primary keys.
4. Every schema change must be created through a migration.
5. Financial values must use exact decimal types.
6. Historical transactions must never be silently overwritten.
7. Important business operations must be atomic.
8. Large datasets must be indexed and paginated.
9. Client-side code must never bypass database permissions.
10. Service-role credentials must never be exposed to the browser.

---

# Multi-Tenant Model

The organization is SAMZY's primary tenant boundary.

```text
User
  │
  ▼
Organization Membership
  │
  ▼
Organization
  │
  ├── Workspaces
  ├── Products
  ├── Inventory
  ├── Suppliers
  ├── Customers
  ├── Documents
  ├── Sales
  ├── Purchases
  ├── Spreadsheets
  ├── Reports
  └── AI Data
```

Every tenant-owned table must include:

```sql
organization_id uuid not null
```

Workspace-specific tables may also include:

```sql
workspace_id uuid
```

---

# Naming Conventions

## Tables

Use plural snake_case names.

Examples:

```text
organizations
organization_members
inventory_movements
supplier_price_history
```

## Columns

Use snake_case.

Examples:

```text
created_at
organization_id
unit_price
document_type
```

## Foreign Keys

Use the referenced entity name followed by `_id`.

Examples:

```text
organization_id
supplier_id
product_id
workspace_id
```

## Timestamps

Use:

```sql
timestamptz
```

Standard timestamp columns:

```text
created_at
updated_at
archived_at
deleted_at
```

## Primary Keys

Use:

```sql
uuid primary key default gen_random_uuid()
```

---

# Existing Foundation Tables

## profiles

Stores application-facing user information linked to Supabase Auth.

### Columns

```text
id
full_name
avatar_url
locale
created_at
updated_at
```

### Relationship

```text
profiles.id → auth.users.id
```

---

## organizations

Represents a company, business, or legal operating entity.

### Columns

```text
id
name
slug
country_code
currency
timezone
created_by
created_at
updated_at
```

### Examples

```text
RM TECH
Sher-e-Punjab
Gloriousweek
```

---

## organization_members

Connects users to organizations.

### Columns

```text
organization_id
user_id
role
created_at
```

### Supported roles

```text
owner
admin
manager
member
```

### Primary key

```text
organization_id + user_id
```

---

## workspaces

Represents an operational environment inside an organization.

### Columns

```text
id
organization_id
name
is_default
created_by
created_at
updated_at
```

### Examples

```text
Main Workspace
Lisbon Store
Warehouse
Accounting Department
```

---

# Planned Core Business Tables

## products

Stores the master product catalog.

### Columns

```text
id
organization_id
workspace_id
name
sku
barcode
brand
category_id
description
purchase_price
selling_price
vat_rate
unit_of_measure
track_inventory
status
created_by
updated_by
created_at
updated_at
archived_at
```

### Status values

```text
active
inactive
archived
```

### Important indexes

```text
organization_id
workspace_id
sku
barcode
category_id
status
```

### Unique rules

SKU and barcode should be unique within an organization when present.

---

## product_categories

Stores product categories.

### Columns

```text
id
organization_id
parent_id
name
slug
description
created_at
updated_at
```

Supports nested categories.

---

## product_images

Stores references to product images in Supabase Storage.

### Columns

```text
id
organization_id
product_id
storage_path
alt_text
sort_order
is_primary
created_at
```

---

## product_prices

Stores current and scheduled product pricing.

### Columns

```text
id
organization_id
product_id
price_type
amount
currency
valid_from
valid_until
created_at
```

### Price types

```text
purchase
selling
wholesale
promotional
```

---

## product_price_history

Stores historical price changes.

### Columns

```text
id
organization_id
product_id
supplier_id
old_price
new_price
currency
source_type
source_id
changed_at
changed_by
```

---

# Inventory Tables

## inventory_locations

Represents shops, warehouses, storage rooms, or vehicles.

### Columns

```text
id
organization_id
workspace_id
name
location_type
address
is_default
created_at
updated_at
```

### Location types

```text
shop
warehouse
office
vehicle
other
```

---

## inventory_balances

Stores the current calculated balance for each product and location.

### Columns

```text
id
organization_id
product_id
location_id
quantity_on_hand
quantity_reserved
quantity_available
updated_at
```

### Unique constraint

```text
organization_id + product_id + location_id
```

This table is a fast-read projection.

The movement ledger remains the source of truth.

---

## inventory_movements

Stores every stock movement.

### Columns

```text
id
organization_id
workspace_id
product_id
location_id
movement_type
quantity
unit_cost
reference_type
reference_id
notes
created_by
created_at
```

### Movement types

```text
purchase
sale
return_in
return_out
adjustment_in
adjustment_out
transfer_in
transfer_out
opening_balance
damaged
expired
```

Quantities may be positive or negative.

Negative inventory is supported.

---

## stock_adjustments

Stores manual stock corrections.

### Columns

```text
id
organization_id
workspace_id
location_id
reason
status
approved_by
created_by
created_at
updated_at
```

---

## stock_adjustment_items

### Columns

```text
id
organization_id
adjustment_id
product_id
previous_quantity
adjusted_quantity
difference
reason
created_at
```

---

## stock_transfers

Stores transfers between inventory locations.

### Columns

```text
id
organization_id
workspace_id
from_location_id
to_location_id
status
reference_number
notes
created_by
approved_by
created_at
completed_at
```

### Status values

```text
draft
in_transit
completed
cancelled
```

---

## stock_transfer_items

### Columns

```text
id
organization_id
transfer_id
product_id
quantity
unit_cost
created_at
```

---

# Supplier Tables

## suppliers

Stores supplier companies.

### Columns

```text
id
organization_id
workspace_id
name
legal_name
tax_number
email
phone
website
address
country_code
currency
payment_terms
credit_limit
status
notes
created_by
created_at
updated_at
archived_at
```

---

## supplier_contacts

Stores multiple contacts for a supplier.

### Columns

```text
id
organization_id
supplier_id
name
job_title
email
phone
is_primary
created_at
updated_at
```

---

## supplier_products

Connects suppliers to products.

### Columns

```text
id
organization_id
supplier_id
product_id
supplier_sku
supplier_product_name
minimum_order_quantity
lead_time_days
current_price
currency
is_preferred
created_at
updated_at
```

### Unique constraint

```text
organization_id + supplier_id + product_id
```

---

## supplier_price_history

Stores price changes from supplier documents.

### Columns

```text
id
organization_id
supplier_id
product_id
document_id
unit_price
currency
quantity
recorded_at
```

---

# Customer Tables

## customers

Stores customer records.

### Columns

```text
id
organization_id
workspace_id
customer_type
name
company_name
tax_number
email
phone
currency
credit_limit
outstanding_balance
notes
status
created_by
created_at
updated_at
archived_at
```

### Customer types

```text
individual
business
```

---

## customer_addresses

### Columns

```text
id
organization_id
customer_id
address_type
line_1
line_2
city
postal_code
region
country_code
is_default
created_at
updated_at
```

---

## customer_contacts

Stores multiple business contacts.

### Columns

```text
id
organization_id
customer_id
name
job_title
email
phone
is_primary
created_at
```

---

# Purchase Tables

## purchases

Represents supplier purchases and purchase invoices.

### Columns

```text
id
organization_id
workspace_id
supplier_id
document_id
purchase_number
supplier_invoice_number
purchase_date
due_date
status
currency
subtotal
discount_total
tax_total
shipping_total
grand_total
amount_paid
amount_due
payment_status
notes
created_by
created_at
updated_at
```

### Status values

```text
draft
pending
approved
received
cancelled
```

### Payment status values

```text
unpaid
partially_paid
paid
overdue
```

---

## purchase_items

### Columns

```text
id
organization_id
purchase_id
product_id
description
sku
barcode
quantity
unit_price
discount_amount
vat_rate
tax_amount
line_total
created_at
```

---

# Sales Tables

## sales

Represents sales, receipts, and customer invoices.

### Columns

```text
id
organization_id
workspace_id
customer_id
document_id
sale_number
sale_date
status
currency
subtotal
discount_total
tax_total
grand_total
amount_paid
amount_due
payment_status
payment_method
notes
created_by
created_at
updated_at
```

### Status values

```text
draft
completed
refunded
cancelled
```

---

## sale_items

### Columns

```text
id
organization_id
sale_id
product_id
description
sku
barcode
quantity
unit_price
discount_amount
vat_rate
tax_amount
line_total
created_at
```

---

## payments

Stores payments for sales and purchases.

### Columns

```text
id
organization_id
workspace_id
payment_direction
payment_method
amount
currency
payment_date
reference_type
reference_id
reference_number
notes
created_by
created_at
```

### Payment directions

```text
incoming
outgoing
```

---

# Document and OCR Tables

## documents

Stores uploaded or generated documents.

### Columns

```text
id
organization_id
workspace_id
document_type
status
source
original_filename
storage_path
mime_type
file_size
document_number
document_date
supplier_id
customer_id
currency
subtotal
tax_total
grand_total
uploaded_by
created_at
updated_at
```

### Document types

```text
supplier_invoice
supplier_quotation
sales_receipt
delivery_note
purchase_order
sales_invoice
other
```

### Status values

```text
uploaded
processing
review_required
approved
failed
archived
```

---

## document_items

Stores extracted document line items.

### Columns

```text
id
organization_id
document_id
product_id
line_number
raw_description
normalized_description
sku
barcode
quantity
unit_price
discount_amount
vat_rate
tax_amount
line_total
confidence_score
created_at
updated_at
```

---

## document_extractions

Stores structured OCR and AI extraction results.

### Columns

```text
id
organization_id
document_id
provider
model
status
raw_output
structured_output
confidence_score
processing_started_at
processing_completed_at
error_message
created_at
```

Use JSONB for `raw_output` and `structured_output`.

---

## extraction_reviews

Stores human corrections.

### Columns

```text
id
organization_id
document_id
document_item_id
field_name
original_value
corrected_value
reviewed_by
reviewed_at
```

---

# Spreadsheet Tables

## spreadsheet_files

Represents a spreadsheet document.

### Columns

```text
id
organization_id
workspace_id
name
description
status
created_by
updated_by
created_at
updated_at
archived_at
```

---

## spreadsheet_sheets

Represents tabs inside a spreadsheet.

### Columns

```text
id
organization_id
spreadsheet_id
name
position
row_count
column_count
frozen_rows
frozen_columns
created_at
updated_at
```

---

## spreadsheet_cells

Stores spreadsheet cell values.

### Columns

```text
id
organization_id
spreadsheet_id
sheet_id
row_index
column_index
raw_value
display_value
formula
value_type
formatting
updated_by
updated_at
```

Use JSONB for formatting.

### Value types

```text
text
number
currency
percentage
date
datetime
boolean
formula
error
```

### Unique constraint

```text
sheet_id + row_index + column_index
```

---

## spreadsheet_versions

Stores spreadsheet snapshots or change metadata.

### Columns

```text
id
organization_id
spreadsheet_id
version_number
change_summary
snapshot_path
created_by
created_at
```

Large snapshots should be stored in object storage rather than directly in PostgreSQL.

---

## spreadsheet_collaborators

### Columns

```text
id
organization_id
spreadsheet_id
user_id
permission
created_at
```

### Permissions

```text
view
comment
edit
owner
```

---

## spreadsheet_comments

### Columns

```text
id
organization_id
spreadsheet_id
sheet_id
cell_reference
content
author_id
resolved_at
created_at
updated_at
```

---

# AI Tables

## ai_conversations

### Columns

```text
id
organization_id
workspace_id
title
created_by
created_at
updated_at
```

---

## ai_messages

### Columns

```text
id
organization_id
conversation_id
role
content
metadata
created_at
```

### Roles

```text
user
assistant
system
tool
```

Use JSONB for metadata.

---

## ai_jobs

Stores asynchronous AI work.

### Columns

```text
id
organization_id
workspace_id
job_type
status
input
output
error_message
started_at
completed_at
created_by
created_at
```

### Job types

```text
document_extraction
forecast
supplier_comparison
reorder_recommendation
report_generation
data_analysis
```

---

## ai_insights

Stores generated business insights.

### Columns

```text
id
organization_id
workspace_id
insight_type
title
summary
details
priority
status
source_data
generated_at
dismissed_at
```

---

# Reporting and Analytics

Reports should normally be calculated from source tables.

Do not duplicate totals unless required for performance.

Use:

- SQL views
- Materialized views
- Background aggregation jobs
- Cached reporting tables where necessary

Planned views:

```text
daily_sales_summary
monthly_profit_summary
inventory_valuation
low_stock_products
supplier_price_comparison
customer_lifetime_value
vat_summary
cash_flow_summary
```

---

# Team and Permission Tables

## workspace_members

Optional future table for workspace-level access.

### Columns

```text
workspace_id
user_id
role
created_at
```

---

## role_permissions

Stores advanced permissions.

### Columns

```text
id
organization_id
role_name
permission_key
allowed
created_at
updated_at
```

---

## invitations

Stores team invitations.

### Columns

```text
id
organization_id
email
role
token_hash
status
invited_by
expires_at
accepted_at
created_at
```

---

# Billing Tables

## subscriptions

### Columns

```text
id
organization_id
provider
provider_customer_id
provider_subscription_id
plan
status
billing_interval
current_period_start
current_period_end
cancel_at_period_end
created_at
updated_at
```

---

## usage_records

Tracks plan usage.

### Columns

```text
id
organization_id
metric
quantity
period_start
period_end
created_at
```

### Metrics

```text
users
documents_scanned
ai_requests
storage_bytes
spreadsheet_cells
products
```

---

# Audit and Activity Tables

## audit_logs

Stores important user and system actions.

### Columns

```text
id
organization_id
workspace_id
user_id
action
entity_type
entity_id
previous_data
new_data
ip_address
user_agent
created_at
```

Use JSONB for `previous_data` and `new_data`.

Audit logs should be append-only.

---

## activity_events

Stores user-facing recent activity.

### Columns

```text
id
organization_id
workspace_id
actor_id
event_type
entity_type
entity_id
title
description
metadata
created_at
```

---

# Database Types

## Monetary values

Use:

```sql
numeric(18, 4)
```

Never use floating-point values for money.

## Quantities

Use:

```sql
numeric(18, 4)
```

This supports units sold by weight or fraction.

## VAT rates

Use:

```sql
numeric(7, 4)
```

## Confidence scores

Use:

```sql
numeric(5, 4)
```

Values should normally range from 0 to 1.

## JSON

Use JSONB for:

- OCR output
- AI metadata
- Formatting
- Audit changes
- Flexible integration payloads

Do not use JSONB for data that needs frequent filtering or relational joins.

---

# Row Level Security

RLS must be enabled on every organization-owned table.

Base access rule:

```sql
exists (
  select 1
  from public.organization_members
  where organization_members.organization_id = table.organization_id
    and organization_members.user_id = auth.uid()
)
```

Write access must additionally verify the user's role.

Examples:

```text
owner
admin
manager
member
```

Sensitive operations must not rely only on frontend checks.

---

# Database Functions

Use PostgreSQL functions when an operation must update multiple tables atomically.

Examples:

```text
create_organization_with_workspace
approve_supplier_invoice
complete_sale
post_inventory_movement
complete_stock_transfer
reverse_inventory_transaction
accept_team_invitation
```

Each function must:

1. Confirm the authenticated user.
2. Confirm organization membership.
3. Confirm required role.
4. Validate input.
5. Update all related records in one transaction.
6. Raise a clear error when the operation fails.

---

# Inventory Integrity

Inventory must be ledger-based.

The source of truth is:

```text
inventory_movements
```

The fast-read balance table is:

```text
inventory_balances
```

Every stock change must create an inventory movement.

Do not directly change inventory balances without recording the corresponding movement.

---

# Financial Integrity

Completed sales and purchases should not be silently edited.

Use:

- Reversal transactions
- Credit notes
- Refunds
- Adjustment records

Financial history must remain auditable.

---

# Soft Deletion

Use soft deletion for records that must remain historically available.

Recommended column:

```sql
archived_at timestamptz
```

Use hard deletion only for:

- Temporary drafts
- Failed uploads with no business value
- Data explicitly removed under legal requirements

---

# Indexing Strategy

Every large tenant-owned table should normally index:

```text
organization_id
workspace_id
created_at
status
```

Also index frequent lookup fields:

```text
sku
barcode
document_number
supplier_id
customer_id
product_id
```

Composite indexes should match common query patterns.

Example:

```sql
create index on inventory_movements (
  organization_id,
  product_id,
  created_at desc
);
```

---

# Pagination

Never load entire large tables into the browser.

Use:

- Cursor pagination where possible
- Limit and offset for smaller administrative lists
- Server-side filtering
- Server-side sorting

---

# Database Migration Rules

1. All schema changes must be stored in `supabase/migrations`.
2. Migration filenames must begin with a timestamp.
3. Never change a migration after it has been applied to production.
4. Create a new migration to fix or modify an existing schema.
5. Test migrations locally or in a development project first.
6. Use transactions where supported.
7. Add indexes and RLS policies in the same feature migration.
8. Document destructive changes.
9. Back up critical data before risky migrations.
10. Keep production and development schemas synchronized.

Example filename:

```text
202607210001_phase1_foundation.sql
```

---

# Data Retention

Future retention rules should support:

- Legal invoice retention requirements
- Audit history
- Account deletion
- Data export
- GDPR requests
- Organization-level deletion workflows

Deleted organizations should enter a recovery period before permanent removal.

---

# Backup Strategy

Supabase managed backups should be enabled according to the production plan.

SAMZY should also support:

- Periodic logical backups
- Migration history in Git
- Storage backup policies
- Disaster recovery documentation
- Restore testing

---

# Scalability Strategy

As SAMZY grows:

1. Use strong indexes.
2. Archive old operational data.
3. Partition very large movement or audit tables if needed.
4. Use materialized views for analytics.
5. Run OCR and AI asynchronously.
6. Avoid unnecessary joins on high-frequency screens.
7. Cache safe aggregate data.
8. Monitor slow queries.
9. Apply database connection pooling.
10. Separate analytical workloads if necessary.

---

# Current Implementation Status

Implemented:

- profiles
- organizations
- organization_members
- workspaces
- authentication profile trigger
- organization membership function
- organization and workspace creation function
- initial RLS policies

Next database milestone:

- business onboarding fields
- organization settings
- business types
- organization preferences
- improved workspace configuration

After onboarding:

- spreadsheet files
- spreadsheet sheets
- spreadsheet cells
- spreadsheet versions

---

# Database Mission

The SAMZY database must preserve the complete operational history of every business while keeping each organization's data isolated, secure, accurate, and fast.

Every future feature must extend this architecture without weakening security, financial integrity, inventory traceability, or scalability.