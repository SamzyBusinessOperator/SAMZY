# SAMZY Product Roadmap

## Purpose

This roadmap defines the order in which SAMZY will be designed, built, tested, and launched.

SAMZY is an AI-powered Business Operating System combining:

- Spreadsheets
- Products
- Inventory
- Suppliers
- Customers
- OCR document scanning
- Reports
- Business intelligence
- AI assistance
- Team collaboration
- Billing
- Marketplace extensions

The roadmap is organized into clear product phases so the platform can grow without losing architectural quality.

---

# Product Vision

SAMZY should become the daily operating system for businesses.

A business should be able to open SAMZY and manage:

- Data
- Documents
- Stock
- Suppliers
- Customers
- Financial records
- Reports
- Team members
- AI recommendations

The platform must remain:

- Simple to use
- Secure
- Multi-tenant
- Scalable
- Fast
- Modular
- Reliable
- Suitable for businesses in different industries

---

# Delivery Principles

1. Build the foundation before advanced features.
2. Complete one phase before starting the next.
3. Every feature must support multi-tenant security.
4. Every phase must include loading, empty, error, and responsive states.
5. Database migrations must be version controlled.
6. Every feature must be tested before deployment.
7. Avoid building one-off functionality for a single client.
8. Reuse components and business logic.
9. Keep the spreadsheet at the center of the product.
10. Launch usable versions early and improve continuously.

---

# Current Project Status

## Completed Infrastructure

- GitHub repository
- Next.js application
- React
- TypeScript
- Tailwind CSS
- Supabase project
- PostgreSQL database
- Supabase Auth
- Supabase environment variables
- Vercel deployment setup
- Custom domain configuration
- Local development environment
- Successful production build

---

## Completed Frontend

- Landing page
- Login page
- Signup page
- Authentication callback route
- Initial protected application structure

---

## Completed Database Foundation

- profiles
- organizations
- organization_members
- workspaces
- Row Level Security foundation
- User profile trigger
- Organization onboarding function
- Membership access logic

---

# Phase 1 — Foundation

## Objective

Create a stable, secure, and scalable base for the entire platform.

## Scope

- Project architecture
- Authentication
- User profiles
- Organizations
- Organization memberships
- Workspaces
- Multi-tenant security
- Protected routes
- Application shell
- Error handling
- Environment configuration
- Deployment pipeline

## Tasks

### Architecture

- [x] Define product architecture
- [x] Define database architecture
- [x] Define design system
- [x] Define roadmap
- [x] Create feature folders
- [x] Create reusable component folders

### Authentication

- [x] Signup page
- [x] Login page
- [x] Supabase authentication
- [x] Authentication callback
- [ ] Email confirmation testing
- [ ] Sign-out flow
- [ ] Forgot-password flow
- [ ] Reset-password flow
- [ ] Session expiry handling
- [ ] Authentication error pages

### Organizations

- [x] Organizations table
- [x] Organization members table
- [x] Workspaces table
- [x] Initial onboarding database function
- [ ] Organization settings
- [ ] Organization switching
- [ ] Workspace switching
- [ ] Organization deletion workflow
- [ ] Organization ownership transfer

### Security

- [x] Initial Row Level Security
- [ ] Review all RLS policies
- [ ] Test cross-organization isolation
- [ ] Add role-based write policies
- [ ] Add server-side permission helpers
- [ ] Add audit logging foundation
- [ ] Confirm secrets never reach client code

### Application Shell

- [ ] Sidebar
- [ ] Top navigation
- [ ] Workspace selector
- [ ] Organization selector
- [ ] Mobile navigation
- [ ] User profile menu
- [ ] Notifications placeholder
- [ ] Global command menu

## Completion Criteria

Phase 1 is complete when:

- A user can sign up.
- A user can confirm their email.
- A user can log in.
- A user can complete onboarding.
- An organization and workspace are created.
- The user is redirected to a protected dashboard.
- A user cannot access another organization's data.
- The app shell works on desktop and mobile.
- Production authentication works on the custom domain.

---

# Phase 2 — Business Onboarding

## Objective

Collect the essential business configuration required for all later modules.

## User Flow

