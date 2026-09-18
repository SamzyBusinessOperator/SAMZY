import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function formatSheetType(value: string | null) {
  if (!value) return "Smart Sheet";

  return value
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatUpdatedAt(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function statusLabel(value: string | null) {
  if (!value) return "Unknown";

  return value
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function statusClasses(value: string | null) {
  const status = value?.toLowerCase();

  if (status === "active") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "draft") {
    return "bg-violet-50 text-violet-700";
  }

  if (status === "archived") {
    return "bg-orange-50 text-orange-700";
  }

  return "bg-slate-100 text-slate-600";
}

type SmartSheetsPageProps = {
  searchParams: Promise<{
    search?: string;
    status?: string;
  }>;
};

export default async function SmartSheetsPage({
  searchParams,
}: SmartSheetsPageProps) {
  const filters = await searchParams;
  const search = filters.search?.trim().toLowerCase() ?? "";

  const allowedStatuses = new Set(["active", "draft", "archived"]);
  const requestedStatus = filters.status?.trim().toLowerCase() ?? "";
  const statusFilter = allowedStatuses.has(requestedStatus)
    ? requestedStatus
    : "";

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
  // SMART SHEETS
  // ========================================================

  const { data: sheets, error: sheetsError } = await supabase
    .from("smart_sheets")
    .select(`
      id,
      title,
      document_reference,
      sheet_type,
      status,
      updated_at
    `)
    .eq("organization_id", membership.organization_id)
    .order("updated_at", { ascending: false });

  if (sheetsError) {
    throw new Error(sheetsError.message);
  }

  const smartSheets = sheets ?? [];

  const visibleSheets = smartSheets.filter((sheet) => {
    const reference = sheet.document_reference?.toLowerCase() ?? "";
    const title = sheet.title?.toLowerCase() ?? "";
    const sheetStatus = sheet.status?.toLowerCase() ?? "";

    const matchesSearch =
      !search || reference.includes(search) || title.includes(search);

    const matchesStatus =
      !statusFilter || sheetStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalSheets = smartSheets.length;
  const activeSheets = smartSheets.filter(
    (sheet) => sheet.status?.toLowerCase() === "active",
  ).length;
  const draftSheets = smartSheets.filter(
    (sheet) => sheet.status?.toLowerCase() === "draft",
  ).length;
  const archivedSheets = smartSheets.filter(
    (sheet) => sheet.status?.toLowerCase() === "archived",
  ).length;

  return (
    <main className="min-h-full">
      <div className="w-full">
        {/* ==================================================
            PAGE HEADER
        ================================================== */}

        <div className="mb-8 flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl text-blue-600">
              ▦
            </div>

            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                Smart Sheets
              </h1>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                Organize your data, track information and automate your business
                processes with smart sheets.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            + New Smart Sheet
          </button>
        </div>

        {/* ==================================================
            SUMMARY CARDS
        ================================================== */}

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl text-blue-600">
                ▤
              </div>

              <div>
                <div className="text-2xl font-semibold text-slate-950">
                  {totalSheets}
                </div>
                <div className="mt-1 text-sm font-medium text-slate-600">
                  Total Sheets
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  Your created smart sheets
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-xl text-emerald-600">
                ⚡
              </div>

              <div>
                <div className="text-2xl font-semibold text-slate-950">
                  {activeSheets}
                </div>
                <div className="mt-1 text-sm font-medium text-slate-600">
                  Active
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  Currently in use
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-xl text-violet-600">
                ◷
              </div>

              <div>
                <div className="text-2xl font-semibold text-slate-950">
                  {draftSheets}
                </div>
                <div className="mt-1 text-sm font-medium text-slate-600">
                  Draft
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  Not yet finalized
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-xl text-orange-600">
                ▣
              </div>

              <div>
                <div className="text-2xl font-semibold text-slate-950">
                  {archivedSheets}
                </div>
                <div className="mt-1 text-sm font-medium text-slate-600">
                  Archived
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  No longer in use
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================
            SMART SHEETS DIRECTORY
        ================================================== */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-5 border-b border-slate-200 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Your Smart Sheets
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Manage and access all your smart sheets in one place.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <form
                action="/app/smart-sheets"
                method="get"
                className="flex h-11 w-72 items-center rounded-xl border border-slate-200 bg-white px-4 transition focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100"
              >
                {statusFilter && (
                  <input
                    type="hidden"
                    name="status"
                    value={statusFilter}
                  />
                )}

                <span className="mr-3 text-sm text-slate-400">⌕</span>

                <input
                  type="search"
                  name="search"
                  defaultValue={filters.search ?? ""}
                  placeholder="Search sheets..."
                  aria-label="Search Smart Sheets"
                  className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                />
              </form>

              <form
                action="/app/smart-sheets"
                method="get"
                className="flex items-center gap-2"
              >
                {filters.search && (
                  <input
                    type="hidden"
                    name="search"
                    value={filters.search}
                  />
                )}

                <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
                  <span className="text-sm text-slate-500">≡</span>

                  <select
                    name="status"
                    defaultValue={statusFilter}
                    aria-label="Filter Smart Sheets by status"
                    className="bg-transparent text-sm font-medium text-slate-600 outline-none"
                  >
                    <option value="">All</option>
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Apply
                </button>
              </form>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/80">
                <tr className="border-b border-slate-200">
                  <th className="w-[26%] px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Name
                  </th>

                  <th className="w-[28%] px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Description
                  </th>

                  <th className="w-[14%] px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Type
                  </th>

                  <th className="w-[15%] px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Last Updated
                  </th>

                  <th className="w-[8%] px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>

                  <th className="w-[9%] px-6 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {visibleSheets.map((sheet, index) => (
                  <tr
                    key={sheet.id}
                    className="border-b border-slate-100 transition last:border-b-0 hover:bg-slate-50/70"
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg ${
                            index % 2 === 0
                              ? "bg-blue-50 text-blue-600"
                              : "bg-violet-50 text-violet-600"
                          }`}
                        >
                          ▤
                        </div>

                        <div>
                          <Link
                            href={`/app/smart-sheets/${sheet.id}`}
                            className="font-semibold text-slate-950 transition hover:text-blue-600"
                          >
                            {sheet.document_reference ||
                              sheet.title ||
                              "Untitled Smart Sheet"}
                          </Link>

                          <div className="mt-1 text-sm text-slate-500">
                            {sheet.title || "Untitled Smart Sheet"}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      <div className="max-w-[260px] text-sm leading-6 text-slate-600">
                        {sheet.sheet_type === "supplier_invoice"
                          ? "Supplier invoice processing and business data management."
                          : "Business data tracking and management."}
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                        {formatSheetType(sheet.sheet_type)}
                      </span>
                    </td>

                    <td className="px-6 py-5 text-sm leading-6 text-slate-600">
                      {formatUpdatedAt(sheet.updated_at)}
                    </td>

                    <td className="px-6 py-5">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(
                          sheet.status,
                        )}`}
                      >
                        {statusLabel(sheet.status)}
                      </span>
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/app/smart-sheets/${sheet.id}`}
                          aria-label={`Open ${
                            sheet.document_reference || sheet.title || "Smart Sheet"
                          }`}
                          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-sm text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                        >
                          ◉
                        </Link>

                        <Link
                          href={`/app/smart-sheets/${sheet.id}`}
                          aria-label={`Edit ${
                            sheet.document_reference || sheet.title || "Smart Sheet"
                          }`}
                          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-sm text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                        >
                          ✎
                        </Link>

                        <button
                          type="button"
                          aria-label="More actions"
                          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-sm text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                        >
                          •••
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {visibleSheets.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-16 text-center text-sm text-slate-500"
                    >
                      No Smart Sheets found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
