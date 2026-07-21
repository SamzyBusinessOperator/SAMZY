# SAMZY Design System

## Purpose

The SAMZY Design System defines the visual language, interaction rules, layout standards, and reusable interface patterns used throughout the platform.

Its goals are to make SAMZY:

- Clear
- Fast
- Premium
- Consistent
- Accessible
- Scalable
- Easy to use
- Suitable for complex business operations

Every new page, component, feature, and workflow must follow this document.

---

# Design Vision

SAMZY should feel like a combination of:

- Apple
- Notion
- Linear
- Stripe
- Google Sheets

The interface should feel powerful without appearing complicated.

The product must be professional enough for businesses while remaining simple enough for first-time software users.

---

# Core Design Principles

1. Clarity before decoration
2. Simplicity before complexity
3. Consistency across every module
4. Fast interaction
5. Strong visual hierarchy
6. Minimal cognitive load
7. Responsive by default
8. Accessible by default
9. Reusable components
10. Business data must remain easy to scan

---

# Brand Personality

SAMZY should feel:

- Intelligent
- Modern
- Trustworthy
- Calm
- Premium
- Efficient
- Helpful
- Professional
- Approachable

SAMZY should never feel:

- Overly playful
- Visually noisy
- Complicated
- Cheap
- Aggressive
- Outdated
- Cluttered

---

# Brand Colors

## Primary Brand Color

SAMZY Orange

```text
#FF6B00
```

Use orange for:

- Logo
- Brand highlights
- Selected navigation indicators
- Active states
- Important visual accents
- Progress indicators

Do not use orange for every button or every interface element.

---

## Primary Action Color

Dark Navy

```text
#0F172A
```

Use dark navy for:

- Primary buttons
- Important calls to action
- Main headings
- Strong interface contrast
- Active controls

---

## Primary Action Hover

```text
#1E293B
```

---

## Primary Background

```text
#F8FAFC
```

Use for:

- Main application background
- Dashboard page background
- Secondary application surfaces

---

## Card Background

```text
#FFFFFF
```

---

## Primary Text

```text
#0F172A
```

---

## Secondary Text

```text
#475569
```

---

## Muted Text

```text
#94A3B8
```

---

## Border Color

```text
#E2E8F0
```

---

## Subtle Border

```text
#F1F5F9
```

---

# Semantic Colors

## Success

Primary:

```text
#16A34A
```

Background:

```text
#F0FDF4
```

Border:

```text
#BBF7D0
```

Use for:

- Completed actions
- Healthy inventory
- Positive financial changes
- Successful imports
- Approved documents

---

## Warning

Primary:

```text
#D97706
```

Background:

```text
#FFFBEB
```

Border:

```text
#FDE68A
```

Use for:

- Low stock
- Pending reviews
- Unusual values
- Incomplete setup
- Attention-required states

---

## Danger

Primary:

```text
#DC2626
```

Background:

```text
#FEF2F2
```

Border:

```text
#FECACA
```

Use for:

- Failed actions
- Destructive actions
- Overdue payments
- Critical stock problems
- Invalid data

---

## Information

Primary:

```text
#2563EB
```

Background:

```text
#EFF6FF
```

Border:

```text
#BFDBFE
```

Use for:

- Informational banners
- Help content
- System notices
- Neutral progress states

---

# Color Usage Rules

1. Use the minimum number of colors necessary.
2. Never rely on color alone to communicate meaning.
3. Always pair semantic colors with text or icons.
4. Maintain strong contrast between text and backgrounds.
5. Use orange selectively.
6. Use navy for the strongest actions.
7. Use neutral backgrounds for data-heavy screens.
8. Avoid gradients unless approved for a specific marketing use.
9. Avoid neon colors.
10. Avoid excessive color inside tables.

---

# Typography

## Font Family

Use a modern system sans-serif stack.

```css
font-family:
  Inter,
  ui-sans-serif,
  system-ui,
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  sans-serif;
```

Inter should be used when available.

---

# Typography Scale

## Display Heading

Use for major marketing headlines.

```text
Font size: 48px to 64px
Line height: 1.05 to 1.15
Font weight: 700
```

---

## Page Heading