```text
Create account
Confirm email
Welcome to SAMZY
Create business
Choose business type
Choose country
Choose currency
Choose timezone
Choose tax settings
Create workspace
Open dashboard
```

## Scope

- Welcome screen
- Business creation
- Business type
- Country
- Currency
- Timezone
- Tax system
- Default workspace
- Initial preferences
- Onboarding progress
- Onboarding completion state

## Business Types

Initial options:

- Retail
- Wholesale
- Restaurant
- Services
- Professional services
- Repair business
- Ecommerce
- Manufacturing
- Logistics
- Other

## Tasks

- [ ] Build onboarding layout
- [ ] Build welcome screen
- [ ] Build business details step
- [ ] Build country and locale step
- [ ] Build currency step
- [ ] Build tax configuration step
- [ ] Build workspace creation step
- [ ] Add validation
- [ ] Save onboarding progress
- [ ] Support resume after interruption
- [ ] Redirect completed users
- [ ] Prevent completed users from repeating onboarding
- [ ] Add onboarding tests

## Completion Criteria

Phase 2 is complete when:

- A new user can complete onboarding without manual database changes.
- Organization settings are stored correctly.
- A default workspace is created.
- Locale, currency, timezone, and tax settings are saved.
- Interrupted onboarding can be resumed.
- The dashboard opens after completion.

---

# Phase 3 — Dashboard Foundation

## Objective

Create the main home screen businesses see after login.

## Scope

- Business overview
- Metric cards
- Recent activity
- Quick actions
- Setup checklist
- Low-stock preview
- Recent documents
- Sales preview
- AI insight placeholder
- Empty states
- Responsive dashboard

## Initial Dashboard Metrics

- Sales today
- Sales this week
- Purchases this month
- Products
- Low-stock products
- Out-of-stock products
- Pending documents
- Outstanding payments

## Tasks

- [ ] Build dashboard page
- [ ] Build metric card component
- [ ] Build activity feed
- [ ] Build setup checklist
- [ ] Build quick actions
- [ ] Add empty states
- [ ] Add loading skeletons
- [ ] Add responsive layout
- [ ] Connect organization data
- [ ] Add date filters
- [ ] Add dashboard permissions
- [ ] Add dashboard tests

## Completion Criteria

Phase 3 is complete when:

- Dashboard data is scoped to the active organization.
- Empty organizations see a useful setup experience.
- Metric cards use real database data.
- The dashboard works on desktop and mobile.
- Loading and error states are complete.

---

# Phase 4 — Spreadsheet Engine

## Objective

Build the central spreadsheet workspace that powers SAMZY.

## Scope

- Spreadsheet home
- Create spreadsheet
- Spreadsheet files
- Multiple sheets
- Cell grid
- Cell editing
- Formula bar
- Keyboard navigation
- Copy and paste
- Undo and redo
- Sorting
- Filtering
- Formatting
- Version history
- Saving
- Loading
- Large-grid performance

## Core User Flow

```text
Open spreadsheets
Create spreadsheet
Name file
Edit cells
Add formulas
Create sheets
Save automatically
Return later
Continue editing
```

## Initial Formula Support

- SUM
- AVERAGE
- MIN
- MAX
- COUNT
- IF
- ROUND
- TODAY
- DATE
- Percentage calculations
- Basic arithmetic
- Cell references
- Range references

## Tasks

### Data Model

- [ ] spreadsheet_files table
- [ ] spreadsheet_sheets table
- [ ] spreadsheet_cells table
- [ ] spreadsheet_versions table
- [ ] spreadsheet_collaborators table
- [ ] RLS policies
- [ ] Database indexes

### Spreadsheet Home

- [ ] Spreadsheet list
- [ ] Create spreadsheet
- [ ] Rename spreadsheet
- [ ] Archive spreadsheet
- [ ] Duplicate spreadsheet
- [ ] Recent spreadsheets
- [ ] Search and filters

### Grid

- [ ] Row headers
- [ ] Column headers
- [ ] Cell selection
- [ ] Range selection
- [ ] Cell editing
- [ ] Keyboard navigation
- [ ] Column resizing
- [ ] Row resizing
- [ ] Copy and paste
- [ ] Undo and redo
- [ ] Multi-cell editing
- [ ] Virtualized rows
- [ ] Virtualized columns

