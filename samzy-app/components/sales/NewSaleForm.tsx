"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
} from "lucide-react";

type Product = {
  id: string;
  name: string;
  sku: string | null;
  selling_price: number | null;
  current_stock: number | null;
  vat_rate: number | null;
};

type SaleItem = {
  productId: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  discountAmount: number;
};

type Props = {
  products: Product[];
  action: (formData: FormData) => void | Promise<void>;
};

export default function NewSaleForm({
  products,
  action,
}: Props) {
  const [items, setItems] = useState<SaleItem[]>([]);
  const [search, setSearch] = useState("");

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return [];
    }

    return products
      .filter((product) => {
        const name = product.name.toLowerCase();
        const sku = (product.sku || "").toLowerCase();

        return (
          name.includes(query) ||
          sku.includes(query)
        );
      })
      .slice(0, 8);
  }, [products, search]);

  const totals = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        const quantity = Number(item.quantity || 0);
        const unitPrice = Number(item.unitPrice || 0);
        const vatRate = Number(item.vatRate || 0);

        const requestedDiscount = Number(
          item.discountAmount || 0,
        );

        // Selling price is VAT-INCLUSIVE.
        const gross = quantity * unitPrice;

        const discount = Math.min(
          Math.max(requestedDiscount, 0),
          gross,
        );

        // This is the final amount the customer pays
        // for this line after discount.
        const total = gross - discount;

        // Extract VAT from the VAT-inclusive total.
        //
        // Example:
        // €4.98 including 23% VAT
        // VAT = 4.98 × 23 / 123
        const vat =
          vatRate > 0
            ? total *
              (vatRate / (100 + vatRate))
            : 0;

        const net = total - vat;

        acc.subtotal += gross;
        acc.discount += discount;
        acc.net += net;
        acc.vat += vat;
        acc.total += total;

        return acc;
      },
      {
        subtotal: 0,
        discount: 0,
        net: 0,
        vat: 0,
        total: 0,
      },
    );
  }, [items]);

  function addProduct(product: Product) {
    setItems((current) => {
      const existing = current.find(
        (item) =>
          item.productId === product.id,
      );

      if (existing) {
        return current.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity:
                  item.quantity + 1,
              }
            : item,
        );
      }

      return [
        ...current,
        {
          productId: product.id,
          quantity: 1,
          unitPrice: Number(
            product.selling_price || 0,
          ),
          vatRate: Number(
            product.vat_rate || 0,
          ),
          discountAmount: 0,
        },
      ];
    });

    setSearch("");
  }

  function updateItem(
    productId: string,
    patch: Partial<SaleItem>,
  ) {
    setItems((current) =>
      current.map((item) =>
        item.productId === productId
          ? {
              ...item,
              ...patch,
            }
          : item,
      ),
    );
  }

  function removeItem(productId: string) {
    setItems((current) =>
      current.filter(
        (item) =>
          item.productId !== productId,
      ),
    );
  }

  function getProduct(productId: string) {
    return products.find(
      (product) =>
        product.id === productId,
    );
  }

  return (
    <form action={action}>
      <input
        type="hidden"
        name="items"
        value={JSON.stringify(items)}
      />

      <div className="mx-auto max-w-[1500px]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              href="/app/sales"
              className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-[#667085] transition hover:text-[#101828]"
            >
              <ArrowLeft size={16} />
              Back to sales
            </Link>

            <h1 className="text-3xl font-semibold tracking-tight text-[#101828]">
              New sale
            </h1>

            <p className="mt-2 text-sm text-[#667085]">
              Add products and save the transaction
              as a draft.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/app/sales"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[#d0d5dd] bg-white px-5 text-sm font-semibold text-[#344054] transition hover:bg-[#f9fafb]"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={items.length === 0}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[#101828] px-5 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"
            >
              Save draft
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-[#eaecf0] bg-white p-6 shadow-sm">
              <h2 className="font-semibold text-[#101828]">
                Products
              </h2>

              <p className="mt-1 text-sm text-[#667085]">
                Search by product name or SKU.
              </p>

              <div className="relative mt-5">
                <Search
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#98a2b3]"
                />

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value,
                    )
                  }
                  placeholder="Search products..."
                  autoComplete="off"
                  className="h-12 w-full rounded-xl border border-[#d0d5dd] bg-white pl-11 pr-4 text-sm text-[#101828] outline-none transition placeholder:text-[#98a2b3] focus:border-[#101828]"
                />

                {search.trim() ? (
                  <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-[#eaecf0] bg-white shadow-lg">
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map(
                        (product) => (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() =>
                              addProduct(product)
                            }
                            className="flex w-full items-center justify-between gap-4 border-b border-[#f2f4f7] px-4 py-3 text-left transition last:border-0 hover:bg-[#f9fafb]"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-[#101828]">
                                {product.name}
                              </p>

                              <p className="mt-1 text-xs text-[#98a2b3]">
                                {product.sku ||
                                  "No SKU"}
                                {" · "}
                                Stock{" "}
                                {Number(
                                  product.current_stock ||
                                    0,
                                )}
                              </p>
                            </div>

                            <div className="shrink-0 text-right">
                              <p className="text-sm font-semibold text-[#101828]">
                                {formatCurrency(
                                  Number(
                                    product.selling_price ||
                                      0,
                                  ),
                                )}
                              </p>

                              <Plus
                                size={16}
                                className="ml-auto mt-1 text-[#667085]"
                              />
                            </div>
                          </button>
                        ),
                      )
                    ) : (
                      <div className="px-4 py-5 text-sm text-[#667085]">
                        No matching products.
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-[#eaecf0] bg-white shadow-sm">
              <div className="border-b border-[#eaecf0] px-6 py-5">
                <h2 className="font-semibold text-[#101828]">
                  Sale items
                </h2>

                <p className="mt-1 text-sm text-[#667085]">
                  {items.length}{" "}
                  {items.length === 1
                    ? "product"
                    : "products"}{" "}
                  added.
                </p>
              </div>

              {items.length === 0 ? (
                <div className="px-6 py-14 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f2f4f7] text-[#667085]">
                    <ShoppingCart size={20} />
                  </div>

                  <p className="mt-4 font-semibold text-[#101828]">
                    No products added
                  </p>

                  <p className="mt-2 text-sm text-[#667085]">
                    Search for a product above to
                    begin the sale.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px]">
                    <thead>
                      <tr className="border-b border-[#eaecf0] bg-[#fcfcfd] text-left">
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                          Product
                        </th>

                        <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                          Qty
                        </th>

                        <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                          Price
                        </th>

                        <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                          VAT %
                        </th>

                        <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                          Discount
                        </th>

                        <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                          Total
                        </th>

                        <th className="px-5 py-3" />
                      </tr>
                    </thead>

                    <tbody>
                      {items.map((item) => {
                        const product =
                          getProduct(
                            item.productId,
                          );

                        const quantity =
                          Number(
                            item.quantity,
                          );

                        const unitPrice =
                          Number(
                            item.unitPrice,
                          );

                        const vatRate =
                          Number(
                            item.vatRate,
                          );

                        const gross =
                          quantity *
                          unitPrice;

                        const discount =
                          Math.min(
                            Math.max(
                              Number(
                                item.discountAmount,
                              ),
                              0,
                            ),
                            gross,
                          );

                        // Customer pays this final amount.
                        const total =
                          gross - discount;

                        // VAT is extracted from the
                        // VAT-inclusive line total.
                        const vat =
                          vatRate > 0
                            ? total *
                              (vatRate /
                                (100 +
                                  vatRate))
                            : 0;

                        const net =
                          total - vat;

                        return (
                          <tr
                            key={
                              item.productId
                            }
                            className="border-b border-[#f2f4f7] last:border-0"
                          >
                            <td className="px-5 py-4">
                              <p className="text-sm font-semibold text-[#101828]">
                                {product?.name ||
                                  "Product"}
                              </p>

                              <p className="mt-1 text-xs text-[#98a2b3]">
                                {product?.sku ||
                                  "No SKU"}
                                {" · "}
                                Stock{" "}
                                {Number(
                                  product?.current_stock ||
                                    0,
                                )}
                              </p>
                            </td>

                            <td className="px-3 py-4">
                              <input
                                type="number"
                                min="0.001"
                                step="0.001"
                                value={
                                  item.quantity
                                }
                                onChange={(
                                  event,
                                ) => {
                                  const value =
                                    Number(
                                      event
                                        .target
                                        .value,
                                    );

                                  updateItem(
                                    item.productId,
                                    {
                                      quantity:
                                        Number.isFinite(
                                          value,
                                        ) &&
                                        value >
                                          0
                                          ? value
                                          : 0.001,
                                    },
                                  );
                                }}
                                className="h-10 w-24 rounded-lg border border-[#d0d5dd] px-3 text-sm text-[#101828] outline-none focus:border-[#101828]"
                              />
                            </td>

                            <td className="px-3 py-4">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={
                                  item.unitPrice
                                }
                                onChange={(
                                  event,
                                ) => {
                                  const value =
                                    Number(
                                      event
                                        .target
                                        .value,
                                    );

                                  updateItem(
                                    item.productId,
                                    {
                                      unitPrice:
                                        Number.isFinite(
                                          value,
                                        )
                                          ? Math.max(
                                              0,
                                              value,
                                            )
                                          : 0,
                                    },
                                  );
                                }}
                                className="h-10 w-28 rounded-lg border border-[#d0d5dd] px-3 text-sm text-[#101828] outline-none focus:border-[#101828]"
                              />
                            </td>

                            <td className="px-3 py-4">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={
                                  item.vatRate
                                }
                                onChange={(
                                  event,
                                ) => {
                                  const value =
                                    Number(
                                      event
                                        .target
                                        .value,
                                    );

                                  updateItem(
                                    item.productId,
                                    {
                                      vatRate:
                                        Number.isFinite(
                                          value,
                                        )
                                          ? Math.max(
                                              0,
                                              value,
                                            )
                                          : 0,
                                    },
                                  );
                                }}
                                className="h-10 w-24 rounded-lg border border-[#d0d5dd] px-3 text-sm text-[#101828] outline-none focus:border-[#101828]"
                              />
                            </td>

                            <td className="px-3 py-4">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={
                                  item.discountAmount
                                }
                                onChange={(
                                  event,
                                ) => {
                                  const value =
                                    Number(
                                      event
                                        .target
                                        .value,
                                    );

                                  updateItem(
                                    item.productId,
                                    {
                                      discountAmount:
                                        Number.isFinite(
                                          value,
                                        )
                                          ? Math.max(
                                              0,
                                              value,
                                            )
                                          : 0,
                                    },
                                  );
                                }}
                                className="h-10 w-28 rounded-lg border border-[#d0d5dd] px-3 text-sm text-[#101828] outline-none focus:border-[#101828]"
                              />
                            </td>

                            <td className="px-3 py-4">
                              <p className="text-sm font-semibold text-[#101828]">
                                {formatCurrency(
                                  total,
                                )}
                              </p>

                              <p className="mt-1 text-xs text-[#98a2b3]">
                                Net{" "}
                                {formatCurrency(
                                  net,
                                )}
                                {" · "}
                                VAT{" "}
                                {formatCurrency(
                                  vat,
                                )}
                              </p>
                            </td>

                            <td className="px-5 py-4 text-right">
                              <button
                                type="button"
                                onClick={() =>
                                  removeItem(
                                    item.productId,
                                  )
                                }
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#98a2b3] transition hover:bg-red-50 hover:text-red-600"
                                aria-label={`Remove ${
                                  product?.name ||
                                  "product"
                                }`}
                              >
                                <Trash2
                                  size={16}
                                />
                              </button>
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

          <aside className="space-y-6">
            <section className="rounded-2xl border border-[#eaecf0] bg-white p-6 shadow-sm">
              <h2 className="font-semibold text-[#101828]">
                Sale details
              </h2>

              <label className="mt-5 block">
                <span className="text-sm font-medium text-[#344054]">
                  Sale date
                </span>

                <input
                  type="date"
                  name="sale_date"
                  defaultValue={today()}
                  required
                  className="mt-2 h-11 w-full rounded-xl border border-[#d0d5dd] bg-white px-3 text-sm text-[#101828] outline-none focus:border-[#101828]"
                />
              </label>

              <label className="mt-4 block">
                <span className="text-sm font-medium text-[#344054]">
                  Payment method
                </span>

                <select
                  name="payment_method"
                  defaultValue=""
                  className="mt-2 h-11 w-full rounded-xl border border-[#d0d5dd] bg-white px-3 text-sm text-[#101828] outline-none focus:border-[#101828]"
                >
                  <option value="">
                    Select payment
                  </option>

                  <option value="cash">
                    Cash
                  </option>

                  <option value="card">
                    Card
                  </option>

                  <option value="mb_way">
                    MB Way
                  </option>

                  <option value="bank_transfer">
                    Bank transfer
                  </option>

                  <option value="other">
                    Other
                  </option>
                </select>
              </label>

              <label className="mt-4 block">
                <span className="text-sm font-medium text-[#344054]">
                  Notes
                </span>

                <textarea
                  name="notes"
                  rows={4}
                  placeholder="Optional notes..."
                  className="mt-2 w-full resize-none rounded-xl border border-[#d0d5dd] bg-white p-3 text-sm text-[#101828] outline-none placeholder:text-[#98a2b3] focus:border-[#101828]"
                />
              </label>
            </section>

            <section className="rounded-2xl border border-[#eaecf0] bg-white p-6 shadow-sm">
              <h2 className="font-semibold text-[#101828]">
                Summary
              </h2>

              <div className="mt-5 space-y-3">
                <SummaryRow
                  label="Subtotal"
                  value={formatCurrency(
                    totals.subtotal,
                  )}
                />

                <SummaryRow
                  label="Discount"
                  value={`-${formatCurrency(
                    totals.discount,
                  )}`}
                />

                <SummaryRow
                  label="Net before VAT"
                  value={formatCurrency(
                    totals.net,
                  )}
                />

                <SummaryRow
                  label="VAT included"
                  value={formatCurrency(
                    totals.vat,
                  )}
                />

                <div className="border-t border-[#eaecf0] pt-4">
                  <SummaryRow
                    label="Total"
                    value={formatCurrency(
                      totals.total,
                    )}
                    strong
                  />
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </form>
  );
}

function SummaryRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span
        className={
          strong
            ? "font-semibold text-[#101828]"
            : "text-sm text-[#667085]"
        }
      >
        {label}
      </span>

      <span
        className={
          strong
            ? "text-xl font-semibold text-[#101828]"
            : "text-sm font-medium text-[#344054]"
        }
      >
        {value}
      </span>
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
  }).format(
    Number.isFinite(value)
      ? value
      : 0,
  );
}

function today() {
  return new Date()
    .toISOString()
    .slice(0, 10);
}