Use for application page titles.

```text
Font size: 28px to 36px
Line height: 1.2
Font weight: 700
```

---

## Section Heading

```text
Font size: 20px to 24px
Line height: 1.3
Font weight: 600
```

---

## Card Heading

```text
Font size: 16px to 18px
Line height: 1.4
Font weight: 600
```

---

## Body Large

```text
Font size: 16px
Line height: 1.6
Font weight: 400
```

---

## Body

```text
Font size: 14px
Line height: 1.5
Font weight: 400
```

---

## Small Text

```text
Font size: 12px
Line height: 1.4
Font weight: 400
```

---

## Label

```text
Font size: 13px
Line height: 1.4
Font weight: 500
```

---

# Typography Rules

1. Use sentence case for interface text.
2. Avoid writing complete labels in uppercase.
3. Use bold text only for hierarchy.
4. Keep headings short.
5. Keep supporting text clear and direct.
6. Avoid long paragraphs inside application screens.
7. Use tabular numbers for financial and inventory data.
8. Right-align numeric table values.
9. Use muted text for descriptions.
10. Do not use more than three font weights on one screen.

---

# Spacing System

SAMZY uses a 4-pixel spacing system.

```text
4px
8px
12px
16px
20px
24px
32px
40px
48px
64px
80px
```

Recommended Tailwind equivalents:

```text
1
2
3
4
5
6
8
10
12
16
20
```

---

# Spacing Rules

1. Use 24px to 32px between major page sections.
2. Use 16px to 24px inside cards.
3. Use 12px to 16px between related form fields.
4. Use 8px between icons and labels.
5. Use 4px between labels and supporting text.
6. Avoid arbitrary spacing values.
7. Maintain consistent vertical rhythm.
8. Use larger spacing to separate unrelated content.
9. Reduce spacing carefully on mobile.
10. Do not crowd data-heavy screens unnecessarily.

---

# Border Radius

## Small Radius

```text
6px
```

Use for:

- Small badges
- Compact controls
- Table tags

---

## Standard Radius

```text
10px
```

Use for:

- Buttons
- Inputs
- Select fields
- Search boxes

---

## Card Radius

```text
16px
```

Use for:

- Dashboard cards
- Forms
- Panels
- Modals

---

## Large Radius

```text
24px
```

Use for:

- Marketing sections
- Empty states
- Large feature panels

---

# Shadows

Use shadows sparingly.

## Small Shadow

```css
box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
```

Use for:

- Inputs
- Dropdowns
- Compact cards

---

## Standard Shadow

```css
box-shadow:
  0 1px 3px rgba(15, 23, 42, 0.08),
  0 4px 12px rgba(15, 23, 42, 0.04);
```

Use for:

- Dashboard cards
- Popovers
- Main panels

---

## Elevated Shadow

```css
box-shadow:
  0 10px 30px rgba(15, 23, 42, 0.12);
```

Use for:

- Modals
- Command palettes
- Important floating panels

---

# Application Layout

## Desktop Application Shell

The main application layout contains:

- Left sidebar
- Top navigation
- Main content area

Recommended dimensions:

```text
Sidebar width: 240px
Collapsed sidebar width: 72px
Top bar height: 64px
Main content padding: 24px to 32px
```

---

## Sidebar Structure

The sidebar may contain:

- SAMZY logo
- Workspace selector
- Main navigation
- AI Assistant shortcut
- Settings
- User profile

Recommended navigation order:

```text
Dashboard
Spreadsheets
Products
Inventory
Suppliers
Customers
Scanners
Reports
AI Assistant
Settings
```

---

## Sidebar Rules

1. Use simple line icons.
2. Use one icon per navigation item.
3. Show the active state clearly.
4. Avoid excessive separators.
5. Keep labels concise.
6. Allow collapse on smaller desktop screens.
7. Use tooltips in collapsed mode.
8. Keep the workspace selector near the top.
9. Keep settings near the bottom.
10. Maintain keyboard accessibility.

---

## Top Navigation

The top bar may contain:

- Page title
- Breadcrumbs
- Search
- Notifications
- Quick actions
- User controls

The top bar should remain visually light.

---

# Page Layout