### Formula Engine

- [ ] Formula parser
- [ ] Formula evaluation
- [ ] Dependency tracking
- [ ] Error handling
- [ ] Circular-reference detection
- [ ] Formula autocomplete
- [ ] Formula bar

### Saving

- [ ] Autosave
- [ ] Save indicator
- [ ] Conflict handling
- [ ] Version history
- [ ] Restore previous version

### Formatting

- [ ] Bold
- [ ] Italic
- [ ] Text alignment
- [ ] Currency
- [ ] Percentage
- [ ] Date
- [ ] Decimal precision
- [ ] Cell background
- [ ] Text color
- [ ] Borders

## Completion Criteria

Phase 4 is complete when:

- Users can create and edit spreadsheets.
- Data persists correctly.
- Keyboard navigation works.
- Basic formulas work.
- Large sheets remain responsive.
- Autosave is reliable.
- Spreadsheet data is isolated by organization.
- Version history is available.

---

# Phase 5 — Product Management

## Objective

Build the reusable product catalog used by inventory, purchases, sales, OCR, and reports.

## Scope

- Product list
- Product creation
- Product editing
- Categories
- Brands
- SKU
- Barcode
- Purchase price
- Selling price
- VAT rate
- Unit of measure
- Images
- Product status
- Bulk actions
- Import and export

## Tasks

- [ ] Create product tables
- [ ] Add product RLS
- [ ] Build product list
- [ ] Build product form
- [ ] Build product details
- [ ] Add categories
- [ ] Add brand field
- [ ] Add SKU validation
- [ ] Add barcode validation
- [ ] Add product images
- [ ] Add archive workflow
- [ ] Add bulk actions
- [ ] Add CSV import
- [ ] Add CSV export
- [ ] Add search
- [ ] Add filters
- [ ] Add pagination
- [ ] Add responsive mobile view

## Completion Criteria

Phase 5 is complete when:

- Users can create, edit, search, and archive products.
- SKU and barcode rules are enforced.
- Product data can be imported and exported.
- Products are available to inventory and document modules.
- Product permissions are secure.

---

# Phase 6 — Inventory Management

## Objective

Track accurate stock across locations.

## Scope

- Inventory locations
- Current stock
- Negative stock
- Stock movements
- Stock adjustments
- Stock transfers
- Low-stock alerts
- Inventory valuation
- Stock history
- Opening balances

## Tasks

- [ ] Create inventory tables
- [ ] Create movement ledger
- [ ] Create inventory balances
- [ ] Build inventory overview
- [ ] Build location management
- [ ] Build stock adjustment flow
- [ ] Build transfer flow
- [ ] Support negative stock
- [ ] Add low-stock settings
- [ ] Add inventory history
- [ ] Add valuation report
- [ ] Add stock filters
- [ ] Add product stock panel
- [ ] Add atomic inventory functions
- [ ] Add inventory audit tests

## Completion Criteria

Phase 6 is complete when:

- Every stock change creates a movement.
- Stock balances remain accurate.
- Negative inventory is supported.
- Transfers work between locations.
- Stock adjustments are auditable.
- Low-stock alerts are visible.
- Inventory data is organization-scoped.

---

# Phase 7 — Suppliers and Customers

## Objective

Build reusable relationship management for suppliers and customers.

## Supplier Scope

- Supplier list
- Supplier profile
- Contacts
- Products
- Price history
- Payment terms
- Documents
- Purchases

## Customer Scope

- Customer list
- Customer profile
- Contacts
- Addresses
- Sales history
- Outstanding balance
- Documents

## Tasks

### Suppliers

- [ ] Supplier tables
- [ ] Supplier list
- [ ] Supplier form
- [ ] Supplier details
- [ ] Supplier contacts
- [ ] Supplier products
- [ ] Supplier price history
- [ ] Supplier documents
- [ ] Supplier search and filters

### Customers

- [ ] Customer tables
- [ ] Customer list
- [ ] Customer form
- [ ] Customer details
- [ ] Customer contacts
- [ ] Customer addresses
- [ ] Customer sales history
- [ ] Customer balances
- [ ] Customer search and filters

