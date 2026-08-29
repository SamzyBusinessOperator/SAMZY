import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  ArrowLeft,
  Boxes,
  Scale,
  TriangleAlert,
} from "lucide-react";

import AdjustStockProductSelector from "@/app/components/inventory/AdjustStockProductSelector";
import { createClient } from "@/lib/supabase/server";

type AdjustStockPageProps = {
  searchParams: Promise<{
    product?: string;
    error?: string;
  }>;
};

type ProductRow = {
  id: string;
  name: string;
  sku: string | null;
  brand: string | null;
  current_stock: number | string | null;
  reserved_stock: number | string | null;
  reorder_level: number | string | null;
  unit: string | null;
  status: string;
};

export default async function AdjustStockPage({
  searchParams,
}: AdjustStockPageProps) {
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

  const organizationId =
    membership.organization_id;

  const {
    data: products,
    error: productsError,
  } = await supabase
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
    .eq(
      "organization_id",
      organizationId,
    )
    .order("name", {
      ascending: true,
    });

  if (productsError) {
    throw new Error(
      `Unable to load products: ${productsError.message}`,
    );
  }

  const safeProducts =
    (products ?? []) as ProductRow[];

  const requestedProduct =
    params.product
      ? safeProducts.find(
          (product) =>
            product.id === params.product,
        )
      : null;

  const selectedProduct =
    requestedProduct ??
    safeProducts[0] ??
    null;

  async function adjustStock(
    formData: FormData,
  ) {
    "use server";

    const supabase =
      await createClient();

    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    const {
      data: membership,
    } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (!membership) {
      redirect("/onboarding");
    }

    const getString = (
      field: string,
    ) => {
      const value =
        formData.get(field);

      return typeof value ===
        "string"
        ? value.trim()
        : "";
    };

    const productId =
      getString("product_id");

    const actualStock =
      Number(
        getString(
          "actual_stock",
        ),
      );

    const reason =
      getString("reason");

    const notes =
      getString("notes");

    if (!productId) {
      redirect(
        `/app/inventory/adjust?error=${encodeURIComponent(
          "Please select a product.",
        )}`,
      );
    }

    if (
      !Number.isFinite(
        actualStock,
      )
    ) {
      redirect(
        `/app/inventory/adjust?product=${encodeURIComponent(
          productId,
        )}&error=${encodeURIComponent(
          "Actual counted stock must be a valid number.",
        )}`,
      );
    }

    /*
     * Re-read the selected product from the database
     * at submission time.
     *
     * Never trust stock values rendered in the browser.
     */
    const {
      data: product,
      error: productError,
    } = await supabase
      .from("products")
      .select(
        `
          id,
          name,
          current_stock
        `,
      )
      .eq(
        "id",
        productId,
      )
      .eq(
        "organization_id",
        membership.organization_id,
      )
      .maybeSingle();

    if (
      productError ||
      !product
    ) {
      redirect(
        `/app/inventory/adjust?error=${encodeURIComponent(
          productError?.message ||
            "Product was not found.",
        )}`,
      );
    }

    const currentStock =
      Number(
        product.current_stock ??
          0,
      );

    const difference =
      actualStock -
      currentStock;

    if (difference === 0) {
      redirect(
        `/app/inventory/adjust?product=${encodeURIComponent(
          productId,
        )}&error=${encodeURIComponent(
          "No adjustment is required because the counted stock matches the system stock.",
        )}`,
      );
    }

    const movementType =
      difference > 0
        ? "adjustment_in"
        : "adjustment_out";

    const quantity =
      Math.abs(
        difference,
      );

    const { error } =
      await supabase
        .from(
          "inventory_movements",
        )
        .insert({
          organization_id:
            membership.organization_id,

          product_id:
            productId,

          movement_type:
            movementType,

          quantity,

          source:
            "manual",

          reason:
            reason ||
            "Stock count adjustment",

          notes:
            notes || null,

          created_by:
            user.id,
        });

    if (error) {
      redirect(
        `/app/inventory/adjust?product=${encodeURIComponent(
          productId,
        )}&error=${encodeURIComponent(
          error.message,
        )}`,
      );
    }

    revalidatePath(
      "/app/inventory",
    );

    revalidatePath(
      "/app/products",
    );

    revalidatePath(
      `/app/products/${productId}`,
    );

    revalidatePath(
      `/app/inventory/adjust?product=${productId}`,
    );

    redirect(
      "/app/inventory?success=adjustment",
    );
  }

  if (
    safeProducts.length === 0 ||
    !selectedProduct
  ) {
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
            Create a product before
            making an inventory
            adjustment.
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

  const clientProducts =
    safeProducts.map(
      (product) => ({
        id: product.id,
        name: product.name,
        sku: product.sku,

        current_stock:
          Number(
            product.current_stock ??
              0,
          ),

        reserved_stock:
          Number(
            product.reserved_stock ??
              0,
          ),

        reorder_level:
          Number(
            product.reorder_level ??
              0,
          ),

        unit:
          product.unit,
      }),
    );

  return (
    <div className="mx-auto max-w-5xl">
      <div>
        <Link
          href="/app/inventory"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#667085] transition hover:text-[#101828]"
        >
          <ArrowLeft size={16} />
          Back to inventory
        </Link>

        <div className="mt-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
            <Scale size={20} />
          </div>

          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-[#101828]">
              Adjust stock
            </h1>

            <p className="mt-2 text-sm text-[#667085]">
              Reconcile SAMZY inventory
              with the actual physical
              stock count.
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
        key={selectedProduct.id}
        action={adjustStock}
        className="mt-8 space-y-6"
      >
        <section className="rounded-2xl border border-[#eaecf0] bg-white p-6 shadow-sm">
          <div>
            <h2 className="font-semibold text-[#101828]">
              Product
            </h2>

            <p className="mt-1 text-sm text-[#667085]">
              Select the product you
              physically counted.
            </p>
          </div>

          <AdjustStockProductSelector
            products={
              clientProducts
            }
            selectedProductId={
              selectedProduct.id
            }
          />
        </section>

        <section className="rounded-2xl border border-[#eaecf0] bg-white p-6 shadow-sm">
          <div>
            <h2 className="font-semibold text-[#101828]">
              Physical stock count
            </h2>

            <p className="mt-1 text-sm text-[#667085]">
              Enter the quantity you
              actually counted.
            </p>
          </div>

          <div className="mt-6 max-w-md">
            <label>
              <span className="text-sm font-medium text-[#344054]">
                Actual counted stock{" "}
                <span className="text-red-600">
                  *
                </span>
              </span>

              <div className="relative mt-2">
                <input
                  required
                  name="actual_stock"
                  type="number"
                  step="0.01"
                  placeholder="Example: 12"
                  className="h-12 w-full rounded-xl border border-[#d0d5dd] px-4 pr-20 text-sm outline-none transition placeholder:text-[#98a2b3] focus:border-[#101828]"
                />

                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-[#667085]">
                  {selectedProduct.unit ||
                    "unit"}
                </span>
              </div>
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-[#eaecf0] bg-white p-6 shadow-sm">
          <div>
            <h2 className="font-semibold text-[#101828]">
              Adjustment details
            </h2>

            <p className="mt-1 text-sm text-[#667085]">
              Explain why the physical
              count differs from the
              recorded stock.
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
                placeholder="Example: Physical stock count"
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
                placeholder="Optional notes about this reconciliation..."
                className="mt-2 w-full rounded-xl border border-[#d0d5dd] px-4 py-3 text-sm outline-none transition placeholder:text-[#98a2b3] focus:border-[#101828]"
              />
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-violet-100 bg-violet-50 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-violet-700 shadow-sm">
              <Scale size={19} />
            </div>

            <div>
              <h2 className="font-semibold text-violet-900">
                SAMZY calculates the
                difference
              </h2>

              <p className="mt-1 text-sm leading-6 text-violet-700">
                If the physical count is
                higher than the system
                stock, SAMZY creates an
                Adjustment In. If it is
                lower, SAMZY creates an
                Adjustment Out.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-orange-200 bg-orange-50 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-orange-700 shadow-sm">
              <TriangleAlert
                size={19}
              />
            </div>

            <div>
              <h2 className="font-semibold text-orange-900">
                Inventory history
                remains intact
              </h2>

              <p className="mt-1 text-sm leading-6 text-orange-700">
                SAMZY does not overwrite
                historical movements. The
                correction is recorded as
                a new adjustment so every
                stock change remains
                auditable.
              </p>
            </div>
          </div>
        </section>

        <div className="flex flex-col-reverse justify-end gap-3 pb-10 sm:flex-row">
          <Link
            href="/app/inventory"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-[#d0d5dd] bg-white px-5 text-sm font-semibold text-[#344054] transition hover:bg-[#f9fafb]"
          >
            Cancel
          </Link>

          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 text-sm font-semibold text-white transition hover:bg-violet-700"
          >
            <Scale size={16} />
            Apply adjustment
          </button>
        </div>
      </form>
    </div>
  );
}