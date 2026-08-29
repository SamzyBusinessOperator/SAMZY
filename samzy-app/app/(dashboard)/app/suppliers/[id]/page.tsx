import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CircleDollarSign,
  Edit3,
  Mail,
  MapPin,
  Package,
  Phone,
  ReceiptText,
  ShoppingCart,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";

type SupplierDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type SupplierRow = {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  vat_number: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country_code: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

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
};

type PurchaseItemProduct = {
  id: string;
  name: string;
  sku: string | null;
  brand: string | null;
  unit: string;
};

type PurchaseItemRow = {
  id: string;
  purchase_id: string;
  product_id: string;
  ordered_quantity: number;
  received_quantity: number;
  unit_cost: number;
  vat_rate: number;
  line_total: number;
  created_at: string;
  products:
    | PurchaseItemProduct
    | PurchaseItemProduct[]
    | null;
};

type ProductSummary = {
  id: string;
  name: string;
  sku: string | null;
  brand: string | null;
  unit: string;
  purchaseCount: number;
  orderedQuantity: number;
  receivedQuantity: number;
  latestCost: number;
  lowestCost: number;
  highestCost: number;
  lastPurchased: string;
};

export default async function SupplierDetailPage({
  params,
}: SupplierDetailPageProps) {
  const { id } = await params;

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
    { data: supplier, error: supplierError },
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
          address,
          city,
          postal_code,
          country_code,
          notes,
          status,
          created_at,
          updated_at
        `,
      )
      .eq("id", id)
      .eq("organization_id", organizationId)
      .maybeSingle(),
  ]);

  if (supplierError || !supplier) {
    notFound();
  }

  const safeSupplier = supplier as SupplierRow;

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
        created_at
      `,
    )
    .eq("organization_id", organizationId)
    .eq("supplier_id", safeSupplier.id)
    .order("purchase_date", { ascending: false })
    .order("created_at", { ascending: false });

  const safePurchases = (purchases ?? []) as PurchaseRow[];

  const purchaseIds = safePurchases.map(
    (purchase) => purchase.id,
  );

  let safeItems: PurchaseItemRow[] = [];

  if (purchaseIds.length > 0) {
    const { data: items } = await supabase
      .from("purchase_items")
      .select(
        `
          id,
          purchase_id,
          product_id,
          ordered_quantity,
          received_quantity,
          unit_cost,
          vat_rate,
          line_total,
          created_at,
          products (
            id,
            name,
            sku,
            brand,
            unit
          )
        `,
      )
      .eq("organization_id", organizationId)
      .in("purchase_id", purchaseIds)
      .order("created_at", { ascending: false });

    safeItems = (items ?? []) as PurchaseItemRow[];
  }

  const currency = organization?.currency || "EUR";

  const validPurchases = safePurchases.filter(
    (purchase) => purchase.status !== "cancelled",
  );

  const totalSpend = validPurchases.reduce(
    (sum, purchase) => sum + Number(purchase.total || 0),
    0,
  );

  const receivedPurchases = safePurchases.filter(
    (purchase) => purchase.status === "received",
  ).length;

  const openPurchases = safePurchases.filter(
    (purchase) =>
      purchase.status === "ordered" ||
      purchase.status === "partially_received",
  ).length;

  const lastPurchase =
    safePurchases.length > 0
      ? safePurchases[0]
      : null;

  const purchaseDateById = new Map(
    safePurchases.map((purchase) => [
      purchase.id,
      purchase.purchase_date,
    ]),
  );

  const productMap = new Map<
    string,
    ProductSummary
  >();

  for (const item of safeItems) {
    const rawProduct = item.products;

    const product = Array.isArray(rawProduct)
      ? rawProduct[0]
      : rawProduct;

    if (!product) {
      continue;
    }

    const purchaseDate =
      purchaseDateById.get(item.purchase_id) ||
      item.created_at;

    const unitCost = Number(item.unit_cost || 0);

    const current = productMap.get(product.id);

    if (!current) {
      productMap.set(product.id, {
        id: product.id,
        name: product.name,
        sku: product.sku,
        brand: product.brand,
        unit: product.unit,
        purchaseCount: 1,
        orderedQuantity: Number(
          item.ordered_quantity || 0,
        ),
        receivedQuantity: Number(
          item.received_quantity || 0,
        ),
        latestCost: unitCost,
        lowestCost: unitCost,
        highestCost: unitCost,
        lastPurchased: purchaseDate,
      });

      continue;
    }

    current.purchaseCount += 1;

    current.orderedQuantity += Number(
      item.ordered_quantity || 0,
    );

    current.receivedQuantity += Number(
      item.received_quantity || 0,
    );

    current.lowestCost = Math.min(
      current.lowestCost,
      unitCost,
    );

    current.highestCost = Math.max(
      current.highestCost,
      unitCost,
    );

    if (
      new Date(purchaseDate) >
      new Date(current.lastPurchased)
    ) {
      current.lastPurchased = purchaseDate;
      current.latestCost = unitCost;
    }
  }

  const productSummaries = Array.from(
    productMap.values(),
  ).sort(
    (a, b) =>
      new Date(b.lastPurchased).getTime() -
      new Date(a.lastPurchased).getTime(),
  );

  return (
    <div className="mx-auto max-w-[1500px]">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link
            href="/app/suppliers"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#667085] transition hover:text-[#101828]"
          >
            <ArrowLeft size={16} />
            Back to suppliers
          </Link>

          <div className="mt-5 flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#f2f4f7] text-[#475467]">
              <Building2 size={21} />
            </div>

            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-[#101828]">
                {safeSupplier.name}
              </h1>

              <p className="mt-2 text-sm text-[#667085]">
                Supplier information, purchase history and product cost
                intelligence.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/app/suppliers/${safeSupplier.id}/edit`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#d0d5dd] bg-white px-4 text-sm font-semibold text-[#344054] transition hover:bg-[#f9fafb]"
          >
            <Edit3 size={16} />
            Edit supplier
          </Link>

          <SupplierStatus status={safeSupplier.status} />
        </div>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={ShoppingCart}
          label="Purchases"
          value={String(safePurchases.length)}
          note={`${receivedPurchases} fully received`}
        />

        <MetricCard
          icon={CircleDollarSign}
          label="Total spend"
          value={formatCurrency(
            totalSpend,
            currency,
          )}
          note="Excluding cancelled purchases"
        />

        <MetricCard
          icon={Package}
          label="Products supplied"
          value={String(productSummaries.length)}
          note="Unique products purchased"
        />

        <MetricCard
          icon={ReceiptText}
          label="Open purchases"
          value={String(openPurchases)}
          note={
            lastPurchase
              ? `Last purchase ${formatDate(
                  lastPurchase.purchase_date,
                )}`
              : "No purchase history"
          }
          warning={openPurchases > 0}
        />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="space-y-6">
          <article className="rounded-2xl border border-[#eaecf0] bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-[#101828]">
              Supplier details
            </h2>

            <div className="mt-6 space-y-5">
              <DetailRow
                label="Contact"
                value={
                  safeSupplier.contact_name ||
                  "Not set"
                }
              />

              <DetailRow
                label="VAT number"
                value={
                  safeSupplier.vat_number ||
                  "Not set"
                }
              />

              <DetailRow
                label="Country"
                value={
                  safeSupplier.country_code ||
                  "Not set"
                }
              />

              <DetailRow
                label="Status"
                value={formatStatus(
                  safeSupplier.status,
                )}
              />
            </div>
          </article>

          <article className="rounded-2xl border border-[#eaecf0] bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-[#101828]">
              Contact information
            </h2>

            <div className="mt-6 space-y-5">
              <ContactRow
                icon={Mail}
                label="Email"
                value={
                  safeSupplier.email ||
                  "Not set"
                }
              />

              <ContactRow
                icon={Phone}
                label="Phone"
                value={
                  safeSupplier.phone ||
                  "Not set"
                }
              />

              <ContactRow
                icon={MapPin}
                label="Address"
                value={formatAddress(
                  safeSupplier,
                )}
              />
            </div>
          </article>

          {safeSupplier.notes ? (
            <article className="rounded-2xl border border-[#eaecf0] bg-white p-6 shadow-sm">
              <h2 className="font-semibold text-[#101828]">
                Notes
              </h2>

              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#667085]">
                {safeSupplier.notes}
              </p>
            </article>
          ) : null}
        </div>

        <div className="min-w-0 space-y-6">
          <section className="overflow-hidden rounded-2xl border border-[#eaecf0] bg-white shadow-sm">
            <div className="border-b border-[#eaecf0] px-6 py-5">
              <h2 className="font-semibold text-[#101828]">
                Purchase history
              </h2>

              <p className="mt-1 text-sm text-[#667085]">
                All purchase orders associated with this supplier.
              </p>
            </div>

            {safePurchases.length === 0 ? (
              <EmptyState
                title="No purchases yet"
                description="Purchases created with this supplier will appear here."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] border-collapse">
                  <thead>
                    <tr className="border-b border-[#eaecf0] bg-[#fcfcfd] text-left">
                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                        Purchase
                      </th>

                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                        Date
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
                    {safePurchases.map(
                      (purchase) => (
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

                          <td className="px-6 py-4 text-sm text-[#667085]">
                            {formatDate(
                              purchase.purchase_date,
                            )}
                          </td>

                          <td className="px-6 py-4 text-sm font-semibold text-[#101828]">
                            {formatCurrency(
                              Number(purchase.total),
                              purchase.currency ||
                                currency,
                            )}
                          </td>

                          <td className="px-6 py-4">
                            <PurchaseStatus
                              status={
                                purchase.status
                              }
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
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-2xl border border-[#eaecf0] bg-white shadow-sm">
            <div className="border-b border-[#eaecf0] px-6 py-5">
              <h2 className="font-semibold text-[#101828]">
                Products & cost history
              </h2>

              <p className="mt-1 text-sm text-[#667085]">
                Products purchased from this supplier and their recorded
                unit costs.
              </p>
            </div>

            {productSummaries.length === 0 ? (
              <EmptyState
                title="No product history"
                description="Products purchased from this supplier will appear here."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[950px] border-collapse">
                  <thead>
                    <tr className="border-b border-[#eaecf0] bg-[#fcfcfd] text-left">
                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                        Product
                      </th>

                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                        Purchases
                      </th>

                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                        Received
                      </th>

                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                        Latest cost
                      </th>

                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                        Cost range
                      </th>

                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                        Last purchased
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {productSummaries.map(
                      (product) => (
                        <tr
                          key={product.id}
                          className="border-b border-[#f2f4f7] last:border-0"
                        >
                          <td className="px-6 py-4">
                            <Link
                              href={`/app/products/${product.id}`}
                              className="text-sm font-semibold text-[#101828] hover:underline"
                            >
                              {product.name}
                            </Link>

                            <p className="mt-1 text-xs text-[#98a2b3]">
                              {product.sku ||
                                "No SKU"}

                              {product.brand
                                ? ` · ${product.brand}`
                                : ""}
                            </p>
                          </td>

                          <td className="px-6 py-4 text-sm font-semibold text-[#101828]">
                            {product.purchaseCount}
                          </td>

                          <td className="px-6 py-4 text-sm text-[#667085]">
                            {formatQuantity(
                              product.receivedQuantity,
                            )}{" "}
                            {product.unit}
                          </td>

                          <td className="px-6 py-4 text-sm font-semibold text-[#101828]">
                            {formatCurrency(
                              product.latestCost,
                              currency,
                            )}
                          </td>

                          <td className="px-6 py-4 text-sm text-[#667085]">
                            {formatCurrency(
                              product.lowestCost,
                              currency,
                            )}
                            {" – "}
                            {formatCurrency(
                              product.highestCost,
                              currency,
                            )}
                          </td>

                          <td className="px-6 py-4 text-sm text-[#667085]">
                            {formatDate(
                              product.lastPurchased,
                            )}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
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

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-[#f2f4f7] pb-4 last:border-0 last:pb-0">
      <span className="text-sm text-[#667085]">
        {label}
      </span>

      <span className="text-right text-sm font-semibold text-[#101828]">
        {value}
      </span>
    </div>
  );
}

function ContactRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{
    size?: number;
  }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f2f4f7] text-[#667085]">
        <Icon size={15} />
      </div>

      <div className="min-w-0">
        <p className="text-xs text-[#98a2b3]">
          {label}
        </p>

        <p className="mt-1 break-words text-sm font-medium text-[#344054]">
          {value}
        </p>
      </div>
    </div>
  );
}

function SupplierStatus({
  status,
}: {
  status: string;
}) {
  if (status === "active") {
    return (
      <span className="inline-flex h-10 items-center rounded-xl bg-emerald-50 px-4 text-sm font-semibold text-emerald-700">
        Active
      </span>
    );
  }

  return (
    <span className="inline-flex h-10 items-center rounded-xl bg-[#f2f4f7] px-4 text-sm font-semibold text-[#667085]">
      Inactive
    </span>
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
    <span className="inline-flex rounded-full bg-[#f2f4f7] px-3 py-1 text-xs font-semibold text-[#667085]">
      Draft
    </span>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="px-6 py-12 text-center">
      <p className="font-semibold text-[#101828]">
        {title}
      </p>

      <p className="mt-2 text-sm text-[#667085]">
        {description}
      </p>
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

function formatQuantity(value: number) {
  return new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatStatus(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}

function formatAddress(
  supplier: SupplierRow,
) {
  const parts = [
    supplier.address,
    supplier.postal_code,
    supplier.city,
    supplier.country_code,
  ].filter(Boolean);

  return parts.length > 0
    ? parts.join(", ")
    : "Not set";
}