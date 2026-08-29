import Link from "next/link";
import {
  notFound,
  redirect,
} from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

type EditProductPageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function EditProductPage({
  params,
  searchParams,
}: EditProductPageProps) {
  const { id } = await params;
  const query = await searchParams;

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

  const [
    {
      data: product,
      error: productError,
    },
    { data: categories },
  ] = await Promise.all([
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
          category_id,
          image_url,
          cost_price,
          selling_price,
          current_stock,
          reserved_stock,
          reorder_level,
          vat_rate,
          unit,
          status
        `,
      )
      .eq("id", id)
      .eq(
        "organization_id",
        organizationId,
      )
      .maybeSingle(),

    supabase
      .from("categories")
      .select("id, name")
      .eq(
        "organization_id",
        organizationId,
      )
      .order("name", {
        ascending: true,
      }),
  ]);

  if (
    productError ||
    !product
  ) {
    notFound();
  }

  async function updateProduct(
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

    const getNumber = (
      field: string,
      fallback = 0,
    ) => {
      const value = Number(
        getString(field),
      );

      return Number.isFinite(
        value,
      )
        ? value
        : fallback;
    };

    const name =
      getString("name");

    if (!name) {
      redirect(
        `/app/products/${id}/edit?error=${encodeURIComponent(
          "Product name is required.",
        )}`,
      );
    }

    const categoryId =
      getString(
        "category_id",
      );

    /*
     * IMPORTANT:
     *
     * current_stock and reserved_stock
     * are intentionally NOT accepted
     * from this form.
     *
     * Inventory quantities are
     * system-managed and must only
     * change through inventory
     * movements.
     */
    const { error } =
      await supabase
        .from("products")
        .update({
          name,

          description:
            getString(
              "description",
            ) || null,

          sku:
            getString("sku") ||
            null,

          barcode:
            getString(
              "barcode",
            ) || null,

          brand:
            getString(
              "brand",
            ) || null,

          category_id:
            categoryId || null,

          image_url:
            getString(
              "image_url",
            ) || null,

          cost_price:
            getNumber(
              "cost_price",
            ),

          selling_price:
            getNumber(
              "selling_price",
            ),

          reorder_level:
            getNumber(
              "reorder_level",
            ),

          vat_rate:
            getNumber(
              "vat_rate",
              23,
            ),

          unit:
            getString("unit") ||
            "unit",

          status:
            getString(
              "status",
            ) || "active",
        })
        .eq("id", id)
        .eq(
          "organization_id",
          membership.organization_id,
        );

    if (error) {
      redirect(
        `/app/products/${id}/edit?error=${encodeURIComponent(
          error.message,
        )}`,
      );
    }

    revalidatePath(
      "/app/products",
    );

    revalidatePath(
      `/app/products/${id}`,
    );

    revalidatePath(
      `/app/products/${id}/edit`,
    );

    revalidatePath(
      "/app/inventory",
    );

    redirect(
      `/app/products/${id}`,
    );
  }

  const currentStock =
    Number(
      product.current_stock ??
        0,
    );

  const reservedStock =
    Number(
      product.reserved_stock ??
        0,
    );

  const availableStock =
    currentStock -
    reservedStock;

  const unit =
    product.unit ||
    "unit";

  return (
    <div className="mx-auto max-w-5xl">
      {/* HEADER */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href={`/app/products/${product.id}`}
            className="text-sm font-semibold text-[#667085] transition hover:text-[#101828]"
          >
            ← Back to product
          </Link>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#101828]">
            Edit product
          </h1>

          <p className="mt-2 text-[#667085]">
            Update product
            information, pricing and
            inventory settings.
          </p>
        </div>

        <span
          className={[
            "inline-flex h-10 items-center rounded-xl px-4 text-sm font-semibold capitalize",

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

      {query.error ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {query.error}
        </div>
      ) : null}

      <form
        action={updateProduct}
        className="mt-8 space-y-6"
      >
        {/* BASIC INFORMATION */}

        <section className="rounded-2xl border border-[#eaecf0] bg-white p-6 shadow-sm">
          <div>
            <h2 className="font-semibold text-[#101828]">
              Basic information
            </h2>

            <p className="mt-1 text-sm text-[#667085]">
              Update the main
              information used to
              identify this product.
            </p>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <label className="md:col-span-2">
              <span className="text-sm font-medium text-[#344054]">
                Product name{" "}
                <span className="text-red-600">
                  *
                </span>
              </span>

              <input
                required
                name="name"
                type="text"
                defaultValue={
                  product.name
                }
                placeholder="Example: Wireless Bluetooth Headphones"
                className="mt-2 h-11 w-full rounded-xl border border-[#d0d5dd] px-4 text-sm outline-none transition placeholder:text-[#98a2b3] focus:border-[#101828]"
              />
            </label>

            <label>
              <span className="text-sm font-medium text-[#344054]">
                SKU
              </span>

              <input
                name="sku"
                type="text"
                defaultValue={
                  product.sku ?? ""
                }
                placeholder="Example: WH-1001"
                className="mt-2 h-11 w-full rounded-xl border border-[#d0d5dd] px-4 text-sm outline-none transition placeholder:text-[#98a2b3] focus:border-[#101828]"
              />
            </label>

            <label>
              <span className="text-sm font-medium text-[#344054]">
                Barcode
              </span>

              <input
                name="barcode"
                type="text"
                defaultValue={
                  product.barcode ??
                  ""
                }
                placeholder="Scan or enter barcode"
                className="mt-2 h-11 w-full rounded-xl border border-[#d0d5dd] px-4 text-sm outline-none transition placeholder:text-[#98a2b3] focus:border-[#101828]"
              />
            </label>

            <label>
              <span className="text-sm font-medium text-[#344054]">
                Brand
              </span>

              <input
                name="brand"
                type="text"
                defaultValue={
                  product.brand ?? ""
                }
                placeholder="Example: Samsung"
                className="mt-2 h-11 w-full rounded-xl border border-[#d0d5dd] px-4 text-sm outline-none transition placeholder:text-[#98a2b3] focus:border-[#101828]"
              />
            </label>

            <label>
              <span className="text-sm font-medium text-[#344054]">
                Category
              </span>

              <select
                name="category_id"
                defaultValue={
                  product.category_id ??
                  ""
                }
                className="mt-2 h-11 w-full rounded-xl border border-[#d0d5dd] bg-white px-4 text-sm outline-none focus:border-[#101828]"
              >
                <option value="">
                  Uncategorized
                </option>

                {categories?.map(
                  (category) => (
                    <option
                      key={
                        category.id
                      }
                      value={
                        category.id
                      }
                    >
                      {
                        category.name
                      }
                    </option>
                  ),
                )}
              </select>
            </label>

            <label className="md:col-span-2">
              <span className="text-sm font-medium text-[#344054]">
                Description
              </span>

              <textarea
                name="description"
                rows={5}
                defaultValue={
                  product.description ??
                  ""
                }
                placeholder="Describe the product..."
                className="mt-2 w-full rounded-xl border border-[#d0d5dd] px-4 py-3 text-sm outline-none transition placeholder:text-[#98a2b3] focus:border-[#101828]"
              />
            </label>

            <label className="md:col-span-2">
              <span className="text-sm font-medium text-[#344054]">
                Image URL
              </span>

              <input
                name="image_url"
                type="url"
                defaultValue={
                  product.image_url ??
                  ""
                }
                placeholder="https://example.com/product-image.jpg"
                className="mt-2 h-11 w-full rounded-xl border border-[#d0d5dd] px-4 text-sm outline-none transition placeholder:text-[#98a2b3] focus:border-[#101828]"
              />
            </label>
          </div>
        </section>

        {/* PRICING */}

        <section className="rounded-2xl border border-[#eaecf0] bg-white p-6 shadow-sm">
          <div>
            <h2 className="font-semibold text-[#101828]">
              Pricing
            </h2>

            <p className="mt-1 text-sm text-[#667085]">
              Update the purchase
              cost, selling price and
              applicable VAT.
            </p>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-3">
            <label>
              <span className="text-sm font-medium text-[#344054]">
                Cost price
              </span>

              <input
                name="cost_price"
                type="number"
                min="0"
                step="0.01"
                defaultValue={
                  product.cost_price
                }
                className="mt-2 h-11 w-full rounded-xl border border-[#d0d5dd] px-4 text-sm outline-none focus:border-[#101828]"
              />
            </label>

            <label>
              <span className="text-sm font-medium text-[#344054]">
                Selling price
              </span>

              <input
                name="selling_price"
                type="number"
                min="0"
                step="0.01"
                defaultValue={
                  product.selling_price
                }
                className="mt-2 h-11 w-full rounded-xl border border-[#d0d5dd] px-4 text-sm outline-none focus:border-[#101828]"
              />
            </label>

            <label>
              <span className="text-sm font-medium text-[#344054]">
                VAT rate (%)
              </span>

              <input
                name="vat_rate"
                type="number"
                min="0"
                step="0.01"
                defaultValue={
                  product.vat_rate
                }
                className="mt-2 h-11 w-full rounded-xl border border-[#d0d5dd] px-4 text-sm outline-none focus:border-[#101828]"
              />
            </label>
          </div>
        </section>

        {/* INVENTORY */}

        <section className="rounded-2xl border border-[#eaecf0] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-semibold text-[#101828]">
                Inventory
              </h2>

              <p className="mt-1 text-sm text-[#667085]">
                Stock quantities are
                system-managed. You
                can update inventory
                settings here.
              </p>
            </div>

            <Link
              href={`/app/inventory/adjust?product=${encodeURIComponent(
                product.id,
              )}`}
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-violet-200 bg-violet-50 px-4 text-sm font-semibold text-violet-700 transition hover:bg-violet-100"
            >
              Adjust stock →
            </Link>
          </div>

          {/* READ-ONLY STOCK */}

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <InventoryCard
              label="Current stock"
              value={`${formatQuantity(
                currentStock,
              )} ${unit}`}
            />

            <InventoryCard
              label="Reserved"
              value={`${formatQuantity(
                reservedStock,
              )} ${unit}`}
            />

            <InventoryCard
              label="Available"
              value={`${formatQuantity(
                availableStock,
              )} ${unit}`}
            />
          </div>

          <div className="mt-5 rounded-xl border border-violet-100 bg-violet-50 px-4 py-4">
            <p className="text-sm font-semibold text-violet-900">
              Stock quantities are
              protected
            </p>

            <p className="mt-1 text-sm leading-6 text-violet-700">
              Current and reserved
              stock cannot be edited
              directly from Product
              settings. Use Purchases,
              Sales, Stock In, Stock
              Out or Adjust Stock so
              every inventory change
              remains auditable.
            </p>
          </div>

          {/* EDITABLE INVENTORY SETTINGS */}

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <label>
              <span className="text-sm font-medium text-[#344054]">
                Reorder level
              </span>

              <input
                name="reorder_level"
                type="number"
                min="0"
                step="0.01"
                defaultValue={
                  product.reorder_level
                }
                className="mt-2 h-11 w-full rounded-xl border border-[#d0d5dd] px-4 text-sm outline-none focus:border-[#101828]"
              />
            </label>

            <label>
              <span className="text-sm font-medium text-[#344054]">
                Unit
              </span>

              <select
                name="unit"
                defaultValue={
                  product.unit
                }
                className="mt-2 h-11 w-full rounded-xl border border-[#d0d5dd] bg-white px-4 text-sm outline-none focus:border-[#101828]"
              >
                <option value="unit">
                  Unit
                </option>

                <option value="piece">
                  Piece
                </option>

                <option value="box">
                  Box
                </option>

                <option value="pack">
                  Pack
                </option>

                <option value="kg">
                  Kilogram
                </option>

                <option value="g">
                  Gram
                </option>

                <option value="l">
                  Litre
                </option>

                <option value="ml">
                  Millilitre
                </option>

                <option value="m">
                  Metre
                </option>
              </select>
            </label>
          </div>
        </section>

        {/* STATUS */}

        <section className="rounded-2xl border border-[#eaecf0] bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-[#101828]">
            Product status
          </h2>

          <p className="mt-1 text-sm text-[#667085]">
            Control whether this
            product is currently
            active.
          </p>

          <div className="mt-5 max-w-sm">
            <label>
              <span className="text-sm font-medium text-[#344054]">
                Status
              </span>

              <select
                name="status"
                defaultValue={
                  product.status
                }
                className="mt-2 h-11 w-full rounded-xl border border-[#d0d5dd] bg-white px-4 text-sm outline-none focus:border-[#101828]"
              >
                <option value="active">
                  Active
                </option>

                <option value="draft">
                  Draft
                </option>

                <option value="inactive">
                  Inactive
                </option>
              </select>
            </label>
          </div>
        </section>

        {/* ACTIONS */}

        <div className="flex flex-col-reverse justify-end gap-3 pb-10 sm:flex-row">
          <Link
            href={`/app/products/${product.id}`}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-[#d0d5dd] bg-white px-5 text-sm font-semibold text-[#344054] transition hover:bg-[#f9fafb]"
          >
            Cancel
          </Link>

          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[#101828] px-6 text-sm font-semibold text-white transition hover:bg-black"
          >
            Save changes
          </button>
        </div>
      </form>
    </div>
  );
}

function InventoryCard({
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

function formatQuantity(
  value: number,
) {
  return new Intl.NumberFormat(
    "en-GB",
    {
      maximumFractionDigits:
        2,
    },
  ).format(value);
}