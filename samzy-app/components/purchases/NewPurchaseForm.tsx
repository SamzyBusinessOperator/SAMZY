"use client";

import {
  Plus,
  Save,
  Send,
  Trash2,
} from "lucide-react";
import {
  useMemo,
  useState,
} from "react";

type Supplier = {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  vat_number: string | null;
  status: string;
};

type Product = {
  id: string;
  name: string;
  sku: string | null;
  brand: string | null;
  unit: string;
  cost_price: number;
  vat_rate: number;
  status: string;
};

type PurchaseLine = {
  key: string;
  product_id: string;
  ordered_quantity: number;
  unit_cost: number;
  vat_rate: number;
};

type NewPurchaseFormProps = {
  suppliers: Supplier[];
  products: Product[];
  currency: string;
  action: (
    formData: FormData,
  ) => void | Promise<void>;
};

function createLine(): PurchaseLine {
  return {
    key:
      crypto.randomUUID(),

    product_id: "",

    ordered_quantity: 1,

    unit_cost: 0,

    vat_rate: 23,
  };
}

export default function NewPurchaseForm({
  suppliers,
  products,
  currency,
  action,
}: NewPurchaseFormProps) {
  const [supplierMode, setSupplierMode] =
    useState<"existing" | "new">(
      suppliers.length > 0
        ? "existing"
        : "new",
    );

  const [lines, setLines] =
    useState<PurchaseLine[]>([
      createLine(),
    ]);

  const totals = useMemo(() => {
    return lines.reduce(
      (result, line) => {
        const quantity =
          Number(
            line.ordered_quantity,
          ) || 0;

        const unitCost =
          Number(line.unit_cost) ||
          0;

        const vatRate =
          Number(line.vat_rate) ||
          0;

        const subtotal =
          quantity * unitCost;

        const vat =
          subtotal *
          (vatRate / 100);

        result.subtotal +=
          subtotal;

        result.vat += vat;

        result.total +=
          subtotal + vat;

        return result;
      },
      {
        subtotal: 0,
        vat: 0,
        total: 0,
      },
    );
  }, [lines]);

  function addLine() {
    setLines((current) => [
      ...current,
      createLine(),
    ]);
  }

  function removeLine(
    key: string,
  ) {
    setLines((current) => {
      if (current.length === 1) {
        return current;
      }

      return current.filter(
        (line) =>
          line.key !== key,
      );
    });
  }

  function updateLine(
    key: string,
    updates: Partial<PurchaseLine>,
  ) {
    setLines((current) =>
      current.map((line) =>
        line.key === key
          ? {
              ...line,
              ...updates,
            }
          : line,
      ),
    );
  }

  function selectProduct(
    key: string,
    productId: string,
  ) {
    const product =
      products.find(
        (candidate) =>
          candidate.id ===
          productId,
      );

    if (!product) {
      updateLine(key, {
        product_id:
          productId,
      });

      return;
    }

    updateLine(key, {
      product_id:
        product.id,

      unit_cost:
        Number(
          product.cost_price,
        ),

      vat_rate:
        Number(product.vat_rate),
    });
  }

  const serializedItems =
    JSON.stringify(
      lines.map((line) => ({
        product_id:
          line.product_id,

        ordered_quantity:
          Number(
            line.ordered_quantity,
          ),

        unit_cost:
          Number(line.unit_cost),

        vat_rate:
          Number(line.vat_rate),
      })),
    );

  const today =
    new Date()
      .toISOString()
      .slice(0, 10);

  return (
    <form
      action={action}
      className="mt-8 space-y-6"
    >
      <input
        type="hidden"
        name="supplier_mode"
        value={supplierMode}
      />

      <input
        type="hidden"
        name="items_json"
        value={serializedItems}
      />

      {/* SUPPLIER */}
      <section className="rounded-2xl border border-[#eaecf0] bg-white p-6 shadow-sm">
        <div>
          <h2 className="font-semibold text-[#101828]">
            Supplier
          </h2>

          <p className="mt-1 text-sm text-[#667085]">
            Choose an existing supplier
            or add a new supplier.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() =>
              setSupplierMode(
                "existing",
              )
            }
            disabled={
              suppliers.length === 0
            }
            className={[
              "h-10 rounded-xl border px-4 text-sm font-semibold transition",
              supplierMode ===
              "existing"
                ? "border-[#101828] bg-[#101828] text-white"
                : "border-[#d0d5dd] bg-white text-[#344054]",
              suppliers.length ===
              0
                ? "cursor-not-allowed opacity-40"
                : "",
            ].join(" ")}
          >
            Existing supplier
          </button>

          <button
            type="button"
            onClick={() =>
              setSupplierMode("new")
            }
            className={[
              "h-10 rounded-xl border px-4 text-sm font-semibold transition",
              supplierMode === "new"
                ? "border-[#101828] bg-[#101828] text-white"
                : "border-[#d0d5dd] bg-white text-[#344054]",
            ].join(" ")}
          >
            + Add supplier
          </button>
        </div>

        {supplierMode ===
        "existing" ? (
          <div className="mt-6">
            <label>
              <span className="text-sm font-medium text-[#344054]">
                Supplier{" "}
                <span className="text-red-600">
                  *
                </span>
              </span>

              <select
                name="supplier_id"
                required
                defaultValue=""
                className="mt-2 h-12 w-full rounded-xl border border-[#d0d5dd] bg-white px-4 text-sm outline-none focus:border-[#101828]"
              >
                <option
                  value=""
                  disabled
                >
                  Select supplier
                </option>

                {suppliers.map(
                  (supplier) => (
                    <option
                      key={
                        supplier.id
                      }
                      value={
                        supplier.id
                      }
                    >
                      {supplier.name}
                    </option>
                  ),
                )}
              </select>
            </label>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Field
              label="Supplier name"
              name="new_supplier_name"
              required
              placeholder="Example: Spark Cash & Carry"
            />

            <Field
              label="Contact name"
              name="new_supplier_contact"
              placeholder="Supplier contact"
            />

            <Field
              label="Email"
              name="new_supplier_email"
              type="email"
              placeholder="supplier@example.com"
            />

            <Field
              label="Phone"
              name="new_supplier_phone"
              placeholder="+351 ..."
            />

            <Field
              label="VAT number"
              name="new_supplier_vat"
              placeholder="PT..."
            />
          </div>
        )}
      </section>

      {/* PURCHASE INFO */}
      <section className="rounded-2xl border border-[#eaecf0] bg-white p-6 shadow-sm">
        <div>
          <h2 className="font-semibold text-[#101828]">
            Purchase details
          </h2>

          <p className="mt-1 text-sm text-[#667085]">
            Enter dates and supplier
            reference information.
          </p>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <Field
            label="Purchase date"
            name="purchase_date"
            type="date"
            required
            defaultValue={today}
          />

          <Field
            label="Expected delivery"
            name="expected_date"
            type="date"
          />

          <Field
            label="Supplier reference"
            name="supplier_reference"
            placeholder="Invoice, quote or PO reference"
          />
        </div>

        <label className="mt-5 block">
          <span className="text-sm font-medium text-[#344054]">
            Notes
          </span>

          <textarea
            name="notes"
            rows={4}
            placeholder="Optional purchase notes..."
            className="mt-2 w-full rounded-xl border border-[#d0d5dd] px-4 py-3 text-sm outline-none transition placeholder:text-[#98a2b3] focus:border-[#101828]"
          />
        </label>
      </section>

      {/* ITEMS */}
      <section className="overflow-hidden rounded-2xl border border-[#eaecf0] bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-[#eaecf0] p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-[#101828]">
              Purchase items
            </h2>

            <p className="mt-1 text-sm text-[#667085]">
              Add products, quantities,
              cost and VAT.
            </p>
          </div>

          <button
            type="button"
            onClick={addLine}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#d0d5dd] bg-white px-4 text-sm font-semibold text-[#344054] transition hover:bg-[#f9fafb]"
          >
            <Plus size={15} />
            Add item
          </button>
        </div>

        <div className="space-y-4 p-6">
          {lines.map(
            (line, index) => {
              const selectedProduct =
                products.find(
                  (product) =>
                    product.id ===
                    line.product_id,
                );

              const subtotal =
                Number(
                  line.ordered_quantity,
                ) *
                Number(
                  line.unit_cost,
                );

              const lineTotal =
                subtotal +
                subtotal *
                  (Number(
                    line.vat_rate,
                  ) /
                    100);

              return (
                <div
                  key={line.key}
                  className="rounded-2xl border border-[#eaecf0] p-5"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-[#101828]">
                      Item{" "}
                      {index + 1}
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        removeLine(
                          line.key,
                        )
                      }
                      disabled={
                        lines.length ===
                        1
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30"
                      aria-label="Remove item"
                    >
                      <Trash2
                        size={16}
                      />
                    </button>
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr_1fr_1fr]">
                    <label>
                      <span className="text-xs font-medium text-[#667085]">
                        Product
                      </span>

                      <select
                        required
                        value={
                          line.product_id
                        }
                        onChange={(
                          event,
                        ) =>
                          selectProduct(
                            line.key,
                            event
                              .target
                              .value,
                          )
                        }
                        className="mt-2 h-11 w-full rounded-xl border border-[#d0d5dd] bg-white px-3 text-sm outline-none focus:border-[#101828]"
                      >
                        <option value="">
                          Select product
                        </option>

                        {products.map(
                          (
                            product,
                          ) => (
                            <option
                              key={
                                product.id
                              }
                              value={
                                product.id
                              }
                            >
                              {
                                product.name
                              }
                              {product.sku
                                ? ` — ${product.sku}`
                                : ""}
                            </option>
                          ),
                        )}
                      </select>

                      {selectedProduct ? (
                        <p className="mt-2 text-xs text-[#98a2b3]">
                          {selectedProduct.brand ||
                            "No brand"}
                          {" · "}
                          {
                            selectedProduct.unit
                          }
                        </p>
                      ) : null}
                    </label>

                    <NumberField
                      label="Quantity"
                      value={
                        line.ordered_quantity
                      }
                      min={0.01}
                      onChange={(
                        value,
                      ) =>
                        updateLine(
                          line.key,
                          {
                            ordered_quantity:
                              value,
                          },
                        )
                      }
                    />

                    <NumberField
                      label={`Unit cost (${currency})`}
                      value={
                        line.unit_cost
                      }
                      min={0}
                      onChange={(
                        value,
                      ) =>
                        updateLine(
                          line.key,
                          {
                            unit_cost:
                              value,
                          },
                        )
                      }
                    />

                    <NumberField
                      label="VAT %"
                      value={
                        line.vat_rate
                      }
                      min={0}
                      onChange={(
                        value,
                      ) =>
                        updateLine(
                          line.key,
                          {
                            vat_rate:
                              value,
                          },
                        )
                      }
                    />
                  </div>

                  <div className="mt-4 flex justify-end border-t border-[#f2f4f7] pt-4">
                    <div className="text-right">
                      <p className="text-xs text-[#98a2b3]">
                        Line total
                      </p>

                      <p className="mt-1 font-semibold text-[#101828]">
                        {formatCurrency(
                          lineTotal,
                          currency,
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              );
            },
          )}
        </div>
      </section>

      {/* TOTALS */}
      <section className="ml-auto max-w-md rounded-2xl border border-[#eaecf0] bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-[#101828]">
          Purchase summary
        </h2>

        <div className="mt-5 space-y-4">
          <SummaryRow
            label="Subtotal"
            value={formatCurrency(
              totals.subtotal,
              currency,
            )}
          />

          <SummaryRow
            label="VAT"
            value={formatCurrency(
              totals.vat,
              currency,
            )}
          />

          <div className="border-t border-[#eaecf0] pt-4">
            <SummaryRow
              label="Total"
              value={formatCurrency(
                totals.total,
                currency,
              )}
              strong
            />
          </div>
        </div>
      </section>

      {/* ACTIONS */}
      <div className="flex flex-col-reverse gap-3 pb-10 sm:flex-row sm:justify-end">
        <button
          type="submit"
          name="purchase_status"
          value="draft"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#d0d5dd] bg-white px-5 text-sm font-semibold text-[#344054] transition hover:bg-[#f9fafb]"
        >
          <Save size={16} />
          Save as draft
        </button>

        <button
          type="submit"
          name="purchase_status"
          value="ordered"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#101828] px-6 text-sm font-semibold text-white transition hover:bg-black"
        >
          <Send size={16} />
          Save & mark ordered
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required = false,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <label>
      <span className="text-sm font-medium text-[#344054]">
        {label}
        {required ? (
          <span className="text-red-600">
            {" "}
            *
          </span>
        ) : null}
      </span>

      <input
        name={name}
        type={type}
        required={required}
        defaultValue={
          defaultValue
        }
        placeholder={placeholder}
        className="mt-2 h-11 w-full rounded-xl border border-[#d0d5dd] px-4 text-sm outline-none transition placeholder:text-[#98a2b3] focus:border-[#101828]"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  onChange: (
    value: number,
  ) => void;
}) {
  return (
    <label>
      <span className="text-xs font-medium text-[#667085]">
        {label}
      </span>

      <input
        required
        type="number"
        min={min}
        step="0.01"
        value={value}
        onChange={(event) =>
          onChange(
            Number(
              event.target.value,
            ),
          )
        }
        className="mt-2 h-11 w-full rounded-xl border border-[#d0d5dd] px-3 text-sm outline-none focus:border-[#101828]"
      />
    </label>
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
    <div className="flex items-center justify-between gap-6">
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
            : "text-sm font-semibold text-[#101828]"
        }
      >
        {value}
      </span>
    </div>
  );
}

function formatCurrency(
  value: number,
  currency: string,
) {
  return new Intl.NumberFormat(
    "en-IE",
    {
      style: "currency",
      currency:
        currency || "EUR",
    },
  ).format(value);
}