## Completion Criteria

Phase 7 is complete when:

- Suppliers and customers can be managed independently.
- Their transactions and documents are linked correctly.
- Supplier price history is visible.
- Customer balances are accurate.
- Data is secure and organization-scoped.

---

# Phase 8 — OCR Document Scanners

## Objective

Convert business documents into structured records automatically.

## Initial Scanners

- Supplier Invoice Scanner
- Supplier Quotation Scanner
- Sales Receipt Scanner
- Delivery Note Scanner

## Core Workflow

```text
Upload file
Store securely
Create processing job
Extract document data
Extract line items
Match supplier or customer
Match products
Show confidence warnings
Review
Approve
Create business records
Update inventory when applicable
```

## Tasks

### Upload

- [ ] Drag-and-drop upload
- [ ] File picker
- [ ] Mobile camera upload
- [ ] PDF support
- [ ] JPG support
- [ ] PNG support
- [ ] File validation
- [ ] Upload progress
- [ ] Secure storage paths

### Processing

- [ ] OCR provider integration
- [ ] Structured extraction
- [ ] Processing status
- [ ] Error handling
- [ ] Retry flow
- [ ] Background processing
- [ ] Confidence scores

### Review

- [ ] Document preview
- [ ] Extracted header fields
- [ ] Extracted line items
- [ ] Warning indicators
- [ ] Product matching
- [ ] Supplier matching
- [ ] Manual corrections
- [ ] Approve and reject actions

### Business Integration

- [ ] Create purchase from invoice
- [ ] Create supplier quotation
- [ ] Create sale from receipt
- [ ] Create delivery record
- [ ] Update product prices
- [ ] Update supplier price history
- [ ] Post inventory movements
- [ ] Preserve original document

## Completion Criteria

Phase 8 is complete when:

- Users can upload supported documents.
- OCR output is reviewable.
- Low-confidence fields are visible.
- Users can correct extracted values.
- Approved documents create business records.
- Original files and extraction history remain available.
- Processing failures can be retried safely.

---

# Phase 9 — Purchases and Sales

## Objective

Create structured financial and operational transaction records.

## Purchase Scope

- Purchase orders
- Supplier invoices
- Purchase items
- Payments
- Receiving
- Purchase status
- Outstanding supplier balances

## Sales Scope

- Sales receipts
- Sales invoices
- Sale items
- Payments
- Refunds
- Customer balances
- Sales status

## Tasks

- [ ] Purchases tables
- [ ] Purchase list
- [ ] Purchase form
- [ ] Purchase approval
- [ ] Purchase receiving
- [ ] Purchase payments
- [ ] Sales tables
- [ ] Sales list
- [ ] Sale form
- [ ] Sale completion
- [ ] Refund flow
- [ ] Customer payments
- [ ] Supplier payments
- [ ] Inventory posting
- [ ] Financial integrity checks
- [ ] Transaction reversal flows

## Completion Criteria

Phase 9 is complete when:

- Purchases and sales can be created manually or from OCR.
- Completed transactions update inventory correctly.
- Payments are tracked.
- Outstanding balances are accurate.
- Completed financial history cannot be silently overwritten.
- Refunds and reversals are auditable.

---

# Phase 10 — Reports and Business Intelligence

## Objective

Turn operational data into clear business insight.

## Initial Reports

- Sales summary
- Purchase summary
- Profit and loss
- VAT summary
- Inventory valuation
- Low-stock report
- Out-of-stock report
- Supplier price comparison
- Product profitability
- Customer balances
- Supplier balances
- Cash flow summary

## Tasks

- [ ] Reports dashboard
- [ ] Date filters
- [ ] Workspace filters
- [ ] Location filters
- [ ] Export to PDF
- [ ] Export to Excel
- [ ] Scheduled reports
- [ ] Saved report filters
- [ ] Materialized views
- [ ] Report caching
- [ ] Drill-down views
- [ ] Printable layouts
- [ ] Mobile report views

## Completion Criteria

Phase 10 is complete when:

- Reports are generated from source business data.
- Financial totals are consistent with transactions.
- Users can filter and export reports.
- Large reports remain performant.
- Report access respects organization permissions.

