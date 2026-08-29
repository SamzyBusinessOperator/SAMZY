import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  PackageCheck,
  PackageMinus,
  Scale,
  TriangleAlert,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";

type MovementRow = {
  id: string;
  movement_type: string;
  quantity: number;
  before_stock: number;
  after_stock: number;
  source: string;
  reason: string | null;
  notes: string | null;
  created_at: string;
  products:
    | {
        id: string;
        name: string;
        sku: string | null;
        unit: string;
      }
    | {
        id: string;
        name: string;
        sku: string | null;
        unit: string;
      }[]
    | null;
};

export default async function InventoryPage() {
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

  const [{ data: products }, { data: movements }] = await Promise.all([
    supabase
      .from("products")
      .select(
        `
          id,
          name,
          sku,
          brand,
          current_stock,
          reserved_stock,
          reorder_level,
          unit,
          status,
          selling_price,
          cost_price
        `,
      )
      .eq("organization_id", organizationId)
      .order("name", { ascending: true }),

    supabase
      .from("inventory_movements")
      .select(
        `
          id,
          movement_type,
          quantity,
          before_stock,
          after_stock,
          source,
          reason,
          notes,
          created_at,
          products (
            id,
            name,
            sku,
            unit
          )
        `,
      )
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  const safeProducts = products ?? [];
  const safeMovements = (movements ?? []) as MovementRow[];

  const totalProducts = safeProducts.length;

  const totalStock = safeProducts.reduce(
    (sum, product) => sum + Number(product.current_stock || 0),
    0,
  );

  const reservedStock = safeProducts.reduce(
    (sum, product) => sum + Number(product.reserved_stock || 0),
    0,
  );

  const lowStockProducts = safeProducts.filter(
    (product) =>
      Number(product.current_stock) <= Number(product.reorder_level),
  );

  const outOfStockProducts = safeProducts.filter(
    (product) => Number(product.current_stock) <= 0,
  );

  return (
    <div className="mx-auto max-w-[1500px]">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#101828]">
            Inventory
          </h1>

          <p className="mt-2 text-sm text-[#667085]">
            Monitor stock levels, receive inventory and review every stock
            movement.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/app/inventory/adjust"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#d0d5dd] bg-white px-5 text-sm font-semibold text-[#344054] transition hover:bg-[#f9fafb]"
          >
            <Scale size={16} />
            Adjust stock
          </Link>

          <Link
            href="/app/inventory/stock-out"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#d0d5dd] bg-white px-5 text-sm font-semibold text-[#344054] transition hover:bg-[#f9fafb]"
          >
            <ArrowUpRight size={16} />
            Stock out
          </Link>

          <Link
            href="/app/inventory/stock-in"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#101828] px-5 text-sm font-semibold text-white transition hover:bg-black"
          >
            <ArrowDownLeft size={16} />
            Stock in
          </Link>
        </div>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          icon={Boxes}
          label="Products"
          value={String(totalProducts)}
          note="Tracked inventory items"
        />

        <MetricCard
          icon={PackageCheck}
          label="Total stock"
          value={formatQuantity(totalStock)}
          note="Units currently recorded"
        />

        <MetricCard
          icon={PackageMinus}
          label="Reserved"
          value={formatQuantity(reservedStock)}
          note="Unavailable stock"
        />

        <MetricCard
          icon={TriangleAlert}
          label="Low stock"
          value={String(lowStockProducts.length)}
          note="At or below reorder level"
          warning={lowStockProducts.length > 0}
        />

        <MetricCard
          icon={TriangleAlert}
          label="Out of stock"
          value={String(outOfStockProducts.length)}
          note="Zero or negative stock"
          danger={outOfStockProducts.length > 0}
        />
      </section>

      <section className="mt-6 rounded-2xl border border-[#eaecf0] bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-[#eaecf0] px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-semibold text-[#101828]">Stock overview</h2>

            <p className="mt-1 text-sm text-[#667085]">
              Current quantities and reorder status for all products.
            </p>
          </div>

          <Link
            href="/app/products"
            className="text-sm font-semibold text-[#344054] hover:text-[#101828]"
          >
            Manage products →
          </Link>
        </div>

        {safeProducts.length === 0 ? (
          <EmptyProducts />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse">
              <thead>
                <tr className="border-b border-[#eaecf0] bg-[#fcfcfd] text-left">
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                    Product
                  </th>

                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                    SKU
                  </th>

                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                    Current
                  </th>

                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                    Reserved
                  </th>

                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                    Available
                  </th>

                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                    Reorder level
                  </th>

                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {safeProducts.map((product) => {
                  const current = Number(product.current_stock || 0);
                  const reserved = Number(product.reserved_stock || 0);
                  const available = current - reserved;
                  const reorderLevel = Number(product.reorder_level || 0);

                  const lowStock = current <= reorderLevel;
                  const outOfStock = current <= 0;

                  return (
                    <tr
                      key={product.id}
                      className="border-b border-[#f2f4f7] last:border-0"
                    >
                      <td className="px-6 py-4">
                        <Link
                          href={`/app/products/${product.id}`}
                          className="font-semibold text-[#101828] hover:underline"
                        >
                          {product.name}
                        </Link>

                        <p className="mt-1 text-xs text-[#98a2b3]">
                          {product.brand || "No brand"}
                        </p>
                      </td>

                      <td className="px-6 py-4 text-sm text-[#667085]">
                        {product.sku || "—"}
                      </td>

                      <td className="px-6 py-4 text-sm font-semibold text-[#101828]">
                        {formatQuantity(current)} {product.unit}
                      </td>

                      <td className="px-6 py-4 text-sm text-[#667085]">
                        {formatQuantity(reserved)} {product.unit}
                      </td>

                      <td className="px-6 py-4 text-sm font-semibold text-[#101828]">
                        {formatQuantity(available)} {product.unit}
                      </td>

                      <td className="px-6 py-4 text-sm text-[#667085]">
                        {formatQuantity(reorderLevel)} {product.unit}
                      </td>

                      <td className="px-6 py-4">
                        <InventoryStatus
                          lowStock={lowStock}
                          outOfStock={outOfStock}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-[#eaecf0] bg-white shadow-sm">
        <div className="border-b border-[#eaecf0] px-6 py-5">
          <h2 className="font-semibold text-[#101828]">Recent movements</h2>

          <p className="mt-1 text-sm text-[#667085]">
            Latest inventory changes across your workspace.
          </p>
        </div>

        {safeMovements.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f2f4f7] text-[#667085]">
              <Boxes size={21} />
            </div>

            <p className="mt-4 font-semibold text-[#101828]">
              No inventory movements yet
            </p>

            <p className="mt-2 text-sm text-[#667085]">
              Your first stock in, stock out or adjustment will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#f2f4f7]">
            {safeMovements.map((movement) => {
              const product = Array.isArray(movement.products)
                ? movement.products[0]
                : movement.products;

              const positive =
                movement.movement_type === "stock_in" ||
                movement.movement_type === "adjustment_in";

              const isAdjustment =
                movement.movement_type === "adjustment_in" ||
                movement.movement_type === "adjustment_out";

              return (
                <div
                  key={movement.id}
                  className="flex flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-4">
                    <div
                      className={[
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                        isAdjustment
                          ? "bg-violet-50 text-violet-700"
                          : positive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700",
                      ].join(" ")}
                    >
                      {isAdjustment ? (
                        <Scale size={18} />
                      ) : positive ? (
                        <ArrowDownLeft size={18} />
                      ) : (
                        <ArrowUpRight size={18} />
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#101828]">
                        {product?.name || "Unknown product"}
                      </p>

                      <p className="mt-1 text-xs capitalize text-[#667085]">
                        {formatMovementType(movement.movement_type)}
                        {" · "}
                        {movement.source}
                        {movement.reason ? ` · ${movement.reason}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-6 md:justify-end">
                    <div className="text-right">
                      <p
                        className={[
                          "text-sm font-semibold",
                          isAdjustment
                            ? "text-violet-700"
                            : positive
                              ? "text-emerald-700"
                              : "text-red-700",
                        ].join(" ")}
                      >
                        {positive ? "+" : "-"}
                        {formatQuantity(Number(movement.quantity))}{" "}
                        {product?.unit || ""}
                      </p>

                      <p className="mt-1 text-xs text-[#98a2b3]">
                        {formatQuantity(Number(movement.before_stock))}
                        {" → "}
                        {formatQuantity(Number(movement.after_stock))}
                      </p>
                    </div>

                    <p className="min-w-[140px] text-right text-xs text-[#98a2b3]">
                      {formatDate(movement.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
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
  danger = false,
}: {
  icon: React.ComponentType<{
    size?: number;
  }>;
  label: string;
  value: string;
  note: string;
  warning?: boolean;
  danger?: boolean;
}) {
  return (
    <article className="rounded-2xl border border-[#eaecf0] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-[#667085]">{label}</p>

        <div
          className={[
            "flex h-9 w-9 items-center justify-center rounded-xl",
            danger
              ? "bg-red-50 text-red-700"
              : warning
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
          danger
            ? "text-red-700"
            : warning
              ? "text-orange-700"
              : "text-[#101828]",
        ].join(" ")}
      >
        {value}
      </p>

      <p className="mt-2 text-xs text-[#98a2b3]">{note}</p>
    </article>
  );
}

function InventoryStatus({
  lowStock,
  outOfStock,
}: {
  lowStock: boolean;
  outOfStock: boolean;
}) {
  if (outOfStock) {
    return (
      <span className="inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
        Out of stock
      </span>
    );
  }

  if (lowStock) {
    return (
      <span className="inline-flex rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
        Low stock
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
      In stock
    </span>
  );
}

function EmptyProducts() {
  return (
    <div className="px-6 py-16 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f2f4f7] text-[#667085]">
        <Boxes size={21} />
      </div>

      <p className="mt-4 font-semibold text-[#101828]">No inventory yet</p>

      <p className="mt-2 text-sm text-[#667085]">
        Add your first product before recording inventory movements.
      </p>

      <Link
        href="/app/products/new"
        className="mt-5 inline-flex h-10 items-center justify-center rounded-xl bg-[#101828] px-5 text-sm font-semibold text-white"
      >
        Add product
      </Link>
    </div>
  );
}

function formatMovementType(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}