import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CircleDollarSign,
  Clock3,
  PackageCheck,
  Plus,
  ShoppingCart,
  Truck,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";

type PurchaseRow = {
  id: string;
  purchase_number: string;
  supplier_reference: string | null;
  status: string;
  purchase_date: string;
  expected_date: string | null;
  currency: string;
  subtotal: number;
  vat_total: number;
  total: number;
  created_at: string;
  suppliers:
    | {
        id: string;
        name: string;
      }
    | {
        id: string;
        name: string;
      }[]
    | null;
};

export default async function PurchasesPage() {
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

  const { data: purchases } = await supabase
    .from("purchases")
    .select(
      `
        id,
        purchase_number,
        supplier_reference,
        status,
        purchase_date,
        expected_date,
        currency,
        subtotal,
        vat_total,
        total,
        created_at,
        suppliers (
          id,
          name
        )
      `,
    )
    .eq("organization_id", organizationId)
    .order("purchase_date", { ascending: false })
    .order("created_at", { ascending: false });

  const safePurchases = (purchases ?? []) as PurchaseRow[];

  const totalPurchases = safePurchases.length;

  const orderedPurchases = safePurchases.filter(
    (purchase) =>
      purchase.status === "ordered" ||
      purchase.status === "partially_received",
  ).length;

  const receivedPurchases = safePurchases.filter(
    (purchase) => purchase.status === "received",
  ).length;

  const totalSpend = safePurchases
    .filter((purchase) => purchase.status !== "cancelled")
    .reduce(
      (sum, purchase) => sum + Number(purchase.total || 0),
      0,
    );

  return (
    <div className="mx-auto max-w-[1500px]">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#101828]">
            Purchases
          </h1>

          <p className="mt-2 text-sm text-[#667085]">
            Create purchase orders, track supplier deliveries and receive stock
            into inventory.
          </p>
        </div>

        <Link
          href="/app/purchases/new"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#101828] px-5 text-sm font-semibold text-white transition hover:bg-black"
        >
          <Plus size={16} />
          New purchase
        </Link>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={ShoppingCart}
          label="Purchases"
          value={String(totalPurchases)}
          note="Total purchase records"
        />

        <MetricCard
          icon={Truck}
          label="Awaiting receipt"
          value={String(orderedPurchases)}
          note="Ordered or partially received"
          warning={orderedPurchases > 0}
        />

        <MetricCard
          icon={PackageCheck}
          label="Received"
          value={String(receivedPurchases)}
          note="Fully received purchases"
        />

        <MetricCard
          icon={CircleDollarSign}
          label="Purchase value"
          value={formatCurrency(totalSpend, "EUR")}
          note="Excluding cancelled purchases"
        />
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-[#eaecf0] bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-[#eaecf0] px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-semibold text-[#101828]">
              Purchase orders
            </h2>

            <p className="mt-1 text-sm text-[#667085]">
              Track purchase status, supplier and total value.
            </p>
          </div>
        </div>

        {safePurchases.length === 0 ? (
          <EmptyPurchases />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] border-collapse">
              <thead>
                <tr className="border-b border-[#eaecf0] bg-[#fcfcfd] text-left">
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                    Purchase
                  </th>

                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                    Supplier
                  </th>

                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                    Date
                  </th>

                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                    Expected
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
                {safePurchases.map((purchase) => {
                  const supplier = Array.isArray(
                    purchase.suppliers,
                  )
                    ? purchase.suppliers[0]
                    : purchase.suppliers;

                  return (
                    <tr
                      key={purchase.id}
                      className="border-b border-[#f2f4f7] last:border-0"
                    >
                      <td className="px-6 py-4">
                        <Link
                          href={`/app/purchases/${purchase.id}`}
                          className="text-sm font-semibold text-[#101828] hover:underline"
                        >
                          {purchase.purchase_number}
                        </Link>

                        <p className="mt-1 text-xs text-[#98a2b3]">
                          {purchase.supplier_reference ||
                            "No supplier reference"}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-[#344054]">
                          {supplier?.name || "No supplier"}
                        </p>
                      </td>

                      <td className="px-6 py-4 text-sm text-[#667085]">
                        {formatDate(purchase.purchase_date)}
                      </td>

                      <td className="px-6 py-4 text-sm text-[#667085]">
                        {purchase.expected_date
                          ? formatDate(purchase.expected_date)
                          : "—"}
                      </td>

                      <td className="px-6 py-4 text-sm font-semibold text-[#101828]">
                        {formatCurrency(
                          Number(purchase.total),
                          purchase.currency,
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <PurchaseStatus
                          status={purchase.status}
                        />
                      </td>

                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/app/purchases/${purchase.id}`}
                          className="text-sm font-semibold text-[#344054] hover:text-[#101828]"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
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

function PurchaseStatus({
  status,
}: {
  status: string;
}) {
  if (status === "received") {
    return (
      <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
        Received
      </span>
    );
  }

  if (status === "partially_received") {
    return (
      <span className="inline-flex rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
        Partially received
      </span>
    );
  }

  if (status === "ordered") {
    return (
      <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
        Ordered
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

function EmptyPurchases() {
  return (
    <div className="px-6 py-16 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f2f4f7] text-[#667085]">
        <Clock3 size={21} />
      </div>

      <p className="mt-4 font-semibold text-[#101828]">
        No purchases yet
      </p>

      <p className="mt-2 text-sm text-[#667085]">
        Create your first purchase order to start tracking supplier orders and
        incoming stock.
      </p>

      <Link
        href="/app/purchases/new"
        className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#101828] px-5 text-sm font-semibold text-white"
      >
        <Plus size={15} />
        New purchase
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