---

# Phase 11 — AI Business Assistant

## Objective

Let users ask natural-language questions about their business and receive reliable, grounded answers.

## Example Questions

- What should I reorder?
- Which supplier is cheapest?
- What were sales last week?
- Which products are most profitable?
- How much VAT do I owe?
- Which customers owe money?
- Show products with falling margins.
- Generate a purchase order.
- Compare this month with last month.

## Scope

- AI conversations
- Suggested prompts
- Business data tools
- Data citations
- Action previews
- Confirmation before changes
- Saved conversations
- AI insights
- AI background jobs

## Tasks

- [ ] AI conversation tables
- [ ] AI assistant page
- [ ] Assistant drawer
- [ ] Tool-based database access
- [ ] Organization-safe context
- [ ] Response citations
- [ ] Suggested prompts
- [ ] Action previews
- [ ] Confirmation flow
- [ ] Conversation history
- [ ] AI usage limits
- [ ] AI error handling
- [ ] AI insight cards
- [ ] Reorder recommendations
- [ ] Supplier comparisons
- [ ] Forecasting foundation

## Completion Criteria

Phase 11 is complete when:

- AI answers use the active organization's data only.
- Responses cite source records.
- The assistant distinguishes facts from recommendations.
- Mutations require confirmation.
- Usage can be measured and limited.
- AI failures do not compromise business data.

---

# Phase 12 — Teams and Permissions

## Objective

Allow businesses to collaborate securely.

## Scope

- Team invitations
- Roles
- Workspace access
- Custom permissions
- Activity history
- User management
- Ownership transfer

## Tasks

- [ ] Invitation system
- [ ] Invite by email
- [ ] Accept invitation
- [ ] Cancel invitation
- [ ] Member list
- [ ] Change role
- [ ] Remove member
- [ ] Workspace-level access
- [ ] Custom permission model
- [ ] Activity history
- [ ] Ownership transfer
- [ ] Security notifications

## Completion Criteria

Phase 12 is complete when:

- Owners can invite and manage members.
- Roles are enforced by server and database.
- Workspace access can be restricted.
- Membership changes are audited.
- Ownership can be transferred safely.

---

# Phase 13 — Billing and Subscriptions

## Objective

Turn SAMZY into a self-service subscription SaaS product.

## Scope

- Pricing plans
- Free trial
- Monthly billing
- Annual billing
- Subscription status
- Usage limits
- Upgrade
- Downgrade
- Cancellation
- Invoices
- Payment failures

## Possible Plan Dimensions

- Number of users
- Number of products
- Number of workspaces
- OCR scans
- AI requests
- Storage
- Spreadsheet size
- Reporting features
- Support level

## Tasks

- [ ] Select billing provider
- [ ] Create pricing plans
- [ ] Create checkout flow
- [ ] Create subscription tables
- [ ] Handle billing webhooks
- [ ] Add customer portal
- [ ] Add plan enforcement
- [ ] Add usage tracking
- [ ] Add trial logic
- [ ] Add payment failure handling
- [ ] Add cancellation flow
- [ ] Add invoice history
- [ ] Add billing permissions

## Completion Criteria

Phase 13 is complete when:

- Organizations can subscribe without manual support.
- Plan limits are enforced.
- Billing status is synchronized reliably.
- Failed payments are handled safely.
- Owners can manage subscriptions.
- Billing events are auditable.

---

# Phase 14 — Integrations

## Objective

Connect SAMZY with the tools businesses already use.

## Initial Integration Categories

- Ecommerce
- POS
- Accounting
- Payments
- Email
- Cloud storage
- Communication
- Automation

## Possible Integrations

- Shopify
- WooCommerce
- Square
- Lightspeed
- Stripe
- Gmail
- Google Drive
- Microsoft 365
- Slack
- Zapier
- Make
- Accounting platforms

## Tasks

- [ ] Integration framework
- [ ] OAuth handling
- [ ] Secure token storage
- [ ] Connection status
- [ ] Sync jobs
- [ ] Error logs
- [ ] Retry system
- [ ] Webhook processing
- [ ] Data mapping
- [ ] Disconnect flow
- [ ] Integration permissions
- [ ] Usage monitoring