Each application page should follow this structure:

```text
Page header
Primary actions
Optional filters
Main content
Supporting content
```

Example:

```text
Products
Manage your product catalog

[Search] [Filter] [Add product]

Product table
```

---

# Content Width

## Standard Dashboard Pages

```text
Maximum width: 1440px
```

## Form Pages

```text
Maximum width: 900px
```

## Reading Pages

```text
Maximum width: 760px
```

## Spreadsheet Pages

Use the full available width and height.

---

# Responsive Breakpoints

Use Tailwind's default breakpoint system unless the feature requires otherwise.

```text
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1536px
```

---

# Mobile Layout

On mobile:

- Sidebar becomes a drawer.
- Main actions remain easy to reach.
- Tables may become cards or horizontally scroll.
- Filters move into sheets or drawers.
- Inputs use full width.
- Buttons must remain thumb-friendly.
- Important actions may use sticky bottom bars.
- Navigation labels must remain clear.
- Complex spreadsheet tools may collapse into menus.

Minimum interactive target:

```text
44px × 44px
```

---

# Buttons

## Primary Button

Use for the most important action on a screen.

Style:

```text
Background: dark navy
Text: white
Radius: 10px
Height: 40px to 44px
Horizontal padding: 16px
Font weight: 600
```

Examples:

```text
Add product
Create spreadsheet
Save changes
Approve document
```

---

## Secondary Button

Style:

```text
Background: white
Text: dark navy
Border: neutral
```

Use for secondary actions.

---

## Tertiary Button

Text-only or very subtle background.

Use for:

- Cancel
- View details
- Less important actions

---

## Danger Button

Style:

```text
Background: danger red
Text: white
```

Use only for destructive actions.

---

## Icon Button

Use when the action is obvious from the icon.

Requirements:

- Minimum 40px interactive area
- Tooltip
- Accessible label
- Clear hover state

---

# Button States

Every button must support:

- Default
- Hover
- Active
- Focus
- Disabled
- Loading

Loading buttons should preserve their width.

Example:

```text
Saving...
Processing...
Uploading...
```

---

# Form Controls

## Input Height

```text
40px to 44px
```

## Input Style

```text
Background: white
Border: neutral
Radius: 10px
Text: primary
Placeholder: muted
```

---

## Form Field Structure

```text
Label
Input
Supporting text or error
```

---

## Input States

- Default
- Hover
- Focus
- Filled
- Disabled
- Read-only
- Error
- Success

---

## Focus State

Use a visible focus ring.

```text
2px ring
Navy or orange
Sufficient contrast
```

Never remove focus outlines without replacing them.

---

## Validation

Validation messages must:

- Explain what is wrong
- Explain how to fix it
- Appear near the affected field
- Avoid technical language

Bad:

```text
Invalid input
```

Better:

```text
Enter a valid email address.
```

---

# Select Menus

Select menus should:

- Show the selected value clearly
- Support keyboard navigation
- Include search for large lists
- Use checkmarks where useful
- Avoid excessive nesting
- Show empty states

---

# Search

Search inputs should include:

- Search icon
- Clear button
- Keyboard shortcut where useful
- Loading state
- Empty state
- Search suggestions where useful

Global search may use:

```text
Cmd + K
Ctrl + K
```

---

# Cards

Cards should contain related information.

Standard card anatomy:

```text
Header
Optional action
Main content
Optional footer
```

Card rules:

1. Use white background.
2. Use subtle border.
3. Use minimal shadow.
4. Use 16px radius.
5. Avoid placing too many cards inside cards.
6. Keep card actions predictable.
7. Maintain equal heights only when useful.
8. Avoid decorative graphics without purpose.

---

# Dashboard Cards

Dashboard cards may show:

- Revenue
- Sales
- Profit
- Inventory
- Outstanding payments
- Low-stock items
- Document status
- AI recommendations

Metric card structure:

```text
Label
Main value
Change indicator
Supporting context
```

Example:

```text
Sales today
€2,480
+12.4% from yesterday
```

---

# Tables

Tables are a central part of SAMZY.

They must be:

- Fast
- Easy to scan
- Compact
- Sortable
- Filterable
- Responsive

---

# Table Structure

