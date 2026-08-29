import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export default async function NewProductPage() {
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

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });

  async function createProduct(formData: FormData) {
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
      return typeof value === "string" ? value.trim() : "";
    };

    const getNumber = (field: string, fallback = 0) => {
      const value = Number(getString(field));
      return Number.isFinite(value) ? value : fallback;
    };

    const name = getString("name");

    if (!name) {
      redirect("/app/products/new?error=Product name is required");
    }

    const categoryId = getString("category_id");

    const { error } = await supabase.from("products").insert({
      organization_id: membership.organization_id,
      created_by: user.id,
      name,
      description: getString("description") || null,
      sku: getString("sku") || null,
      barcode: getString("barcode") || null,
      brand: getString("brand") || null,
      category_id: categoryId || null,
      image_url: getString("image_url") || null,
      cost_price: getNumber("cost_price"),
      selling_price: getNumber("selling_price"),
      current_stock: getNumber("current_stock"),
      reserved_stock: 0,
      reorder_level: getNumber("reorder_level"),
      vat_rate: getNumber("vat_rate", 23),
      unit: getString("unit") || "unit",
      status: getString("status") || "active",
    });

    if (error) {
      redirect(
        `/app/products/new?error=${encodeURIComponent(error.message)}`,
      );
    }

    revalidatePath("/app/products");
    redirect("/app/products");
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/app/products"
            className="text-sm font-semibold text-[#667085] hover:text-[#101828]"
          >
            ← Back to products
          </Link>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight">
            New product
          </h1>

          <p className="mt-2 text-[#667085]">
            Add product details, pricing and initial stock information.
          </p>
        </div>
      </div>

      <form action={createProduct} className="mt-8 space-y-6">
        <section className="rounded-2xl border border-[#eaecf0] bg-white p-6 shadow-sm">
          <div>
            <h2 className="font-semibold">Basic information</h2>
            <p className="mt-1 text-sm text-[#667085]">
              The main information used to identify this product.
            </p>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <label className="md:col-span-2">
              <span className="text-sm font-medium">
                Product name <span className="text-red-600">*</span>
              </span>

              <input
                required
                name="name"
                type="text"
                placeholder="Example: Wireless Bluetooth Headphones"
                className="mt-2 h-11 w-full rounded-xl border border-[#d0d5dd] px-4 text-sm outline-none transition placeholder:text-[#98a2b3] focus:border-[#101828]"
              />
            </label>

            <label>
              <span className="text-sm font-medium">SKU</span>

              <input
                name="sku"
                type="text"
                placeholder="Example: WH-1001"
                className="mt-2 h-11 w-full rounded-xl border border-[#d0d5dd] px-4 text-sm outline-none transition placeholder:text-[#98a2b3] focus:border-[#101828]"
              />
            </label>

            <label>
              <span className="text-sm font-medium">Barcode</span>

              <input
                name="barcode"
                type="text"
                placeholder="Scan or enter barcode"
                className="mt-2 h-11 w-full rounded-xl border border-[#d0d5dd] px-4 text-sm outline-none transition placeholder:text-[#98a2b3] focus:border-[#101828]"
              />
            </label>

            <label>
              <span className="text-sm font-medium">Brand</span>

              <input
                name="brand"
                type="text"
                placeholder="Example: Samsung"
                className="mt-2 h-11 w-full rounded-xl border border-[#d0d5dd] px-4 text-sm outline-none transition placeholder:text-[#98a2b3] focus:border-[#101828]"
              />
            </label>

            <label>
              <span className="text-sm font-medium">Category</span>

              <select
                name="category_id"
                defaultValue=""
                className="mt-2 h-11 w-full rounded-xl border border-[#d0d5dd] bg-white px-4 text-sm outline-none focus:border-[#101828]"
              >
                <option value="">Uncategorized</option>

                {categories?.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="md:col-span-2">
              <span className="text-sm font-medium">Description</span>

              <textarea
                name="description"
                rows={5}
                placeholder="Describe the product..."
                className="mt-2 w-full rounded-xl border border-[#d0d5dd] px-4 py-3 text-sm outline-none transition placeholder:text-[#98a2b3] focus:border-[#101828]"
              />
            </label>

            <label className="md:col-span-2">
              <span className="text-sm font-medium">Image URL</span>

              <input
                name="image_url"
                type="url"
                placeholder="https://example.com/product-image.jpg"
                className="mt-2 h-11 w-full rounded-xl border border-[#d0d5dd] px-4 text-sm outline-none transition placeholder:text-[#98a2b3] focus:border-[#101828]"
              />
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-[#eaecf0] bg-white p-6 shadow-sm">
          <div>
            <h2 className="font-semibold">Pricing</h2>
            <p className="mt-1 text-sm text-[#667085]">
              Set the purchase cost, selling price and applicable VAT.
            </p>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-3">
            <label>
              <span className="text-sm font-medium">Cost price</span>

              <input
                name="cost_price"
                type="number"
                min="0"
                step="0.01"
                defaultValue="0"
                className="mt-2 h-11 w-full rounded-xl border border-[#d0d5dd] px-4 text-sm outline-none focus:border-[#101828]"
              />
            </label>

            <label>
              <span className="text-sm font-medium">Selling price</span>

              <input
                name="selling_price"
                type="number"
                min="0"
                step="0.01"
                defaultValue="0"
                className="mt-2 h-11 w-full rounded-xl border border-[#d0d5dd] px-4 text-sm outline-none focus:border-[#101828]"
              />
            </label>

            <label>
              <span className="text-sm font-medium">VAT rate (%)</span>

              <input
                name="vat_rate"
                type="number"
                min="0"
                step="0.01"
                defaultValue="23"
                className="mt-2 h-11 w-full rounded-xl border border-[#d0d5dd] px-4 text-sm outline-none focus:border-[#101828]"
              />
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-[#eaecf0] bg-white p-6 shadow-sm">
          <div>
            <h2 className="font-semibold">Inventory</h2>
            <p className="mt-1 text-sm text-[#667085]">
              Configure the initial stock and low-stock threshold.
            </p>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-3">
            <label>
              <span className="text-sm font-medium">Current stock</span>

              <input
                name="current_stock"
                type="number"
                step="0.01"
                defaultValue="0"
                className="mt-2 h-11 w-full rounded-xl border border-[#d0d5dd] px-4 text-sm outline-none focus:border-[#101828]"
              />
            </label>

            <label>
              <span className="text-sm font-medium">Reorder level</span>

              <input
                name="reorder_level"
                type="number"
                min="0"
                step="0.01"
                defaultValue="0"
                className="mt-2 h-11 w-full rounded-xl border border-[#d0d5dd] px-4 text-sm outline-none focus:border-[#101828]"
              />
            </label>

            <label>
              <span className="text-sm font-medium">Unit</span>

              <select
                name="unit"
                defaultValue="unit"
                className="mt-2 h-11 w-full rounded-xl border border-[#d0d5dd] bg-white px-4 text-sm outline-none focus:border-[#101828]"
              >
                <option value="unit">Unit</option>
                <option value="piece">Piece</option>
                <option value="box">Box</option>
                <option value="pack">Pack</option>
                <option value="kg">Kilogram</option>
                <option value="g">Gram</option>
                <option value="l">Litre</option>
                <option value="ml">Millilitre</option>
                <option value="m">Metre</option>
              </select>
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-[#eaecf0] bg-white p-6 shadow-sm">
          <h2 className="font-semibold">Product status</h2>

          <div className="mt-5 max-w-sm">
            <label>
              <span className="text-sm font-medium">Status</span>

              <select
                name="status"
                defaultValue="active"
                className="mt-2 h-11 w-full rounded-xl border border-[#d0d5dd] bg-white px-4 text-sm outline-none focus:border-[#101828]"
              >
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
          </div>
        </section>

        <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
          <Link
            href="/app/products"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-[#d0d5dd] bg-white px-5 text-sm font-semibold text-[#344054]"
          >
            Cancel
          </Link>

          <button
            type="submit"
            className="h-11 rounded-xl bg-[#101828] px-6 text-sm font-semibold text-white transition hover:bg-[#344054]"
          >
            Save product
          </button>
        </div>
      </form>
    </div>
  );
}