## Completion Criteria

Phase 14 is complete when:

- Integrations can be connected securely.
- Sync failures are visible and recoverable.
- Imported data remains organization-scoped.
- Tokens are encrypted and protected.
- Disconnecting does not corrupt business records.

---

# Phase 15 — Marketplace

## Objective

Create an ecosystem of reusable SAMZY modules, templates, and integrations.

## Scope

- Spreadsheet templates
- Industry templates
- Dashboard templates
- AI workflows
- OCR configurations
- Integrations
- Extensions
- Partner modules

## Tasks

- [ ] Marketplace architecture
- [ ] Listing model
- [ ] Install flow
- [ ] Uninstall flow
- [ ] Permissions review
- [ ] Versioning
- [ ] Ratings and reviews
- [ ] Publisher profiles
- [ ] Paid listings
- [ ] Revenue sharing
- [ ] Security review process

## Completion Criteria

Phase 15 is complete when:

- Organizations can install approved modules.
- Extensions declare required permissions.
- Installed modules are versioned.
- Uninstalling preserves data safely.
- Marketplace listings pass security review.

---

# Phase 16 — Enterprise

## Objective

Support larger organizations with advanced security, governance, and scale.

## Scope

- Single sign-on
- SCIM
- Advanced audit logs
- Data retention
- Custom roles
- Multi-entity organizations
- Approval workflows
- Dedicated support
- Advanced reporting
- Security controls
- Data residency options

## Tasks

- [ ] SSO
- [ ] SCIM provisioning
- [ ] Advanced role builder
- [ ] Approval workflows
- [ ] Retention policies
- [ ] Enterprise audit exports
- [ ] Organization groups
- [ ] Multi-entity reporting
- [ ] Advanced security settings
- [ ] Service-level agreements
- [ ] Enterprise onboarding
- [ ] Compliance documentation

## Completion Criteria

Phase 16 is complete when:

- Enterprise users can manage identity centrally.
- Administrative actions are fully auditable.
- Retention and governance rules are configurable.
- Large organizations can manage multiple entities.
- Enterprise security requirements are documented and tested.

---

# Phase 17 — Mobile Applications

## Objective

Provide native-quality mobile access for operational workflows.

## Initial Mobile Priorities

- Dashboard
- Inventory lookup
- Product scanning
- Camera OCR
- Stock adjustments
- Document approval
- AI Assistant
- Notifications

## Tasks

- [ ] Define mobile architecture
- [ ] Decide native or cross-platform stack
- [ ] Mobile authentication
- [ ] Camera scanning
- [ ] Barcode scanning
- [ ] Offline support
- [ ] Push notifications
- [ ] Mobile document review
- [ ] Mobile inventory
- [ ] Mobile AI Assistant
- [ ] App Store deployment
- [ ] Google Play deployment

## Completion Criteria

Phase 17 is complete when:

- Core operational workflows work reliably on mobile.
- Camera OCR and barcode scanning are stable.
- Offline-safe workflows are defined.
- Mobile security matches the web platform.
- Apps pass store review.

---

# Phase 18 — Global Scale

## Objective

Prepare SAMZY for millions of users and organizations.

## Scope

- Performance
- Reliability
- Regional infrastructure
- Monitoring
- Disaster recovery
- Data partitioning
- Queue systems
- Search infrastructure
- Internationalization
- Support operations

## Tasks

- [ ] Performance monitoring
- [ ] Error monitoring
- [ ] Slow-query monitoring
- [ ] Database connection pooling
- [ ] Background job infrastructure
- [ ] Queue retries
- [ ] Table partitioning where needed
- [ ] Search service evaluation
- [ ] Regional deployment strategy
- [ ] Disaster recovery testing
- [ ] Backup restore testing
- [ ] Localization framework
- [ ] Multi-language support
- [ ] Multi-currency improvements
- [ ] Support tooling
- [ ] Status page

## Completion Criteria

Phase 18 is complete when:

- The platform can scale without cross-tenant risk.
- Critical systems are monitored.
- Recovery procedures are tested.
- Large datasets remain responsive.
- Localization supports multiple markets.
- Operational incidents can be managed quickly.

