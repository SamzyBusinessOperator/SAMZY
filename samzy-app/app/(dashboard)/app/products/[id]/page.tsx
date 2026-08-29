import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  Barcode,
  Boxes,
  CircleDollarSign,
  Edit3,
  Minus,
  Package,
  Percent,
  Tag,
} from "lucide-react";

import DeleteProductButton from "@/components/products/DeleteProductButton";
import { createClient } from "@/lib/supabase/server";

type ProductPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type ProductCategory = {
  id: string;
  name: string;
  color: string;
};

type SupplierRelation = {
  id: string;
  name: string;
  status: string;
};

type PurchaseRelation = {
  id: string;
  purchase_number: string;
  purchase_date: string;
  status: string;
  supplier_id: string | null;
  suppliers:
    | SupplierRelation
    | SupplierRelation[]
    | null;
};

type PurchaseItemHistoryRow = {
  id: string;
  purchase_id: string;
  ordered_quantity: number;
  received_quantity: number;
  unit_cost: number;
  vat_rate: number;
  line_total: number;
  created_at: string;

  purchases:
    | PurchaseRelation
    | PurchaseRelation[]
    | null;
};

type CostHistoryRow = {
  id: string;
  purchaseId: string;
  purchaseNumber: string;
  purchaseDate: string;
  purchaseCreatedAt: string;
  supplierId: string | null;
  supplierName: string;
  supplierStatus: string | null;
  orderedQuantity: number;
  receivedQuantity: number;
  unitCost: number;
  vatRate: number;
  lineTotal: number;
};

type SupplierCostSummary = {
  supplierId: string | null;
  supplierName: string;
  supplierStatus: string | null;
  purchaseCount: number;
  latestCost: number;
  previousCost: number | null;
  lowestCost: number;
  highestCost: number;
  latestPurchaseDate: string;
  latestPurchaseId: string;
  latestPurchaseNumber: string;
};

