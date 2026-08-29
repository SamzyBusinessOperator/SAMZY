import { notFound, redirect } from "next/navigation";

import SmartSheetGrid from "@/app/components/smart-sheet/SmartSheetGrid";
import SmartSheetFormulaBar from "@/app/components/smart-sheet/SmartSheetFormulaBar";

import type {
  SmartSheet,
  SmartSheetCellState,
  SmartSheetRow,
} from "@/app/components/smart-sheet/smart-sheet-types";

import { truncateTwo } from "@/app/components/smart-sheet/smart-sheet-types";

import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function SmartSheetPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createClient();

  // ========================================================
  // AUTHENTICATION
  // ========================================================

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // ========================================================
  // ORGANIZATION
  // ========================================================

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (membershipError || !membership) {
    throw new Error(
      membershipError?.message || "Organization membership not found.",
    );
  }

  // ========================================================
  // SMART SHEET
  // ========================================================

  const { data: sheetData, error: sheetError } = await supabase
    .from("smart_sheets")
    .select(`
      id,
      organization_id,
      sheet_type,
      supplier_id,
      purchase_id,
      title,
      document_reference,
      document_date,
      currency,
      status,
      ocr_status,
      ocr_confidence,
      source_file_url,
      transport_rate,
      subtotal,
      vat_total,
      total,
      revision_number,
      confirmed_at,
      confirmed_by,
      created_at,
      updated_at,
      last_edited_at
    `)
    .eq("id", id)
    .eq("organization_id", membership.organization_id)
    .maybeSingle();

  if (sheetError) {
    throw new Error(sheetError.message);
  }

  if (!sheetData) {
    notFound();
  }

  const sheet = sheetData as SmartSheet;

  // ========================================================
  // SMART SHEET ROWS
  // ========================================================

  const { data: rowsData, error: rowsError } = await supabase
    .from("smart_sheet_rows")
    .select("*")
    .eq("smart_sheet_id", id)
    .eq("organization_id", membership.organization_id)
    .order("row_number", {
      ascending: true,
    });

  if (rowsError) {
    throw new Error(rowsError.message);
  }

  const rows = (rowsData ?? []) as SmartSheetRow[];

  // ========================================================
  // CELL STATES
  // ========================================================

  const { data: cellStatesData, error: statesError } = await supabase
    .from("smart_sheet_cell_states")
    .select(`
      id,
      row_id,
      column_key,
      mode,
      source,
      ocr_confidence,
      previous_value,
      formula_value,
      manual_value,
      effective_value,
      is_review_required
    `)
    .eq("smart_sheet_id", id)
    .eq("organization_id", membership.organization_id);

  if (statesError) {
    throw new Error(statesError.message);
  }

  const cellStates = (cellStatesData ?? []) as SmartSheetCellState[];

  // ========================================================
  // DERIVED DISPLAY VALUES
  // ========================================================

  const reviewCount = cellStates.filter(
    (state) => state.is_review_required,
  ).length;

  const ocrConfidence = formatConfidence(sheet.ocr_confidence);

  // ========================================================
  // FULL-SCREEN SMART SHEET WORKSPACE
  // ========================================================

  return (
    <main
      style={{
        height: "100vh",
        width: "100%",
        overflow: "hidden",
        background: "#ffffff",
        color: "#111827",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ====================================================
          TOP WORKSPACE HEADER
      ==================================================== */}

      <header
        style={{
          flex: "0 0 auto",
          background: "#ffffff",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        {/* Breadcrumb row */}

        <div
          style={{
            minHeight: "48px",
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            borderBottom: "1px solid #eef0f3",
            fontSize: "13px",
            color: "#667085",
          }}
        >
          <strong
            style={{
              color: "#111827",
              fontWeight: 700,
            }}
          >
            Smart Sheet
          </strong>

          <Chevron />

          <span>Purchases</span>

          <Chevron />

          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {sheet.document_reference || sheet.title}
          </span>
        </div>

        {/* Invoice information row */}

        <div
          style={{
            padding: "16px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "24px",
          }}
        >
          {/* Left */}

          <div
            style={{
              minWidth: 0,
              flex: "1 1 auto",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                minWidth: 0,
              }}
            >
              <h1
                style={{
                  margin: 0,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontSize: "18px",
                  lineHeight: 1.3,
                  fontWeight: 750,
                  letterSpacing: "-0.015em",
                  color: "#111827",
                }}
              >
                {sheet.title}
              </h1>

              <span
                aria-hidden="true"
                style={{
                  flex: "0 0 auto",
                  color: "#667085",
                  fontSize: "14px",
                }}
              >
                ✎
              </span>
            </div>

            <div
              style={{
                marginTop: "10px",
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "18px",
                fontSize: "12px",
                color: "#667085",
              }}
            >
              <MetaItem
                label="Reference"
                value={sheet.document_reference || "—"}
              />

              <MetaItem
                label="Date"
                value={formatDate(sheet.document_date)}
              />

              <StatusBadge status={sheet.status} />

              {sheet.ocr_status !== "manual" ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "3px 8px",
                    borderRadius: "999px",
                    background: "#ecfdf3",
                    color: "#067647",
                    fontWeight: 650,
                  }}
                >
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "999px",
                      background: "#12b76a",
                    }}
                  />

                  {formatStatus(sheet.ocr_status)}
                </span>
              ) : null}
            </div>
          </div>

          {/* Right */}

          <div
            style={{
              flex: "0 0 auto",
              display: "flex",
              alignItems: "stretch",
              gap: "10px",
            }}
          >
            <HeaderMetric
              label="OCR Confidence"
              value={ocrConfidence}
              accent="#067647"
            />

            <HeaderMetric
              label="Items"
              value={String(rows.length)}
            />

            <HeaderMetric
              label="Review"
              value={String(reviewCount)}
              accent={reviewCount > 0 ? "#d97706" : "#667085"}
            />

            <HeaderMetric
              label="Total"
              value={formatMoney(sheet.total, sheet.currency)}
              strong
            />

            <button type="button" style={secondaryButtonStyle}>
              Actions
              <span
                aria-hidden="true"
                style={{
                  fontSize: "10px",
                  marginLeft: "2px",
                }}
              >
                ▼
              </span>
            </button>

            <button type="button" style={secondaryButtonStyle}>
              Save Draft
            </button>

            <button type="button" style={primaryButtonStyle}>
              Confirm Purchase
            </button>
          </div>
        </div>
      </header>

      {/* ====================================================
          DOCUMENT NAVIGATION
      ==================================================== */}

      <nav
        style={{
          flex: "0 0 auto",
          minHeight: "48px",
          padding: "0 18px",
          display: "flex",
          alignItems: "stretch",
          gap: "6px",
          background: "#ffffff",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <DocumentTab label="▦ Smart Sheet" active />
        <DocumentTab label="Products" />
        <DocumentTab label="Summary" />
        <DocumentTab label="History" />
        <DocumentTab label="Attachments" badge="0" />
      </nav>

      {/* ====================================================
          SPREADSHEET TOOLBAR
      ==================================================== */}

      <div
        style={{
          flex: "0 0 auto",
          minHeight: "52px",
          padding: "8px 16px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          overflowX: "auto",
          background: "#ffffff",
          borderBottom: "1px solid #e5e7eb",
          whiteSpace: "nowrap",
        }}
      >
        <ToolbarButton label="↶ Undo" />
        <ToolbarButton label="↷ Redo" muted />

        <ToolbarDivider />

        <ToolbarButton label="Formatting⌄" wide />
        <ToolbarButton label="Inter⌄" wide />
        <ToolbarButton label="11⌄" />

        <ToolbarButton label="B" strong />
        <ToolbarButton label="I" italic />
        <ToolbarButton label="U" underline />

        <ToolbarDivider />

        <ToolbarButton label="☷⌄" />
        <ToolbarButton label="≡⌄" />
        <ToolbarButton label="%⌄" />

        <ToolbarDivider />

        <ToolbarButton label="Freeze" />
        <ToolbarButton label="Filter" />
        <ToolbarButton label="Sort" />
        <ToolbarButton label="Columns" />
        <ToolbarButton label="ƒx Formulas" />
        <ToolbarButton label="✦ AI Assist" accent />

        <ToolbarButton label="•••" />
      </div>

      {/* ====================================================
          FORMULA / VALUE BAR
      ==================================================== */}

      <SmartSheetFormulaBar
        sheetId={sheet.id}
      />

      {/* ====================================================
          GRID WORKSPACE
      ==================================================== */}

      <section
        style={{
          minHeight: 0,
          flex: "1 1 auto",
          overflow: "auto",
          background: "#f8f9fb",
        }}
      >
        <div
          style={{
            minWidth: "100%",
            background: "#ffffff",
          }}
        >
          <SmartSheetGrid
            sheet={sheet}
            rows={rows}
            cellStates={cellStates}
          />
        </div>
      </section>

      {/* ====================================================
          BOTTOM STATUS / SHEET BAR
      ==================================================== */}

      <footer
        style={{
          flex: "0 0 auto",
          minHeight: "46px",
          padding: "0 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          background: "#ffffff",
          borderTop: "1px solid #e5e7eb",
          fontSize: "11px",
          color: "#667085",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <button
            type="button"
            style={{
              height: "30px",
              padding: "0 10px",
              border: "none",
              background: "transparent",
              color: "#475467",
              fontSize: "12px",
              cursor: "default",
            }}
          >
            ＋ New Sheet
          </button>

          <div
            style={{
              height: "30px",
              padding: "0 14px",
              display: "flex",
              alignItems: "center",
              border: "1px solid #d0d5dd",
              borderRadius: "6px",
              background: "#ffffff",
              color: "#101828",
              fontWeight: 650,
              boxShadow: "0 1px 2px rgba(16, 24, 40, 0.04)",
            }}
          >
            {sheet.document_reference || "Current Sheet"}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "22px",
            whiteSpace: "nowrap",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
            }}
          >
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "999px",
                background: "#12b76a",
              }}
            />

            Auto calculations
          </span>

          <span>
            {cellStates.length} tracked cell state
            {cellStates.length === 1 ? "" : "s"}
          </span>

          <span>Last saved: {formatTime(sheet.last_edited_at)}</span>
        </div>
      </footer>
    </main>
  );
}