A table may include:

- Select checkbox
- Primary identifier
- Supporting information
- Status
- Numeric values
- Updated date
- Row actions

---

# Table Rules

1. Left-align text.
2. Right-align numbers.
3. Use tabular numbers.
4. Keep row height consistent.
5. Use subtle row separators.
6. Use sticky headers when useful.
7. Use zebra striping only when necessary.
8. Keep action menus at the right.
9. Avoid excessive icons.
10. Support horizontal scrolling on small screens.

---

# Table Density

## Comfortable

```text
Row height: 48px to 56px
```

## Compact

```text
Row height: 36px to 44px
```

Spreadsheet tables may use denser rows.

---

# Table States

Every table must support:

- Loading
- Empty
- Error
- Filtered empty
- Pagination
- Selected rows
- Bulk actions

---

# Status Badges

Badges should be compact and easy to understand.

Examples:

```text
Active
Pending
Approved
Low stock
Overdue
Failed
Draft
```

Badge style:

```text
Small text
Rounded pill
Semantic foreground
Soft semantic background
Optional icon
```

---

# Empty States

Every empty state should include:

- Clear heading
- Short explanation
- Primary action
- Optional supporting visual

Example:

```text
No products yet

Add your first product to begin managing inventory.

[Add product]
```

Empty states should help the user move forward.

---

# Loading States

Use:

- Skeletons for page content
- Spinners for small controls
- Progress bars for uploads
- Processing states for OCR and AI

Avoid replacing an entire page with a single spinner.

---

# Error States

Error states should explain:

- What happened
- Whether data was saved
- What the user can do next

Example:

```text
We could not upload this invoice.

Your file was not saved. Check your connection and try again.
```

---

# Toast Notifications

Use toasts for temporary feedback.

Examples:

```text
Product created
Changes saved
Invoice uploaded
Member invited
```

Do not use toasts for critical information that the user must read.

---

# Modals

Use modals for:

- Confirmations
- Short forms
- Focused decisions
- Small detail views

Do not use modals for long workflows.

Modal structure:

```text
Title
Description
Content
Primary action
Secondary action
```

---

# Confirmation Dialogs

Destructive confirmation dialogs must:

- Name the affected record
- Explain the consequence
- Use a clear destructive button
- Avoid vague labels

Bad:

```text
Are you sure?
```

Better:

```text
Delete “iPhone 15 Pro”?

This product will be archived and removed from active inventory.
```

---

# Drawers and Sheets

Use side drawers for:

- Filters
- Record details
- Quick edits
- Mobile navigation
- AI Assistant panels

Use bottom sheets on mobile when appropriate.

---

# Tabs

Tabs should represent related views.

Examples:

```text
Overview
Transactions
Price history
Documents
Activity
```

Tabs should not be used as a substitute for primary navigation.

---

# Navigation

Navigation should remain predictable.

Rules:

1. Never move primary navigation without reason.
2. Use breadcrumbs for deep page structures.
3. Use clear page titles.
4. Preserve the user's workspace context.
5. Highlight the active module.
6. Avoid more than two nested navigation levels.
7. Keep mobile navigation simple.

---

# Icons

Use one consistent icon library.

Recommended:

```text
Lucide React
```

Icon rules:

- Use outlined icons by default.
- Keep stroke width consistent.
- Use 16px, 18px, 20px, or 24px sizes.
- Do not mix unrelated icon styles.
- Pair unfamiliar icons with text.
- Use color only when it communicates status.

---

# Data Visualization

Charts should help users understand business data quickly.

Supported chart types:

- Line charts
- Bar charts
- Area charts
- Donut charts
- Progress charts
- Sparklines

Avoid:

- 3D charts
- Excessive animation
- Decorative charts
- Too many colors
- Complex legends

---

# Chart Rules

1. Use clear titles.
2. Show units.
3. Use tooltips.
4. Keep labels readable.
5. Use semantic colors carefully.
6. Use comparison periods where useful.
7. Use empty states for missing data.
8. Avoid misleading scales.
9. Use orange as an accent, not the only series color.
10. Make charts accessible.

---

# Spreadsheet Design

The spreadsheet is the central workspace in SAMZY.