---

# MVP Definition

The first usable SAMZY MVP includes:

- Authentication
- Business onboarding
- Organizations
- Workspaces
- Dashboard
- Spreadsheet engine
- Products
- Inventory
- Suppliers
- OCR supplier invoices
- Basic reports
- AI Assistant foundation

The MVP does not require every advanced feature.

It must prove that businesses can:

1. Create an account.
2. Configure their business.
3. Manage operational data.
4. Upload a supplier invoice.
5. Extract and review invoice data.
6. Update products and inventory.
7. View business reports.
8. Ask AI questions about their data.

---

# Recommended Build Order

Build in this exact order:

```text
1. Foundation
2. Onboarding
3. Application shell
4. Dashboard
5. Spreadsheet engine
6. Products
7. Inventory
8. Suppliers
9. Customers
10. OCR scanners
11. Purchases and sales
12. Reports
13. AI Assistant
14. Teams
15. Billing
16. Integrations
17. Marketplace
18. Enterprise and global scale
```

Do not skip core data integrity phases to build advanced AI features earlier.

---

# Release Strategy

## Internal Alpha

Audience:

- Founder
- Development team
- Selected test businesses

Focus:

- Core workflows
- Data integrity
- Security
- Product usability
- Major bugs

---

## Private Beta

Audience:

- Small group of real businesses

Focus:

- Onboarding
- Spreadsheet usability
- OCR accuracy
- Inventory accuracy
- Reporting usefulness
- AI trust

---

## Public Beta

Audience:

- Wider business audience

Focus:

- Self-service signup
- Billing
- Support
- Performance
- Reliability
- Product education

---

## Version 1.0

Requirements:

- Stable onboarding
- Stable spreadsheet engine
- Products and inventory
- Supplier invoice OCR
- Reports
- AI Assistant
- Teams
- Billing
- Monitoring
- Backups
- Security review
- Production support process

---

# Quality Gates

A phase cannot be marked complete until it passes:

## Product

- User flow is complete.
- Primary use case works.
- Empty states exist.
- Error states exist.
- Mobile behavior is defined.

## Engineering

- TypeScript passes.
- Production build passes.
- Database migrations are committed.
- RLS policies are tested.
- Server validation is present.
- No secrets are exposed.

## Design

- Design system is followed.
- Loading states are present.
- Accessibility is reviewed.
- Responsive layout works.
- Keyboard interaction works where required.

## Data

- Organization isolation is confirmed.
- Data integrity rules are enforced.
- Important changes are auditable.
- Large lists are paginated.
- Required indexes are present.

## Deployment

- Environment variables are configured.
- Production deployment succeeds.
- Authentication redirects work.
- Error monitoring is active.
- Rollback plan is understood.

---

# Testing Strategy

Every phase should include:

- Unit tests for reusable logic
- Integration tests for database operations
- Authentication tests
- RLS security tests
- End-to-end tests for critical workflows
- Responsive testing
- Accessibility testing
- Production build verification

Critical workflows should be tested automatically before deployment.

---

# Documentation Strategy

Each major feature should include:

- Product specification
- User flow
- Database design
- Security rules
- API or server-action contract
- UI states
- Testing notes
- Operational notes

Documentation must be updated when implementation changes.

---

# Current Next Steps

The immediate priorities are:

1. Finish and save all architecture documents.
2. Verify the current signup flow.
3. Verify email confirmation.
4. Verify login.
5. Verify onboarding database creation.
6. Build the complete onboarding interface.
7. Build the protected application shell.
8. Build the first real dashboard.
9. Commit and deploy the completed foundation.
10. Begin the spreadsheet engine.

---

# Current Milestone

## Active Milestone

```text
Phase 1 and Phase 2
Foundation and Business Onboarding
```

## Immediate Feature

```text
Signup → Email confirmation → Login → Business onboarding → Dashboard
```

This flow must be fully reliable before the spreadsheet engine begins.

---

# Long-Term Mission

SAMZY will become the most intuitive AI-powered Business Operating System for businesses worldwide.

The platform should help businesses understand their data, automate repetitive work, manage daily operations, and make better decisions from one connected workspace.