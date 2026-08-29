import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Banknote,
  CheckCircle2,
  Clock3,
  Plus,
  ReceiptText,
  ShoppingCart,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";

type SaleRow = {
  id: string;
  sale_number: string;
  customer_id: string | null;
  status: string;
  sale_date: string;
  payment_method: string | null;
  currency: string;
  subtotal: number;
  discount_total: number;
  vat_total: number;
  total: number;
  completed_at: string | null;
  created_at: string;
};

export default async function SalesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    redirect("/onboarding");
  }

  const organizationId = membership.organization_id;

  const { data: sales, error } = await supabase
    .from("sales")
    .select(
      `
        id,
        sale_number,
        customer_id,
        status,
        sale_date,
        payment_method,
        currency,
        subtotal,
        discount_total,
        vat_total,
        total,
        completed_at,
        created_at
      `,
    )
    .eq("organization_id", organizationId)
    .order("sale_date", { ascending: false })
    .order("created_at", { ascending: false });

  const safeSales = (sales ?? []) as SaleRow[];

  const totalSales = safeSales.length;

  const draftSales = safeSales.filter(
    (sale) => sale.status === "draft",
  ).length;

  const completedSales = safeSales.filter(
    (sale) => sale.status === "completed",
  ).length;

  const revenue = safeSales
    .filter((sale) => sale.status === "completed")
    .reduce(
      (sum, sale) => sum + Number(sale.total || 0),
      0,
    );

  return (
    <div className="mx-auto max-w-[1500px]">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#101828]">
            Sales
          </h1>

          <p className="mt-2 text-sm text-[#667085]">
            Record sales, track payments and connect outgoing
            transactions with inventory.
          </p>
        </div>

        <Link
          href="/app/sales/new"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#101828] px-5 text-sm font-semibold text-white transition hover:bg-black"
        >
          <Plus size={16} />
          New sale
        </Link>
      </div>

      {error ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Unable to load sales: {error.message}
        </div>
      ) : null}

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={ShoppingCart}
          label="Sales"
          value={String(totalSales)}
          note="Total sale records"
        />

        <MetricCard
          icon={Banknote}
          label="Revenue"
          value={formatCurrency(revenue, "EUR")}
          note="Completed sales only"
        />

        <MetricCard
          icon={Clock3}
          label="Draft"
          value={String(draftSales)}
          note="Sales waiting for completion"
          warning={draftSales > 0}
        />

        <MetricCard
          icon={CheckCircle2}
          label="Completed"
          value={String(completedSales)}
          note="Completed transactions"
        />
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-[#eaecf0] bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-[#eaecf0] px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-semibold text-[#101828]">
              Sales history
            </h2>

            <p className="mt-1 text-sm text-[#667085]">
              Track transaction value, payment method and sale
              status.
            </p>
          </div>
        </div>

        {safeSales.length === 0 ? (
          <EmptySales />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] border-collapse">
              <thead>
                <tr className="border-b border-[#eaecf0] bg-[#fcfcfd] text-left">
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                    Sale
                  </th>

                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                    Date
                  </th>

                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                    Customer
                  </th>

                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                    Payment
                  </th>

                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                    Total
                  </th>

                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                    Status
                  </th>

                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[#667085]">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {safeSales.map((sale) => (
                  <tr
                    key={sale.id}
                    className="border-b border-[#f2f4f7] last:border-0"
                  >
                    <td className="px-6 py-4">
                      <Link
                        href={`/app/sales/${sale.id}`}
                        className="text-sm font-semibold text-[#101828] hover:underline"
                      >
                        {sale.sale_number}
                      </Link>

                      <p className="mt-1 text-xs text-[#98a2b3]">
                        {sale.status === "completed"
                          ? "Completed transaction"
                          : sale.status === "cancelled"
                            ? "Cancelled transaction"
                            : "Draft transaction"}
                      </p>
                    </td>

                    <td className="px-6 py-4 text-sm text-[#667085]">
                      {formatDate(sale.sale_date)}
                    </td>

                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-[#344054]">
                        {sale.customer_id
                          ? "Customer"
                          : "Walk-in"}
                      </p>
                    </td>

                    <td className="px-6 py-4 text-sm text-[#667085]">
                      {formatPaymentMethod(
                        sale.payment_method,
                      )}
                    </td>

                    <td className="px-6 py-4 text-sm font-semibold text-[#101828]">
                      {formatCurrency(
                        Number(sale.total || 0),
                        sale.currency,
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <SaleStatus status={sale.status} />
                    </td>

                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/app/sales/${sale.id}`}
                        className="text-sm font-semibold text-[#344054] hover:text-[#101828]"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  note,
  warning = false,
}: {
  icon: React.ComponentType<{
    size?: number;
  }>;
  label: string;
  value: string;
  note: string;
  warning?: boolean;
}) {
  return (
    <article className="rounded-2xl border border-[#eaecf0] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-[#667085]">
          {label}
        </p>

        <div
          className={[
            "flex h-9 w-9 items-center justify-center rounded-xl",
            warning
              ? "bg-orange-50 text-orange-700"
              : "bg-[#f2f4f7] text-[#475467]",
          ].join(" ")}
        >
          <Icon size={17} />
        </div>
      </div>

      <p
        className={[
          "mt-4 text-2xl font-semibold",
          warning
            ? "text-orange-700"
            : "text-[#101828]",
        ].join(" ")}
      >
        {value}
      </p>

      <p className="mt-2 text-xs text-[#98a2b3]">
        {note}
      </p>
    </article>
  );
}

function SaleStatus({
  status,
}: {
  status: string;
}) {
  if (status === "completed") {
    return (
      <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
        Completed
      </span>
    );
  }

  if (status === "cancelled") {
    return (
      <span className="inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
        Cancelled
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-[#f2f4f7] px-3 py-1 text-xs font-semibold text-[#475467]">
      Draft
    </span>
  );
}

function EmptySales() {
  return (
    <div className="px-6 py-16 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f2f4f7] text-[#667085]">
        <ReceiptText size={21} />
      </div>

      <p className="mt-4 font-semibold text-[#101828]">
        No sales yet
      </p>

      <p className="mx-auto mt-2 max-w-md text-sm text-[#667085]">
        Create your first sale to begin tracking
        revenue, outgoing inventory and product
        performance.
      </p>

      <Link
        href="/app/sales/new"
        className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#101828] px-5 text-sm font-semibold text-white"
      >
        <Plus size={15} />
        New sale
      </Link>
    </div>
  );
}

function formatCurrency(
  value: number,
  currency: string,
) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: currency || "EUR",
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatPaymentMethod(
  value: string | null,
) {
  if (!value) {
    return "—";
  }

  const labels: Record<string, string> = {
    cash: "Cash",
    card: "Card",
    mb_way: "MB Way",
    bank_transfer: "Bank transfer",
    other: "Other",
  };

  return labels[value] || value;
}