// ==========================================================
// HEADER COMPONENTS
// ==========================================================

function MetaItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <span>
      <span
        style={{
          color: "#98a2b3",
        }}
      >
        {label}:{" "}
      </span>

      <span
        style={{
          color: "#475467",
          fontWeight: 600,
        }}
      >
        {value}
      </span>
    </span>
  );
}

function HeaderMetric({
  label,
  value,
  accent,
  strong = false,
}: {
  label: string;
  value: string;
  accent?: string;
  strong?: boolean;
}) {
  return (
    <div
      style={{
        minWidth: strong ? "126px" : "92px",
        height: "58px",
        padding: "8px 12px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        border: "1px solid #e4e7ec",
        borderRadius: "8px",
        background: "#ffffff",
      }}
    >
      <span
        style={{
          marginBottom: "4px",
          fontSize: "10px",
          color: "#667085",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>

      <strong
        style={{
          fontSize: strong ? "15px" : "14px",
          lineHeight: 1.1,
          fontWeight: strong ? 750 : 700,
          color: accent || "#101828",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: SmartSheet["status"];
}) {
  const styles = getStatusStyles(status);

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 8px",
        borderRadius: "999px",
        background: styles.background,
        color: styles.color,
        fontSize: "11px",
        fontWeight: 700,
        textTransform: "capitalize",
      }}
    >
      {status}
    </span>
  );
}

// ==========================================================
// DOCUMENT TABS
// ==========================================================

function DocumentTab({
  label,
  active = false,
  badge,
}: {
  label: string;
  active?: boolean;
  badge?: string;
}) {
  return (
    <div
      style={{
        position: "relative",
        minHeight: "48px",
        padding: "0 14px",
        display: "flex",
        alignItems: "center",
        gap: "7px",
        color: active ? "#101828" : "#475467",
        fontSize: "12px",
        fontWeight: active ? 650 : 500,
        background: active ? "#f8f9fb" : "transparent",
      }}
    >
      <span>{label}</span>

      {badge ? (
        <span
          style={{
            minWidth: "18px",
            height: "18px",
            padding: "0 5px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "999px",
            background: "#f2f4f7",
            color: "#667085",
            fontSize: "10px",
          }}
        >
          {badge}
        </span>
      ) : null}

      {active ? (
        <span
          style={{
            position: "absolute",
            left: "8px",
            right: "8px",
            bottom: 0,
            height: "2px",
            borderRadius: "999px 999px 0 0",
            background: "#101828",
          }}
        />
      ) : null}
    </div>
  );
}

// ==========================================================
// TOOLBAR
// ==========================================================

function ToolbarButton({
  label,
  muted = false,
  wide = false,
  strong = false,
  italic = false,
  underline = false,
  accent = false,
}: {
  label: string;
  muted?: boolean;
  wide?: boolean;
  strong?: boolean;
  italic?: boolean;
  underline?: boolean;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      style={{
        flex: "0 0 auto",
        height: "32px",
        minWidth: wide ? "86px" : "auto",
        padding: "0 10px",
        border: "1px solid #e4e7ec",
        borderRadius: "6px",
        background: "#ffffff",
        color: muted ? "#98a2b3" : accent ? "#6941c6" : "#344054",
        fontSize: "11px",
        fontWeight: strong ? 750 : 550,
        fontStyle: italic ? "italic" : "normal",
        textDecoration: underline ? "underline" : "none",
        cursor: "default",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

function ToolbarDivider() {
  return (
    <div
      aria-hidden="true"
      style={{
        flex: "0 0 auto",
        width: "1px",
        height: "24px",
        background: "#e4e7ec",
        margin: "0 2px",
      }}
    />
  );
}

// ==========================================================
// LEGEND
// ==========================================================

function LegendDot({
  color,
  label,
}: {
  color: string;
  label: string;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: "7px",
          height: "7px",
          borderRadius: "999px",
          background: color,
        }}
      />

      {label}
    </span>
  );
}

// ==========================================================
// SMALL UI
// ==========================================================

function Chevron() {
  return (
    <span
      aria-hidden="true"
      style={{
        color: "#98a2b3",
        fontSize: "15px",
      }}
    >
      ›
    </span>
  );
}

const secondaryButtonStyle = {
  height: "38px",
  padding: "0 14px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "7px",
  border: "1px solid #d0d5dd",
  borderRadius: "7px",
  background: "#ffffff",
  color: "#344054",
  fontSize: "11px",
  fontWeight: 650,
  whiteSpace: "nowrap",
  cursor: "default",
} as const;

const primaryButtonStyle = {
  height: "38px",
  padding: "0 16px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid #101828",
  borderRadius: "7px",
  background: "#101828",
  color: "#ffffff",
  fontSize: "11px",
  fontWeight: 650,
  whiteSpace: "nowrap",
  cursor: "default",
  boxShadow: "0 1px 2px rgba(16, 24, 40, 0.12)",
} as const;

// ==========================================================
// STATUS HELPERS
// ==========================================================

function getStatusStyles(status: SmartSheet["status"]) {
  switch (status) {
    case "draft":
      return {
        background: "#fff7ed",
        color: "#c2410c",
      };

    case "processing":
      return {
        background: "#eff6ff",
        color: "#2563eb",
      };

    case "confirmed":
      return {
        background: "#ecfdf5",
        color: "#047857",
      };

    case "cancelled":
      return {
        background: "#f3f4f6",
        color: "#6b7280",
      };

    default:
      return {
        background: "#f3f4f6",
        color: "#6b7280",
      };
  }
}

// ==========================================================
// FORMAT HELPERS
// ==========================================================

function formatMoney(
  value: unknown,
  currency: string,
): string {
  const prefix = currency === "EUR" ? "€" : `${currency} `;

  return `${prefix}${truncateTwo(value)}`;
}

function formatStatus(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatConfidence(value: unknown) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  const percentage = number <= 1 ? number * 100 : number;

  return `${truncateTwo(percentage)}%`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}