It should feel familiar to users of Excel and Google Sheets.

---

## Spreadsheet Layout

The spreadsheet interface may include:

- Top application bar
- File name
- Save status
- Undo and redo
- Toolbar
- Formula bar
- Column headers
- Row headers
- Cell grid
- Sheet tabs
- Status bar

---

## Spreadsheet Visual Rules

1. Use a white grid background.
2. Use subtle neutral cell borders.
3. Highlight the active cell clearly.
4. Use a stronger border for selected ranges.
5. Keep row and column headers neutral.
6. Freeze headers where useful.
7. Maintain high performance.
8. Avoid unnecessary card containers.
9. Use the full viewport.
10. Keep toolbar controls compact.

---

## Spreadsheet Cell States

- Default
- Hovered
- Active
- Selected
- Editing
- Error
- Locked
- Formula
- Referenced
- Copied

---

## Spreadsheet Interaction

The spreadsheet should support:

- Mouse selection
- Keyboard navigation
- Copy
- Paste
- Undo
- Redo
- Drag fill
- Multi-cell selection
- Column resize
- Row resize
- Context menus
- Formula editing
- Sheet switching

---

# OCR Scanner Design

OCR scanner workflows should feel simple even when processing complex documents.

Recommended flow:

```text
Upload document
Processing
Review extracted data
Resolve warnings
Approve
Save to business records
```

---

## Upload Area

The upload area should support:

- Drag and drop
- File picker
- Camera upload on mobile
- PDF
- JPG
- PNG

It should clearly show:

- Accepted formats
- Maximum file size
- Upload progress
- Error messages

---

## Processing State

Show clear stages:

```text
Uploading
Reading document
Extracting fields
Matching products
Preparing review
```

Do not show a fake fixed progress percentage unless it represents real progress.

---

## OCR Review Interface

The review screen should include:

- Original document preview
- Extracted fields
- Extracted line items
- Confidence indicators
- Warning states
- Product matches
- Approve action

Low-confidence fields should be easy to find.

---

# AI Assistant Design

The AI Assistant should feel like a business partner, not a generic chatbot.

It should support:

- Natural language questions
- Suggested prompts
- Data citations
- Action previews
- Confirmations before mutations
- Clear limitations
- Conversation history

---

## AI Assistant Layout

Possible layouts:

- Dedicated full page
- Right-side drawer
- Embedded insight card
- Contextual assistant inside modules

---

## AI Response Structure

A strong response may include:

```text
Direct answer
Supporting figures
Reasoning summary
Recommended action
Source data
```

---

## AI Safety Rules

1. Never make irreversible changes without confirmation.
2. Show the source data used.
3. Clearly distinguish facts from recommendations.
4. Show uncertainty where appropriate.
5. Protect organization data.
6. Do not expose another organization's information.
7. Allow users to review generated documents before saving.

---

# Accessibility

SAMZY should target WCAG 2.1 AA standards.

Requirements:

- Sufficient color contrast
- Keyboard navigation
- Visible focus states
- Semantic HTML
- Accessible labels
- Screen reader support
- Descriptive button text
- Accessible form errors
- Reduced-motion support
- Minimum touch target size

---

# Motion

Motion should be subtle and functional.

Recommended durations:

```text
Fast: 100ms to 150ms
Standard: 150ms to 250ms
Slow: 250ms to 400ms
```

Use motion for:

- Hover transitions
- Menu opening
- Drawer movement
- Modal appearance
- Loading progress
- State changes

Avoid:

- Large bouncing effects
- Excessive parallax
- Long animations
- Decorative motion in data-heavy screens

Respect:

```text
prefers-reduced-motion
```

---

# Writing Style

SAMZY interface copy should be:

- Direct
- Clear
- Friendly
- Professional
- Action-oriented

Use:

```text
Add product
Upload invoice
Invite team member
Save changes
```

Avoid:

```text
Proceed with adding a new product record
```

---

# Button Copy

Use verbs.

Good:

```text
Create workspace
Approve invoice
Export report
Invite member
```

Avoid vague labels:

```text
Continue
Submit
Confirm
```

Use vague labels only when the action is already completely obvious.

---