export default async function ProductDetailPage({
  params,
}: ProductPageProps) {
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
    { data: product, error },
    { data: purchaseItemHistory },
  ] = await Promise.all([
    supabase
      .from("organizations")
      .select("currency")
      .eq("id", organizationId)
      .single(),

    supabase
      .from("products")
      .select(
        `
          id,
          name,
          description,
          sku,
          barcode,
          brand,
          image_url,
          selling_price,
          cost_price,
          current_stock,
          reserved_stock,
          reorder_level,
          unit,
          vat_rate,
          status,
          created_at,
          updated_at,
          category_id,
          categories (
            id,
            name,
            color
          )
        `,
      )
      .eq("id", id)
      .eq("organization_id", organizationId)
      .maybeSingle(),

    supabase
      .from("purchase_items")
      .select(
        `
          id,
          purchase_id,
          ordered_quantity,
          received_quantity,
          unit_cost,
          vat_rate,
          line_total,
          created_at,
          purchases (
            id,
            purchase_number,
            purchase_date,
            status,
            supplier_id,
            suppliers (
              id,
              name,
              status
            )
          )
        `,
      )
      .eq("organization_id", organizationId)
      .eq("product_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (error || !product) {
    notFound();
  }

  const rawCategory = product.categories;

  const category = (
    Array.isArray(rawCategory)
      ? rawCategory[0]
      : rawCategory
  ) as ProductCategory | null;

  const currency =
    organization?.currency || "EUR";

  const moneyFormatter =
    new Intl.NumberFormat("en-IE", {
      style: "currency",
      currency,
    });

  const availableStock =
    product.current_stock -
    product.reserved_stock;

  const isLowStock =
    product.current_stock <=
    product.reorder_level;

  const grossProfit =
    product.selling_price -
    product.cost_price;

  const margin =
    product.selling_price > 0
      ? (grossProfit /
          product.selling_price) *
        100
      : 0;

  const markup =
    product.cost_price > 0
      ? (grossProfit /
          product.cost_price) *
        100
      : 0;

  const dateFormatter =
    new Intl.DateTimeFormat(
      "en-GB",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      },
    );

  /*
   * -------------------------------------------------------
   * PURCHASE COST HISTORY
   * -------------------------------------------------------
   *
   * purchase_items is the historical source of truth.
   * We deliberately do not create a second supplier-price
   * table here.
   */
  const rawHistory =
    (purchaseItemHistory ??
      []) as PurchaseItemHistoryRow[];

  const costHistory: CostHistoryRow[] =
    rawHistory
      .map((item) => {
        const rawPurchase =
          item.purchases;

        const purchase =
          Array.isArray(rawPurchase)
            ? rawPurchase[0]
            : rawPurchase;

        if (!purchase) {
          return null;
        }

        /*
         * Cancelled orders should not influence
         * purchasing intelligence.
         */
        if (
          purchase.status ===
          "cancelled"
        ) {
          return null;
        }

        const rawSupplier =
          purchase.suppliers;

        const supplier =
          Array.isArray(rawSupplier)
            ? rawSupplier[0]
            : rawSupplier;

        return {
          id: item.id,

          purchaseId:
            purchase.id,

          purchaseNumber:
            purchase.purchase_number,

          purchaseDate:
            purchase.purchase_date,

          purchaseCreatedAt:
            item.created_at,

          supplierId:
            supplier?.id ||
            purchase.supplier_id ||
            null,

          supplierName:
            supplier?.name ||
            "Unknown supplier",

          supplierStatus:
            supplier?.status || null,

          orderedQuantity:
            Number(
              item.ordered_quantity ||
                0,
            ),

          receivedQuantity:
            Number(
              item.received_quantity ||
                0,
            ),

          unitCost:
            Number(
              item.unit_cost || 0,
            ),

          vatRate:
            Number(
              item.vat_rate || 0,
            ),

          lineTotal:
            Number(
              item.line_total || 0,
            ),
        };
      })
      .filter(
        (
          row,
        ): row is CostHistoryRow =>
          row !== null,
      )
      .sort((a, b) => {
        const dateDifference =
          new Date(
            b.purchaseDate,
          ).getTime() -
          new Date(
            a.purchaseDate,
          ).getTime();

        if (dateDifference !== 0) {
          return dateDifference;
        }

        return (
          new Date(
            b.purchaseCreatedAt,
          ).getTime() -
          new Date(
            a.purchaseCreatedAt,
          ).getTime()
        );
      });

  /*
   * -------------------------------------------------------
   * SUPPLIER COMPARISON
   * -------------------------------------------------------
   */
  const supplierHistory =
    new Map<
      string,
      CostHistoryRow[]
    >();

  for (const row of costHistory) {
    const key =
      row.supplierId ||
      `unknown:${row.supplierName}`;

    const current =
      supplierHistory.get(key) ||
      [];

    current.push(row);

    supplierHistory.set(
      key,
      current,
    );
  }

  const supplierSummaries: SupplierCostSummary[] =
    Array.from(
      supplierHistory.values(),
    )
      .map((history) => {
        const sorted = [
          ...history,
        ].sort((a, b) => {
          const dateDifference =
            new Date(
              b.purchaseDate,
            ).getTime() -
            new Date(
              a.purchaseDate,
            ).getTime();

          if (
            dateDifference !== 0
          ) {
            return dateDifference;
          }

          return (
            new Date(
              b.purchaseCreatedAt,
            ).getTime() -
            new Date(
              a.purchaseCreatedAt,
            ).getTime()
          );
        });

        const latest = sorted[0];

        const previous =
          sorted.length > 1
            ? sorted[1]
            : null;

        const costs =
          sorted.map(
            (record) =>
              record.unitCost,
          );

        return {
          supplierId:
            latest.supplierId,

          supplierName:
            latest.supplierName,

          supplierStatus:
            latest.supplierStatus,

          purchaseCount:
            sorted.length,

          latestCost:
            latest.unitCost,

          previousCost:
            previous?.unitCost ??
            null,

          lowestCost:
            Math.min(...costs),

          highestCost:
            Math.max(...costs),

          latestPurchaseDate:
            latest.purchaseDate,

          latestPurchaseId:
            latest.purchaseId,

          latestPurchaseNumber:
            latest.purchaseNumber,
        };
      })
      .sort(
        (a, b) =>
          a.latestCost -
          b.latestCost,
      );

  /*
   * Prefer active suppliers for the
   * "best supplier" recommendation.
   */
  const activeSupplierSummaries =
    supplierSummaries.filter(
      (supplier) =>
        supplier.supplierStatus !==
        "inactive",
    );

  const bestSupplier =
    activeSupplierSummaries[0] ||
    supplierSummaries[0] ||
    null;

  const latestPurchaseCost =
    costHistory.length > 0
      ? costHistory[0].unitCost
      : null;

  const latestPurchaseSupplier =
    costHistory.length > 0
      ? costHistory[0]
          .supplierName
      : null;

  const highestLatestCost =
    supplierSummaries.length > 0
      ? Math.max(
          ...supplierSummaries.map(
            (supplier) =>
              supplier.latestCost,
          ),
        )
      : null;

  const supplierSpread =
    bestSupplier &&
    highestLatestCost !== null
      ? highestLatestCost -
        bestSupplier.latestCost
      : null;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link
            href="/app/products"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#667085] transition hover:text-[#101828]"
          >
            <ArrowLeft size={16} />
            Back to products
          </Link>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#101828]">
            {product.name}
          </h1>

          <p className="mt-2 text-sm text-[#667085]">
            Product information,
            pricing, inventory and
            supplier cost intelligence.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/app/products/${product.id}/edit`}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#d0d5dd] bg-white px-5 text-sm font-semibold text-[#344054] transition hover:bg-[#f9fafb]"
          >
            <Edit3 size={16} />
            Edit product
          </Link>

          <DeleteProductButton
            productId={product.id}
            productName={product.name}
            organizationId={
              organizationId
            }
          />

          <span
            className={[
              "inline-flex h-11 items-center rounded-xl px-4 text-sm font-semibold capitalize",
              product.status ===
              "active"
                ? "bg-emerald-50 text-emerald-700"
                : product.status ===
                    "draft"
                  ? "bg-amber-50 text-amber-700"
                  : "bg-[#f2f4f7] text-[#475467]",
            ].join(" ")}
          >
            {product.status}
          </span>
        </div>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-6">
          <article className="overflow-hidden rounded-2xl border border-[#eaecf0] bg-white shadow-sm">
            <div className="relative flex aspect-square items-center justify-center bg-[#f8f9fb]">
              {product.image_url ? (
                <Image
                  src={
                    product.image_url
                  }
                  alt={product.name}
                  fill
                  unoptimized
                  className="object-contain p-8"
                />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-[#eef1f6] text-5xl font-semibold text-[#98a2b3]">
                  {product.name
                    .charAt(0)
                    .toUpperCase()}
                </div>
              )}
            </div>

            <div className="border-t border-[#eaecf0] p-5">
              <p className="text-sm font-semibold text-[#101828]">
                {product.name}
              </p>

              <p className="mt-1 text-sm text-[#667085]">
                {product.brand ||
                  "No brand"}
              </p>

              {category ? (
                <span
                  className="mt-4 inline-flex rounded-full px-3 py-1 text-xs font-semibold"
                  style={{
                    backgroundColor: `${category.color}18`,
                    color:
                      category.color,
                  }}
                >
                  {category.name}
                </span>
              ) : (
                <span className="mt-4 inline-flex rounded-full bg-[#f2f4f7] px-3 py-1 text-xs font-semibold text-[#667085]">
                  Uncategorized
                </span>
              )}
            </div>
          </article>

          <article className="rounded-2xl border border-[#eaecf0] bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-[#101828]">
              Identifiers
            </h2>

            <div className="mt-5 space-y-4">
              <DetailRow
                icon={Tag}
                label="SKU"
                value={
                  product.sku ||
                  "Not set"
                }
              />

              <DetailRow
                icon={Barcode}
                label="Barcode"
                value={
                  product.barcode ||
                  "Not set"
                }
              />

              <DetailRow
                icon={Package}
                label="Product ID"
                value={product.id}
                mono
              />
            </div>
          </article>
        </aside>

        <div className="min-w-0 space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={
                CircleDollarSign
              }
              label="Selling price"
              value={moneyFormatter.format(
                product.selling_price,
              )}
            />

            <MetricCard
              icon={
                CircleDollarSign
              }
              label="Cost price"
              value={moneyFormatter.format(
                product.cost_price,
              )}
            />

            <MetricCard
              icon={Percent}
              label="Margin"
              value={`${margin.toFixed(
                1,
              )}%`}
            />

            <MetricCard
              icon={Boxes}
              label="Available stock"
              value={`${availableStock} ${product.unit}`}
              warning={isLowStock}
            />
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <article className="rounded-2xl border border-[#eaecf0] bg-white p-6 shadow-sm">
              <h2 className="font-semibold text-[#101828]">
                Product details
              </h2>

              <div className="mt-6 space-y-5">
                <TextRow
                  label="Brand"
                  value={
                    product.brand ||
                    "Not set"
                  }
                />

                <TextRow
                  label="Category"
                  value={
                    category?.name ||
                    "Uncategorized"
                  }
                />

                <TextRow
                  label="Unit"
                  value={product.unit}
                />

                <TextRow
                  label="VAT rate"
                  value={`${product.vat_rate}%`}
                />

                <TextRow
                  label="Status"
                  value={
                    product.status
                  }
                />
              </div>
            </article>

            <article className="rounded-2xl border border-[#eaecf0] bg-white p-6 shadow-sm">
              <h2 className="font-semibold text-[#101828]">
                Inventory
              </h2>

              <div className="mt-6 space-y-5">
                <TextRow
                  label="Current stock"
                  value={`${product.current_stock} ${product.unit}`}
                />

                <TextRow
                  label="Reserved stock"
                  value={`${product.reserved_stock} ${product.unit}`}
                />

                <TextRow
                  label="Available stock"
                  value={`${availableStock} ${product.unit}`}
                />

                <TextRow
                  label="Reorder level"
                  value={`${product.reorder_level} ${product.unit}`}
                />
              </div>

              {isLowStock ? (
                <div className="mt-6 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
                  <p className="text-sm font-semibold text-orange-700">
                    Low-stock alert
                  </p>

                  <p className="mt-1 text-xs leading-5 text-orange-600">
                    Current stock is at
                    or below the
                    configured reorder
                    level.
                  </p>
                </div>
              ) : null}
            </article>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <article className="rounded-2xl border border-[#eaecf0] bg-white p-6 shadow-sm">
              <h2 className="font-semibold text-[#101828]">
                Pricing analysis
              </h2>

              <div className="mt-6 space-y-5">
                <TextRow
                  label="Cost price"
                  value={moneyFormatter.format(
                    product.cost_price,
                  )}
                />

                <TextRow
                  label="Selling price"
                  value={moneyFormatter.format(
                    product.selling_price,
                  )}
                />

                <TextRow
                  label="Gross profit"
                  value={moneyFormatter.format(
                    grossProfit,
                  )}
                />

                <TextRow
                  label="Margin"
                  value={`${margin.toFixed(
                    1,
                  )}%`}
                />

                <TextRow
                  label="Markup"
                  value={`${markup.toFixed(
                    1,
                  )}%`}
                />
              </div>
            </article>

            <article className="rounded-2xl border border-[#eaecf0] bg-white p-6 shadow-sm">
              <h2 className="font-semibold text-[#101828]">
                Description
              </h2>

              <p className="mt-6 whitespace-pre-wrap text-sm leading-7 text-[#667085]">
                {product.description ||
                  "No description has been added to this product yet."}
              </p>
            </article>
          </section>

          {/* =================================================
              SUPPLIER COST INTELLIGENCE
          ================================================= */}

          <section className="overflow-hidden rounded-2xl border border-[#eaecf0] bg-white shadow-sm">
            <div className="border-b border-[#eaecf0] px-6 py-5">
              <h2 className="font-semibold text-[#101828]">
                Supplier price
                intelligence
              </h2>

              <p className="mt-1 text-sm text-[#667085]">
                Compare the latest
                purchase cost across
                suppliers and identify
                price changes.
              </p>
            </div>

            {supplierSummaries.length ===
            0 ? (
              <EmptyIntelligence
                title="No supplier pricing history"
                description="Purchase this product from a supplier to begin building price intelligence."
              />
            ) : (
              <>
                <div className="grid gap-4 border-b border-[#eaecf0] p-6 md:grid-cols-3">
                  <IntelligenceCard
                    label="Latest purchase cost"
                    value={
                      latestPurchaseCost !==
                      null
                        ? moneyFormatter.format(
                            latestPurchaseCost,
                          )
                        : "—"
                    }
                    note={
                      latestPurchaseSupplier ||
                      "No supplier"
                    }
                  />

                  <IntelligenceCard
                    label="Best current supplier"
                    value={
                      bestSupplier
                        ? moneyFormatter.format(
                            bestSupplier.latestCost,
                          )
                        : "—"
                    }
                    note={
                      bestSupplier?.supplierName ||
                      "No supplier"
                    }
                    positive
                  />

                  <IntelligenceCard
                    label="Supplier price spread"
                    value={
                      supplierSpread !==
                      null
                        ? moneyFormatter.format(
                            supplierSpread,
                          )
                        : "—"
                    }
                    note={
                      supplierSummaries.length >
                      1
                        ? "Difference between cheapest and highest latest cost"
                        : "Add another supplier to compare"
                    }
                  />
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1000px] border-collapse">
                    <thead>
                      <tr className="border-b border-[#eaecf0] bg-[#fcfcfd] text-left">
                        <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                          Supplier
                        </th>

                        <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                          Latest cost
                        </th>

                        <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                          Previous
                        </th>

                        <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                          Change
                        </th>

                        <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                          Lowest
                        </th>

                        <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                          Highest
                        </th>

                        <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                          Purchases
                        </th>

                        <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                          Last purchase
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {supplierSummaries.map(
                        (
                          supplier,
                        ) => {
                          const change =
                            supplier.previousCost !==
                            null
                              ? supplier.latestCost -
                                supplier.previousCost
                              : null;

                          const changePercent =
                            supplier.previousCost !==
                              null &&
                            supplier.previousCost >
                              0
                              ? (change! /
                                  supplier.previousCost) *
                                100
                              : null;

                          const isBest =
                            bestSupplier?.supplierId ===
                              supplier.supplierId &&
                            bestSupplier?.supplierName ===
                              supplier.supplierName;

                          return (
                            <tr
                              key={`${supplier.supplierId || "unknown"}-${supplier.supplierName}`}
                              className="border-b border-[#f2f4f7] last:border-0"
                            >
                              <td className="px-6 py-4">
                                {supplier.supplierId ? (
                                  <Link
                                    href={`/app/suppliers/${supplier.supplierId}`}
                                    className="text-sm font-semibold text-[#101828] hover:underline"
                                  >
                                    {
                                      supplier.supplierName
                                    }
                                  </Link>
                                ) : (
                                  <p className="text-sm font-semibold text-[#101828]">
                                    {
                                      supplier.supplierName
                                    }
                                  </p>
                                )}

                                <div className="mt-1 flex flex-wrap items-center gap-2">
                                  {isBest ? (
                                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                      Best price
                                    </span>
                                  ) : null}

                                  {supplier.supplierStatus ===
                                  "inactive" ? (
                                    <span className="rounded-full bg-[#f2f4f7] px-2 py-0.5 text-[11px] font-semibold text-[#667085]">
                                      Inactive
                                    </span>
                                  ) : null}
                                </div>
                              </td>

                              <td className="px-6 py-4 text-sm font-semibold text-[#101828]">
                                {moneyFormatter.format(
                                  supplier.latestCost,
                                )}
                              </td>

                              <td className="px-6 py-4 text-sm text-[#667085]">
                                {supplier.previousCost !==
                                null
                                  ? moneyFormatter.format(
                                      supplier.previousCost,
                                    )
                                  : "—"}
                              </td>

                              <td className="px-6 py-4">
                                <PriceChange
                                  amount={
                                    change
                                  }
                                  percent={
                                    changePercent
                                  }
                                  formatter={
                                    moneyFormatter
                                  }
                                />
                              </td>

                              <td className="px-6 py-4 text-sm text-[#667085]">
                                {moneyFormatter.format(
                                  supplier.lowestCost,
                                )}
                              </td>

                              <td className="px-6 py-4 text-sm text-[#667085]">
                                {moneyFormatter.format(
                                  supplier.highestCost,
                                )}
                              </td>

                              <td className="px-6 py-4 text-sm font-semibold text-[#101828]">
                                {
                                  supplier.purchaseCount
                                }
                              </td>

                              <td className="px-6 py-4">
                                <Link
                                  href={`/app/purchases/${supplier.latestPurchaseId}`}
                                  className="text-sm text-[#667085] hover:text-[#101828]"
                                >
                                  {formatDateOnly(
                                    supplier.latestPurchaseDate,
                                  )}
                                </Link>

                                <p className="mt-1 text-xs text-[#98a2b3]">
                                  {
                                    supplier.latestPurchaseNumber
                                  }
                                </p>
                              </td>
                            </tr>
                          );
                        },
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>

          {/* =================================================
              COMPLETE PURCHASE COST HISTORY
          ================================================= */}

          <section className="overflow-hidden rounded-2xl border border-[#eaecf0] bg-white shadow-sm">
            <div className="border-b border-[#eaecf0] px-6 py-5">
              <h2 className="font-semibold text-[#101828]">
                Purchase cost history
              </h2>

              <p className="mt-1 text-sm text-[#667085]">
                Every recorded purchase
                price for this product,
                newest first.
              </p>
            </div>

            {costHistory.length ===
            0 ? (
              <EmptyIntelligence
                title="No purchase cost history"
                description="Historical costs will appear here when this product is included in purchase orders."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] border-collapse">
                  <thead>
                    <tr className="border-b border-[#eaecf0] bg-[#fcfcfd] text-left">
                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                        Date
                      </th>

                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                        Supplier
                      </th>

                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                        Purchase
                      </th>

                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                        Ordered
                      </th>

                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                        Received
                      </th>

                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                        Unit cost
                      </th>

                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                        VAT
                      </th>

                      <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                        Change
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {costHistory.map(
                      (
                        history,
                        index,
                      ) => {
                        /*
                         * The next row is
                         * chronologically
                         * older because the
                         * history array is
                         * newest first.
                         */
                        const previous =
                          costHistory[
                            index + 1
                          ];

                        const change =
                          previous
                            ? history.unitCost -
                              previous.unitCost
                            : null;

                        const changePercent =
                          previous &&
                          previous.unitCost >
                            0
                            ? (change! /
                                previous.unitCost) *
                              100
                            : null;

                        return (
                          <tr
                            key={
                              history.id
                            }
                            className="border-b border-[#f2f4f7] last:border-0"
                          >
                            <td className="px-6 py-4 text-sm text-[#667085]">
                              {formatDateOnly(
                                history.purchaseDate,
                              )}
                            </td>

                            <td className="px-6 py-4">
                              {history.supplierId ? (
                                <Link
                                  href={`/app/suppliers/${history.supplierId}`}
                                  className="text-sm font-semibold text-[#101828] hover:underline"
                                >
                                  {
                                    history.supplierName
                                  }
                                </Link>
                              ) : (
                                <span className="text-sm font-semibold text-[#101828]">
                                  {
                                    history.supplierName
                                  }
                                </span>
                              )}
                            </td>

                            <td className="px-6 py-4">
                              <Link
                                href={`/app/purchases/${history.purchaseId}`}
                                className="text-sm font-semibold text-[#344054] hover:underline"
                              >
                                {
                                  history.purchaseNumber
                                }
                              </Link>
                            </td>

                            <td className="px-6 py-4 text-sm text-[#667085]">
                              {formatQuantity(
                                history.orderedQuantity,
                              )}{" "}
                              {
                                product.unit
                              }
                            </td>

                            <td className="px-6 py-4 text-sm text-[#667085]">
                              {formatQuantity(
                                history.receivedQuantity,
                              )}{" "}
                              {
                                product.unit
                              }
                            </td>

                            <td className="px-6 py-4 text-sm font-semibold text-[#101828]">
                              {moneyFormatter.format(
                                history.unitCost,
                              )}
                            </td>

                            <td className="px-6 py-4 text-sm text-[#667085]">
                              {formatQuantity(
                                history.vatRate,
                              )}
                              %
                            </td>

                            <td className="px-6 py-4">
                              <PriceChange
                                amount={
                                  change
                                }
                                percent={
                                  changePercent
                                }
                                formatter={
                                  moneyFormatter
                                }
                              />
                            </td>
                          </tr>
                        );
                      },
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <article className="rounded-2xl border border-[#eaecf0] bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-[#101828]">
              Record information
            </h2>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <TextRow
                label="Created"
                value={dateFormatter.format(
                  new Date(
                    product.created_at,
                  ),
                )}
              />

              <TextRow
                label="Last updated"
                value={dateFormatter.format(
                  new Date(
                    product.updated_at,
                  ),
                )}
              />
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}

type IconComponent =
  React.ComponentType<{
    size?: number | string;
    className?: string;
  }>;

function MetricCard({
  icon: Icon,
  label,
  value,
  warning = false,
}: {
  icon: IconComponent;
  label: string;
  value: string;
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
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            warning
              ? "bg-orange-50 text-orange-700"
              : "bg-[#f2f4f7] text-[#475467]",
          ].join(" ")}
        >
          <Icon size={18} />
        </div>
      </div>

      <p
        className={[
          "mt-4 text-2xl font-semibold tracking-tight",
          warning
            ? "text-orange-700"
            : "text-[#101828]",
        ].join(" ")}
      >
        {value}
      </p>
    </article>
  );
}

function IntelligenceCard({
  label,
  value,
  note,
  positive = false,
}: {
  label: string;
  value: string;
  note: string;
  positive?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-xl border p-4",
        positive
          ? "border-emerald-200 bg-emerald-50"
          : "border-[#eaecf0] bg-[#fcfcfd]",
      ].join(" ")}
    >
      <p
        className={[
          "text-xs font-medium",
          positive
            ? "text-emerald-700"
            : "text-[#667085]",
        ].join(" ")}
      >
        {label}
      </p>

      <p
        className={[
          "mt-2 text-xl font-semibold",
          positive
            ? "text-emerald-800"
            : "text-[#101828]",
        ].join(" ")}
      >
        {value}
      </p>

      <p
        className={[
          "mt-1 text-xs",
          positive
            ? "text-emerald-700"
            : "text-[#98a2b3]",
        ].join(" ")}
      >
        {note}
      </p>
    </div>
  );
}

function PriceChange({
  amount,
  percent,
  formatter,
}: {
  amount: number | null;
  percent: number | null;
  formatter: Intl.NumberFormat;
}) {
  if (
    amount === null ||
    percent === null
  ) {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-[#98a2b3]">
        <Minus size={14} />
        —
      </span>
    );
  }

  if (Math.abs(amount) < 0.000001) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#f2f4f7] px-2.5 py-1 text-xs font-semibold text-[#667085]">
        <Minus size={13} />
        0.0%
      </span>
    );
  }

  if (amount > 0) {
    return (
      <div>
        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
          <ArrowUpRight size={13} />
          +{percent.toFixed(1)}%
        </span>

        <p className="mt-1 text-xs text-red-600">
          +
          {formatter.format(
            amount,
          )}
        </p>
      </div>
    );
  }

  return (
    <div>
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        <ArrowDownRight size={13} />
        {percent.toFixed(1)}%
      </span>

      <p className="mt-1 text-xs text-emerald-600">
        {formatter.format(amount)}
      </p>
    </div>
  );
}

function EmptyIntelligence({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="px-6 py-14 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f2f4f7] text-[#667085]">
        <CircleDollarSign
          size={20}
        />
      </div>

      <p className="mt-4 font-semibold text-[#101828]">
        {title}
      </p>

      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#667085]">
        {description}
      </p>
    </div>
  );
}

function TextRow({
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

      <span className="text-right text-sm font-semibold capitalize text-[#101828]">
        {value}
      </span>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: IconComponent;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f2f4f7] text-[#667085]">
        <Icon size={15} />
      </div>

      <div className="min-w-0">
        <p className="text-xs text-[#98a2b3]">
          {label}
        </p>

        <p
          className={[
            "mt-1 break-all text-sm font-semibold text-[#101828]",
            mono
              ? "font-mono text-xs"
              : "",
          ].join(" ")}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function formatDateOnly(
  value: string,
) {
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      dateStyle: "medium",
    },
  ).format(new Date(value));
}

function formatQuantity(
  value: number,
) {
  return new Intl.NumberFormat(
    "en-GB",
    {
      maximumFractionDigits: 2,
    },
  ).format(value);
}