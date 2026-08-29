import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type ProductsPageProps = {
  searchParams: Promise<{
    search?: string;
    category?: string;
    status?: string;
  }>;
};

type ProductCategory = {
  name: string;
  color: string;
};

export default async function ProductsPage({
  searchParams,
}: ProductsPageProps) {
  const filters = await searchParams;

  const search = filters.search?.trim() ?? "";
  const categoryFilter = filters.category ?? "";
  const statusFilter = filters.status ?? "";

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

  const [{ data: organization }, { data: categories }] = await Promise.all([
    supabase
      .from("organizations")
      .select("currency")
      .eq("id", organizationId)
      .single(),

    supabase
      .from("categories")
      .select("id, name, color")
      .eq("organization_id", organizationId)
      .order("name", { ascending: true }),
  ]);

  let productsQuery = supabase
    .from("products")
    .select(
      `
        id,
        name,
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
        status,
        updated_at,
        category_id,
        categories (
          name,
          color
        )
      `,
    )
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false });

  if (search) {
    const escapedSearch = search.replaceAll(",", " ");

    productsQuery = productsQuery.or(
      `name.ilike.%${escapedSearch}%,sku.ilike.%${escapedSearch}%,barcode.ilike.%${escapedSearch}%,brand.ilike.%${escapedSearch}%`,
    );
  }

  if (categoryFilter) {
    productsQuery = productsQuery.eq("category_id", categoryFilter);
  }

  if (statusFilter) {
    productsQuery = productsQuery.eq("status", statusFilter);
  }

  const { data: products, error } = await productsQuery;

  const currency = organization?.currency || "EUR";

  const moneyFormatter = new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency,
  });

  const totalProducts = products?.length ?? 0;

  const lowStockProducts =
    products?.filter(
      (product) => product.current_stock <= product.reorder_level,
    ).length ?? 0;

  const activeProducts =
    products?.filter((product) => product.status === "active").length ?? 0;

  return (
    <div className="mx-auto max-w-[1500px]">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Products</h1>

          <p className="mt-2 text-[#667085]">
            Manage product information, pricing and stock levels.
          </p>
        </div>

        <Link
          href="/app/products/new"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-[#101828] px-5 text-sm font-semibold text-white transition hover:bg-[#344054]"
        >
          + New product
        </Link>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-[#eaecf0] bg-white p-5 shadow-sm">
          <p className="text-sm text-[#667085]">Total products</p>
          <p className="mt-2 text-2xl font-semibold">{totalProducts}</p>
        </article>

        <article className="rounded-2xl border border-[#eaecf0] bg-white p-5 shadow-sm">
          <p className="text-sm text-[#667085]">Active products</p>
          <p className="mt-2 text-2xl font-semibold">{activeProducts}</p>
        </article>

        <article className="rounded-2xl border border-[#eaecf0] bg-white p-5 shadow-sm">
          <p className="text-sm text-[#667085]">Low-stock products</p>
          <p className="mt-2 text-2xl font-semibold">{lowStockProducts}</p>
        </article>
      </section>

      <section className="mt-6 rounded-2xl border border-[#eaecf0] bg-white shadow-sm">
        <div className="border-b border-[#eaecf0] p-5">
          <form
            method="GET"
            className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_220px_180px_auto]"
          >
            <input
              type="search"
              name="search"
              defaultValue={search}
              placeholder="Search by name, SKU, barcode or brand..."
              className="h-11 rounded-xl border border-[#d0d5dd] bg-white px-4 text-sm outline-none transition placeholder:text-[#98a2b3] focus:border-[#101828]"
            />

            <select
              name="category"
              defaultValue={categoryFilter}
              className="h-11 rounded-xl border border-[#d0d5dd] bg-white px-4 text-sm outline-none focus:border-[#101828]"
            >
              <option value="">All categories</option>

              {categories?.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>

            <select
              name="status"
              defaultValue={statusFilter}
              className="h-11 rounded-xl border border-[#d0d5dd] bg-white px-4 text-sm outline-none focus:border-[#101828]"
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="inactive">Inactive</option>
            </select>

            <div className="flex gap-2">
              <button
                type="submit"
                className="h-11 rounded-xl bg-[#101828] px-5 text-sm font-semibold text-white"
              >
                Filter
              </button>

              <Link
                href="/app/products"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-[#d0d5dd] px-4 text-sm font-semibold text-[#344054]"
              >
                Reset
              </Link>
            </div>
          </form>
        </div>

        {error ? (
          <div className="p-10 text-center">
            <p className="font-semibold text-red-700">
              Products could not be loaded
            </p>

            <p className="mt-2 text-sm text-[#667085]">{error.message}</p>
          </div>
        ) : !products || products.length === 0 ? (
          <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f2f4f7] text-2xl">
              □
            </div>

            <h2 className="mt-5 text-lg font-semibold">No products found</h2>

            <p className="mt-2 max-w-md text-sm text-[#667085]">
              {search || categoryFilter || statusFilter
                ? "No products match the selected search or filters."
                : "Create your first product to begin managing inventory and pricing."}
            </p>

            <Link
              href="/app/products/new"
              className="mt-5 inline-flex h-11 items-center rounded-xl bg-[#101828] px-5 text-sm font-semibold text-white"
            >
              + Add product
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] border-collapse">
              <thead>
                <tr className="border-b border-[#eaecf0] bg-[#f9fafb] text-left text-xs font-semibold uppercase tracking-wide text-[#667085]">
                  <th className="px-5 py-4">Product</th>
                  <th className="px-5 py-4">Category</th>
                  <th className="px-5 py-4">SKU</th>
                  <th className="px-5 py-4">Stock</th>
                  <th className="px-5 py-4">Selling price</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Action</th>
                </tr>
              </thead>

              <tbody>
                {products.map((product) => {
                  const rawCategory = product.categories;

                  const category = (
                    Array.isArray(rawCategory)
                      ? rawCategory[0]
                      : rawCategory
                  ) as ProductCategory | null;

                  const availableStock =
                    product.current_stock - product.reserved_stock;

                  const isLowStock =
                    product.current_stock <= product.reorder_level;

                  return (
                    <tr
                      key={product.id}
                      className="border-b border-[#f2f4f7] transition last:border-0 hover:bg-[#fcfcfd]"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#f2f4f7] text-sm font-semibold text-[#475467]">
                            {product.image_url ? (
                              <Image
                                src={product.image_url}
                                alt={product.name}
                                width={44}
                                height={44}
                                unoptimized
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              product.name.charAt(0).toUpperCase()
                            )}
                          </div>

                          <div>
                            <p className="max-w-72 truncate text-sm font-semibold">
                              {product.name}
                            </p>

                            <p className="mt-1 text-xs text-[#98a2b3]">
                              {product.brand || "No brand"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        {category ? (
                          <span
                            className="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
                            style={{
                              backgroundColor: `${category.color}18`,
                              color: category.color,
                            }}
                          >
                            {category.name}
                          </span>
                        ) : (
                          <span className="text-sm text-[#98a2b3]">
                            Uncategorized
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-sm text-[#475467]">
                        {product.sku || "—"}
                      </td>

                      <td className="px-5 py-4">
                        <p
                          className={`text-sm font-semibold ${
                            isLowStock
                              ? "text-orange-700"
                              : "text-[#101828]"
                          }`}
                        >
                          {availableStock} {product.unit}
                        </p>

                        {isLowStock && (
                          <p className="mt-1 text-xs text-orange-700">
                            Low stock
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4 text-sm font-semibold">
                        {moneyFormatter.format(product.selling_price)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={[
                            "inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize",
                            product.status === "active"
                              ? "bg-emerald-50 text-emerald-700"
                              : product.status === "draft"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-[#f2f4f7] text-[#475467]",
                          ].join(" ")}
                        >
                          {product.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/app/products/${product.id}`}
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