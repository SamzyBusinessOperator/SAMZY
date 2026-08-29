import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Building2,
  CircleDollarSign,
  Plus,
  ShoppingCart,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";

type SupplierRow = {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  vat_number: string | null;
  city: string | null;
  country_code: string | null;
  status: string;
  created_at: string;
};

type PurchaseSummary = {
  id: string;
  supplier_id: string | null;
  total: number;
  status: string;
  purchase_date: string;
};

export default async function SuppliersPage() {
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

  const [
    { data: organization },
    { data: suppliers },
    { data: purchases },
  ] = await Promise.all([
    supabase
      .from("organizations")
      .select("currency")
      .eq("id", organizationId)
      .single(),

    supabase
      .from("suppliers")
      .select(
        `
          id,
          name,
          contact_name,
          email,
          phone,
          vat_number,
          city,
          country_code,
          status,
          created_at
        `,
      )
      .eq("organization_id", organizationId)
      .order("name", { ascending: true }),

    supabase
      .from("purchases")
      .select(
        `
          id,
          supplier_id,
          total,
          status,
          purchase_date
        `,
      )
      .eq("organization_id", organizationId),
  ]);

  const safeSuppliers = (suppliers ?? []) as SupplierRow[];
  const safePurchases = (purchases ?? []) as PurchaseSummary[];

  const currency = organization?.currency || "EUR";

  const activeSuppliers = safeSuppliers.filter(
    (supplier) => supplier.status === "active",
  ).length;

  const totalSpend = safePurchases
    .filter((purchase) => purchase.status !== "cancelled")
    .reduce(
      (sum, purchase) => sum + Number(purchase.total || 0),
      0,
    );

  const suppliersWithPurchases = new Set(
    safePurchases
      .filter((purchase) => purchase.supplier_id)
      .map((purchase) => purchase.supplier_id),
  ).size;

  const purchaseStats = new Map<
    string,
    {
      count: number;
      spend: number;
      lastPurchase: string | null;
    }
  >();

  for (const purchase of safePurchases) {
    if (!purchase.supplier_id) {
      continue;
    }

    const current = purchaseStats.get(purchase.supplier_id) ?? {
      count: 0,
      spend: 0,
      lastPurchase: null,
    };

    current.count += 1;

    if (purchase.status !== "cancelled") {
      current.spend += Number(purchase.total || 0);
    }

    if (
      !current.lastPurchase ||
      new Date(purchase.purchase_date) >
        new Date(current.lastPurchase)
    ) {
      current.lastPurchase = purchase.purchase_date;
    }

    purchaseStats.set(purchase.supplier_id, current);
  }

  return (
    <div className="mx-auto max-w-[1500px]">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#101828]">
            Suppliers
          </h1>

          <p className="mt-2 text-sm text-[#667085]">
            Manage supplier relationships, contact details and purchase
            history.
          </p>
        </div>

        <Link
          href="/app/suppliers/new"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#101828] px-5 text-sm font-semibold text-white transition hover:bg-black"
        >
          <Plus size={16} />
          Add supplier
        </Link>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Building2}
          label="Suppliers"
          value={String(safeSuppliers.length)}
          note="Total supplier records"
        />

        <MetricCard
          icon={Building2}
          label="Active suppliers"
          value={String(activeSuppliers)}
          note="Currently available suppliers"
        />

        <MetricCard
          icon={ShoppingCart}
          label="Used in purchases"
          value={String(suppliersWithPurchases)}
          note="Suppliers with purchase history"
        />

        <MetricCard
          icon={CircleDollarSign}
          label="Total spend"
          value={formatCurrency(totalSpend, currency)}
          note="Across non-cancelled purchases"
        />
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-[#eaecf0] bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-[#eaecf0] px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-semibold text-[#101828]">
              Supplier directory
            </h2>

            <p className="mt-1 text-sm text-[#667085]">
              View supplier activity, purchasing history and contact
              information.
            </p>
          </div>
        </div>

        {safeSuppliers.length === 0 ? (
          <EmptySuppliers />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] border-collapse">
              <thead>
                <tr className="border-b border-[#eaecf0] bg-[#fcfcfd] text-left">
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                    Supplier
                  </th>

                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                    Contact
                  </th>

                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                    Location
                  </th>

                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                    Purchases
                  </th>

                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                    Spend
                  </th>

                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                    Last purchase
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
                {safeSuppliers.map((supplier) => {
                  const stats = purchaseStats.get(supplier.id) ?? {
                    count: 0,
                    spend: 0,
                    lastPurchase: null,
                  };

                  return (
                    <tr
                      key={supplier.id}
                      className="border-b border-[#f2f4f7] last:border-0"
                    >
                      <td className="px-6 py-4">
                        <Link
                          href={`/app/suppliers/${supplier.id}`}
                          className="text-sm font-semibold text-[#101828] hover:underline"
                        >
                          {supplier.name}
                        </Link>

                        <p className="mt-1 text-xs text-[#98a2b3]">
                          {supplier.vat_number
                            ? `VAT ${supplier.vat_number}`
                            : "No VAT number"}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <p className="text-sm text-[#344054]">
                          {supplier.contact_name || "No contact"}
                        </p>

                        <p className="mt-1 text-xs text-[#98a2b3]">
                          {supplier.email ||
                            supplier.phone ||
                            "No contact details"}
                        </p>
                      </td>

                      <td className="px-6 py-4 text-sm text-[#667085]">
                        {formatLocation(
                          supplier.city,
                          supplier.country_code,
                        )}
                      </td>

                      <td className="px-6 py-4 text-sm font-semibold text-[#101828]">
                        {stats.count}
                      </td>

                      <td className="px-6 py-4 text-sm font-semibold text-[#101828]">
                        {formatCurrency(stats.spend, currency)}
                      </td>

                      <td className="px-6 py-4 text-sm text-[#667085]">
                        {stats.lastPurchase
                          ? formatDate(stats.lastPurchase)
                          : "—"}
                      </td>

                      <td className="px-6 py-4">
                        <SupplierStatus status={supplier.status} />
                      </td>

                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/app/suppliers/${supplier.id}`}
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
}: {
  icon: React.ComponentType<{
    size?: number;
  }>;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <article className="rounded-2xl border border-[#eaecf0] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-[#667085]">
          {label}
        </p>

        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f2f4f7] text-[#475467]">
          <Icon size={17} />
        </div>
      </div>

      <p className="mt-4 text-2xl font-semibold text-[#101828]">
        {value}
      </p>

      <p className="mt-2 text-xs text-[#98a2b3]">
        {note}
      </p>
    </article>
  );
}

function SupplierStatus({
  status,
}: {
  status: string;
}) {
  if (status === "active") {
    return (
      <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
        Active
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-[#f2f4f7] px-3 py-1 text-xs font-semibold text-[#667085]">
      Inactive
    </span>
  );
}

function EmptySuppliers() {
  return (
    <div className="px-6 py-16 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f2f4f7] text-[#667085]">
        <Building2 size={21} />
      </div>

      <p className="mt-4 font-semibold text-[#101828]">
        No suppliers yet
      </p>

      <p className="mt-2 text-sm text-[#667085]">
        Add your first supplier to start building purchase history and supplier
        pricing records.
      </p>

      <Link
        href="/app/suppliers/new"
        className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#101828] px-5 text-sm font-semibold text-white"
      >
        <Plus size={15} />
        Add supplier
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

function formatLocation(
  city: string | null,
  countryCode: string | null,
) {
  if (city && countryCode) {
    return `${city}, ${countryCode}`;
  }

  if (city) {
    return city;
  }

  if (countryCode) {
    return countryCode;
  }

  return "Not set";
}