import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  ArrowLeft,
  ArrowUpRight,
  Boxes,
  PackageMinus,
  TriangleAlert,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";

type StockOutPageProps = {
  searchParams: Promise<{
    product?: string;
    error?: string;
  }>;
};

export default async function StockOutPage({
  searchParams,
}: StockOutPageProps) {
  const params = await searchParams;

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

  const { data: products } = await supabase
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
        status
      `,
    )
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });

  const safeProducts = products ?? [];

  const selectedProduct =
    safeProducts.find(
      (product) => product.id === params.product,
    ) ?? safeProducts[0];

  async function removeStock(formData: FormData) {
    "use server";

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

    const getString = (field: string) => {
      const value = formData.get(field);

      return typeof value === "string"
        ? value.trim()
        : "";
    };

    const productId = getString("product_id");
    const quantity = Number(
      getString("quantity"),
    );

    const reason = getString("reason");
    const notes = getString("notes");

    if (!productId) {
      redirect(
        `/app/inventory/stock-out?error=${encodeURIComponent(
          "Please select a product.",
        )}`,
      );
    }

    if (
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      redirect(
        `/app/inventory/stock-out?product=${encodeURIComponent(
          productId,
        )}&error=${encodeURIComponent(
          "Quantity must be greater than zero.",
        )}`,
      );
    }

    /*
     * Confirm that the selected product belongs
     * to this user's organization.
     */
    const { data: product } = await supabase
      .from("products")
      .select("id")
      .eq("id", productId)
      .eq(
        "organization_id",
        membership.organization_id,
      )
      .maybeSingle();

    if (!product) {
      redirect(
        `/app/inventory/stock-out?error=${encodeURIComponent(
          "Product was not found.",
        )}`,
      );
    }

    /*
     * IMPORTANT:
     *
     * We do NOT update products.current_stock
     * directly from this page.
     *
     * The database trigger:
     *
     * apply_inventory_movement()
     *
     * will calculate:
     *
     * current_stock - quantity
     *
     * and record both:
     *
     * before_stock
     * after_stock
     *
     * Negative inventory is intentionally allowed.
     */
    const { error } = await supabase
      .from("inventory_movements")
      .insert({
        organization_id:
          membership.organization_id,

        product_id: productId,

        movement_type: "stock_out",

        quantity,

        source: "manual",

        reason: reason || null,

        notes: notes || null,

        created_by: user.id,
      });

    if (error) {
      redirect(
        `/app/inventory/stock-out?product=${encodeURIComponent(
          productId,
        )}&error=${encodeURIComponent(
          error.message,
        )}`,
      );
    }

    revalidatePath("/app/inventory");
    revalidatePath("/app/products");
    revalidatePath(
      `/app/products/${productId}`,
    );

    redirect(
      "/app/inventory?success=stock-out",
    );
  }

  if (safeProducts.length === 0) {
    return (
      <div className="mx-auto max-w-4xl">
        <Link
          href="/app/inventory"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#667085] transition hover:text-[#101828]"
        >
          <ArrowLeft size={16} />
          Back to inventory
        </Link>

        <section className="mt-8 rounded-2xl border border-[#eaecf0] bg-white px-6 py-16 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f2f4f7] text-[#667085]">
            <Boxes size={24} />
          </div>

          <h1 className="mt-5 text-2xl font-semibold text-[#101828]">
            No products available
          </h1>

          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#667085]">
            Create a product before recording
            stock movements.
          </p>

          <Link
            href="/app/products/new"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[#101828] px-6 text-sm font-semibold text-white"
          >
            Add product
          </Link>
        </section>
      </div>
    );
  }

  const currentStock = Number(
    selectedProduct?.current_stock ?? 0,
  );

  const reservedStock = Number(
    selectedProduct?.reserved_stock ?? 0,
  );

  const availableStock =
    currentStock - reservedStock;

  return (
    <div className="mx-auto max-w-5xl">
      {/* HEADER */}
      <div>
        <Link
          href="/app/inventory"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#667085] transition hover:text-[#101828]"
        >
          <ArrowLeft size={16} />
          Back to inventory
        </Link>

        <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-700">
                <ArrowUpRight size={20} />
              </div>

              <h1 className="text-3xl font-semibold tracking-tight text-[#101828]">
                Stock out
              </h1>
            </div>

            <p className="mt-3 max-w-xl text-sm leading-6 text-[#667085]">
              Remove stock from an existing product
              and preserve the movement in inventory history.
            </p>
          </div>
        </div>
      </div>

      {params.error ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {params.error}
        </div>
      ) : null}

      <form
        action={removeStock}
        className="mt-8 space-y-6"
      >
        {/* PRODUCT */}
        <section className="rounded-2xl border border-[#eaecf0] bg-white p-6 shadow-sm">
          <div>
            <h2 className="font-semibold text-[#101828]">
              Product
            </h2>

            <p className="mt-1 text-sm text-[#667085]">
              Select the product you want to remove stock from.
            </p>
          </div>

          <div className="mt-6">
            <label>
              <span className="text-sm font-medium text-[#344054]">
                Product{" "}
                <span className="text-red-600">
                  *
                </span>
              </span>

              <select
                name="product_id"
                required
                defaultValue={
                  selectedProduct?.id ?? ""
                }
                className="mt-2 h-12 w-full rounded-xl border border-[#d0d5dd] bg-white px-4 text-sm outline-none focus:border-[#101828]"
              >
                {safeProducts.map((product) => (
                  <option
                    key={product.id}
                    value={product.id}
                  >
                    {product.name}
                    {product.sku
                      ? ` — ${product.sku}`
                      : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {selectedProduct ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-4">
              <InfoCard
                label="Current stock"
                value={`${formatQuantity(
                  currentStock,
                )} ${selectedProduct.unit}`}
              />

              <InfoCard
                label="Reserved"
                value={`${formatQuantity(
                  reservedStock,
                )} ${selectedProduct.unit}`}
              />

              <InfoCard
                label="Available"
                value={`${formatQuantity(
                  availableStock,
                )} ${selectedProduct.unit}`}
              />

              <InfoCard
                label="Reorder level"
                value={`${formatQuantity(
                  Number(
                    selectedProduct.reorder_level,
                  ),
                )} ${selectedProduct.unit}`}
              />
            </div>
          ) : null}
        </section>

        {/* QUANTITY */}
        <section className="rounded-2xl border border-[#eaecf0] bg-white p-6 shadow-sm">
          <div>
            <h2 className="font-semibold text-[#101828]">
              Stock quantity
            </h2>

            <p className="mt-1 text-sm text-[#667085]">
              Enter the quantity being removed.
            </p>
          </div>

          <div className="mt-6 max-w-md">
            <label>
              <span className="text-sm font-medium text-[#344054]">
                Quantity{" "}
                <span className="text-red-600">
                  *
                </span>
              </span>

              <div className="relative mt-2">
                <input
                  required
                  name="quantity"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="Example: 5"
                  className="h-12 w-full rounded-xl border border-[#d0d5dd] px-4 pr-20 text-sm outline-none transition placeholder:text-[#98a2b3] focus:border-[#101828]"
                />

                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-[#667085]">
                  {selectedProduct?.unit ||
                    "unit"}
                </span>
              </div>
            </label>
          </div>
        </section>

        {/* DETAILS */}
        <section className="rounded-2xl border border-[#eaecf0] bg-white p-6 shadow-sm">
          <div>
            <h2 className="font-semibold text-[#101828]">
              Movement details
            </h2>

            <p className="mt-1 text-sm text-[#667085]">
              Add context explaining why the stock is being removed.
            </p>
          </div>

          <div className="mt-6 grid gap-5">
            <label>
              <span className="text-sm font-medium text-[#344054]">
                Reason
              </span>

              <input
                name="reason"
                type="text"
                placeholder="Example: Damaged stock, manual sale, wastage..."
                className="mt-2 h-11 w-full rounded-xl border border-[#d0d5dd] px-4 text-sm outline-none transition placeholder:text-[#98a2b3] focus:border-[#101828]"
              />
            </label>

            <label>
              <span className="text-sm font-medium text-[#344054]">
                Notes
              </span>

              <textarea
                name="notes"
                rows={4}
                placeholder="Optional notes about this stock removal..."
                className="mt-2 w-full rounded-xl border border-[#d0d5dd] px-4 py-3 text-sm outline-none transition placeholder:text-[#98a2b3] focus:border-[#101828]"
              />
            </label>
          </div>
        </section>

        {/* NEGATIVE STOCK WARNING */}
        <section className="rounded-2xl border border-orange-200 bg-orange-50 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-orange-700 shadow-sm">
              <TriangleAlert size={19} />
            </div>

            <div>
              <h2 className="font-semibold text-orange-900">
                Negative inventory is allowed
              </h2>

              <p className="mt-1 text-sm leading-6 text-orange-700">
                SAMZY will record the stock movement even
                if the resulting quantity becomes negative.
                This keeps the inventory history accurate
                and makes stock discrepancies visible.
              </p>
            </div>
          </div>
        </section>

        {/* SUMMARY */}
        <section className="rounded-2xl border border-red-100 bg-red-50 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-red-700 shadow-sm">
              <PackageMinus size={19} />
            </div>

            <div>
              <h2 className="font-semibold text-red-900">
                Stock will be removed
              </h2>

              <p className="mt-1 text-sm leading-6 text-red-700">
                SAMZY will create an inventory movement
                and the database will automatically update
                the product&apos;s current stock.
              </p>
            </div>
          </div>
        </section>

        {/* ACTIONS */}
        <div className="flex flex-col-reverse justify-end gap-3 pb-10 sm:flex-row">
          <Link
            href="/app/inventory"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-[#d0d5dd] bg-white px-5 text-sm font-semibold text-[#344054] transition hover:bg-[#f9fafb]"
          >
            Cancel
          </Link>

          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-6 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            <ArrowUpRight size={16} />
            Remove stock
          </button>
        </div>
      </form>
    </div>
  );
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-[#eaecf0] bg-[#fcfcfd] p-4">
      <p className="text-xs text-[#667085]">
        {label}
      </p>

      <p className="mt-2 text-lg font-semibold text-[#101828]">
        {value}
      </p>
    </div>
  );
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: 2,
  }).format(value);
}