# Error Copy

Error messages should not blame the user.

Avoid:

```text
You entered invalid data.
```

Use:

```text
Enter a valid VAT number.
```

---

# Date and Number Formatting

Format values according to organization settings.

Examples for Portugal:

```text
Date: 21/07/2026
Currency: 1.250,00 €
Percentage: 23%
```

Examples for the United States:

```text
Date: 07/21/2026
Currency: $1,250.00
Percentage: 23%
```

Never hardcode one locale across the platform.

---

# Internationalization

The design system must support:

- Multiple languages
- Longer translated labels
- Right-to-left layouts in the future
- Locale-specific dates
- Locale-specific numbers
- Locale-specific currencies

Do not design components that only work with short English labels.

---

# Component Architecture

Reusable interface components should live in:

```text
components/ui
```

Application layout components should live in:

```text
components/layout
```

Feature-specific components should live inside the relevant feature folder.

Example:

```text
features/products/components/product-table.tsx
```

---

# Planned UI Components

## Core

```text
Button
IconButton
Input
Textarea
Select
Checkbox
RadioGroup
Switch
Badge
Avatar
Tooltip
Separator
Skeleton
Spinner
Progress
```

## Navigation

```text
Sidebar
Topbar
Breadcrumbs
Tabs
CommandMenu
MobileNavigation
WorkspaceSwitcher
```

## Data Display

```text
Card
MetricCard
DataTable
EmptyState
StatusBadge
ActivityFeed
DescriptionList
```

## Feedback

```text
Toast
Alert
Dialog
ConfirmationDialog
Drawer
Sheet
Popover
DropdownMenu
```

## Forms

```text
FormField
DatePicker
CurrencyInput
QuantityInput
SearchInput
FileUpload
Combobox
```

## Business Components

```text
ProductSelector
SupplierSelector
CustomerSelector
InventoryStatus
MoneyDisplay
VATDisplay
DocumentStatus
ConfidenceIndicator
```

---

# Component Rules

Every reusable component must support:

- Keyboard interaction
- Focus state
- Disabled state
- Loading state where relevant
- Error state where relevant
- Responsive behavior
- Accessible labels
- Class customization
- TypeScript types

---

# Dark Mode

Dark mode may be added later.

The initial product should prioritize a polished light theme.

All components should still avoid assumptions that make future dark mode impossible.

Use semantic design tokens instead of hardcoded colors inside every component.

---

# Design Tokens

Future CSS variables should follow this structure:

```css
:root {
  --background: #f8fafc;
  --foreground: #0f172a;

  --card: #ffffff;
  --card-foreground: #0f172a;

  --primary: #0f172a;
  --primary-foreground: #ffffff;

  --brand: #ff6b00;
  --brand-foreground: #ffffff;

  --muted: #f1f5f9;
  --muted-foreground: #64748b;

  --border: #e2e8f0;
  --input: #e2e8f0;
  --ring: #ff6b00;

  --success: #16a34a;
  --warning: #d97706;
  --danger: #dc2626;
  --info: #2563eb;

  --radius: 10px;
}
```

Components should use semantic variables rather than repeated raw color values.

---

# Quality Checklist

Before a page is complete, verify:

- Is the page purpose immediately clear?
- Is the primary action obvious?
- Is the interface visually consistent?
- Does the page work on mobile?
- Are loading states present?
- Are empty states present?
- Are error states present?
- Is keyboard navigation supported?
- Are focus states visible?
- Are destructive actions confirmed?
- Are financial values formatted correctly?
- Are tables easy to scan?
- Is organization context preserved?
- Is the interface fast?
- Does the page follow the SAMZY visual language?

---

# Design Review Process

Every new feature should pass these stages:

1. Define user objective.
2. Map the user flow.
3. Identify required states.
4. Use existing components.
5. Create missing reusable components.
6. Build responsive layout.
7. Test keyboard interaction.
8. Test loading and errors.
9. Test with realistic business data.
10. Review visual consistency.

---

# Final Design Rule

SAMZY should make complex business operations feel simple.

Every design decision must reduce confusion, improve speed, protect user data, or help businesses make better decisions.

When decoration conflicts with clarity, clarity always wins.