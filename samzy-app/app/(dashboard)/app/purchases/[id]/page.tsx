import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  ArrowLeft,
  Boxes,
  CalendarDays,
  CircleDollarSign,
  PackageCheck,
  ReceiptText,
  Truck,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";

type PurchaseDetailPageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

type PurchaseSupplier = {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  vat_number: string | null;
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
  ordered_quantity: number;
  received_quantity: number;
  unit_cost: number;
  vat_rate: number;
  line_subtotal: number;
  line_vat: number;
  line_total: number;
  notes: string | null;

  products:
    | PurchaseItemProduct
    | PurchaseItemProduct[]
    | null;
};

export default async function PurchaseDetailPage({
  params,
  searchParams,
}: PurchaseDetailPageProps) {
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

  const organizationId = membership.organization_id;

  const { data: purchase, error: purchaseError } =
    await supabase
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
          notes,
          created_at,
          updated_at,
          suppliers (
            id,
            name,
            contact_name,
            email,
            phone,
            vat_number
          )
        `,
      )
      .eq("id", id)
      .eq("organization_id", organizationId)
      .maybeSingle();

  if (purchaseError || !purchase) {
    notFound();
  }

  const { data: items } = await supabase
    .from("purchase_items")
    .select(
      `
        id,
        ordered_quantity,
        received_quantity,
        unit_cost,
        vat_rate,
        line_subtotal,
        line_vat,
        line_total,
        notes,
        products (
          id,
          name,
          sku,
          brand,
          unit
        )
      `,
    )
    .eq("purchase_id", purchase.id)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });

  const supplierRaw = purchase.suppliers;

  const supplier = (
    Array.isArray(supplierRaw)
      ? supplierRaw[0]
      : supplierRaw
  ) as PurchaseSupplier | null;

  const safeItems = (items ?? []) as PurchaseItemRow[];

  const totalOrdered = safeItems.reduce(
    (sum, item) =>
      sum + Number(item.ordered_quantity || 0),
    0,
  );

  const totalReceived = safeItems.reduce(
    (sum, item) =>
      sum + Number(item.received_quantity || 0),
    0,
  );

  const totalRemaining =
    totalOrdered - totalReceived;

  async function receiveItem(formData: FormData) {
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

    const purchaseItemId =
      getString("purchase_item_id");

    const quantity = Number(
      getString("quantity"),
    );

    if (!purchaseItemId) {
      redirect(
        `/app/purchases/${id}?error=${encodeURIComponent(
          "Purchase item is required.",
        )}`,
      );
    }

    if (
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      redirect(
        `/app/purchases/${id}?error=${encodeURIComponent(
          "Received quantity must be greater than zero.",
        )}`,
      );
    }

    const { data: item } = await supabase
      .from("purchase_items")
      .select(
        `
          id,
          purchase_id,
          organization_id
        `,
      )
      .eq("id", purchaseItemId)
      .eq("purchase_id", id)
      .eq(
        "organization_id",
        membership.organization_id,
      )
      .maybeSingle();

    if (!item) {
      redirect(
        `/app/purchases/${id}?error=${encodeURIComponent(
          "Purchase item was not found.",
        )}`,
      );
    }

    const { error } = await supabase.rpc(
      "receive_purchase_item",
      {
        requested_purchase_item_id:
          purchaseItemId,

        requested_quantity:
          quantity,
      },
    );

    if (error) {
      redirect(
        `/app/purchases/${id}?error=${encodeURIComponent(
          error.message,
        )}`,
      );
    }

    revalidatePath(
      `/app/purchases/${id}`,
    );

    revalidatePath(
      "/app/purchases",
    );

    revalidatePath(
      "/app/inventory",
    );

    revalidatePath(
      "/app/products",
    );

    redirect(
      `/app/purchases/${id}?success=received`,
    );
  }

  return (
    <div className="mx-auto max-w-[1500px]">
      {/* HEADER */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link
            href="/app/purchases"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#667085] transition hover:text-[#101828]"
          >
            <ArrowLeft size={16} />
            Back to purchases
          </Link>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#101828]">
            {purchase.purchase_number}
          </h1>

          <p className="mt-2 text-sm text-[#667085]">
            Purchase order details,
            supplier information and
            goods receiving.
          </p>
        </div>

        <PurchaseStatus
          status={purchase.status}
        />
      </div>

      {query.error ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {query.error}
        </div>
      ) : null}

      {query.success ===
      "received" ? (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          Stock received successfully.
          Inventory has been updated.
        </div>
      ) : null}

      {/* METRICS */}
      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Boxes}
          label="Ordered quantity"
          value={formatQuantity(
            totalOrdered,
          )}
        />

        <MetricCard
          icon={PackageCheck}
          label="Received quantity"
          value={formatQuantity(
            totalReceived,
          )}
        />

        <MetricCard
          icon={Truck}
          label="Remaining"
          value={formatQuantity(
            totalRemaining,
          )}
          warning={
            totalRemaining > 0
          }
        />

        <MetricCard
          icon={CircleDollarSign}
          label="Purchase total"
          value={formatCurrency(
            Number(purchase.total),
            purchase.currency,
          )}
        />
      </section>

      {/* PURCHASE + SUPPLIER */}
      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <article className="rounded-2xl border border-[#eaecf0] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f2f4f7] text-[#475467]">
              <ReceiptText size={18} />
            </div>

            <div>
              <h2 className="font-semibold text-[#101828]">
                Purchase details
              </h2>

              <p className="mt-1 text-sm text-[#667085]">
                Order and delivery information.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <DetailRow
              label="Purchase number"
              value={
                purchase.purchase_number
              }
            />

            <DetailRow
              label="Purchase date"
              value={formatDate(
                purchase.purchase_date,
              )}
            />

            <DetailRow
              label="Expected delivery"
              value={
                purchase.expected_date
                  ? formatDate(
                      purchase.expected_date,
                    )
                  : "Not set"
              }
            />

            <DetailRow
              label="Supplier reference"
              value={
                purchase.supplier_reference ||
                "Not set"
              }
            />

            <DetailRow
              label="Currency"
              value={
                purchase.currency
              }
            />

            <DetailRow
              label="Status"
              value={formatStatus(
                purchase.status,
              )}
            />
          </div>
        </article>

        <article className="rounded-2xl border border-[#eaecf0] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f2f4f7] text-[#475467]">
              <Truck size={18} />
            </div>

            <div>
              <h2 className="font-semibold text-[#101828]">
                Supplier
              </h2>

              <p className="mt-1 text-sm text-[#667085]">
                Supplier attached to this
                purchase.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <DetailRow
              label="Supplier"
              value={
                supplier?.name ||
                "No supplier"
              }
            />

            <DetailRow
              label="Contact"
              value={
                supplier?.contact_name ||
                "Not set"
              }
            />

            <DetailRow
              label="Email"
              value={
                supplier?.email ||
                "Not set"
              }
            />

            <DetailRow
              label="Phone"
              value={
                supplier?.phone ||
                "Not set"
              }
            />

            <DetailRow
              label="VAT number"
              value={
                supplier?.vat_number ||
                "Not set"
              }
            />
          </div>
        </article>
      </section>

      {/* ITEMS */}
      <section className="mt-6 overflow-hidden rounded-2xl border border-[#eaecf0] bg-white shadow-sm">
        <div className="border-b border-[#eaecf0] px-6 py-5">
          <h2 className="font-semibold text-[#101828]">
            Purchase items
          </h2>

          <p className="mt-1 text-sm text-[#667085]">
            Ordered products and receiving
            progress.
          </p>
        </div>

        {safeItems.length === 0 ? (
          <div className="px-6 py-14 text-center text-sm text-[#667085]">
            No purchase items found.
          </div>
        ) : (
          <div className="divide-y divide-[#f2f4f7]">
            {safeItems.map((item) => {
              const productRaw =
                item.products;

              const product =
                Array.isArray(
                  productRaw,
                )
                  ? productRaw[0]
                  : productRaw;

              const ordered =
                Number(
                  item.ordered_quantity,
                );

              const received =
                Number(
                  item.received_quantity,
                );

              const remaining =
                ordered - received;

              const complete =
                remaining <= 0;

              return (
                <div
                  key={item.id}
                  className="p-6"
                >
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <Link
                        href={
                          product
                            ? `/app/products/${product.id}`
                            : "#"
                        }
                        className="text-base font-semibold text-[#101828] hover:underline"
                      >
                        {product?.name ||
                          "Unknown product"}
                      </Link>

                      <p className="mt-1 text-sm text-[#667085]">
                        {product?.sku ||
                          "No SKU"}

                        {product?.brand
                          ? ` · ${product.brand}`
                          : ""}
                      </p>

                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <SmallMetric
                          label="Ordered"
                          value={`${formatQuantity(
                            ordered,
                          )} ${
                            product?.unit ||
                            ""
                          }`}
                        />

                        <SmallMetric
                          label="Received"
                          value={`${formatQuantity(
                            received,
                          )} ${
                            product?.unit ||
                            ""
                          }`}
                        />

                        <SmallMetric
                          label="Remaining"
                          value={`${formatQuantity(
                            remaining,
                          )} ${
                            product?.unit ||
                            ""
                          }`}
                          warning={
                            remaining > 0
                          }
                        />
                      </div>
                    </div>

                    <div className="w-full xl:max-w-[430px]">
                      <div className="grid gap-3 rounded-xl border border-[#eaecf0] bg-[#fcfcfd] p-4 sm:grid-cols-3">
                        <SmallText
                          label="Unit cost"
                          value={formatCurrency(
                            Number(
                              item.unit_cost,
                            ),
                            purchase.currency,
                          )}
                        />

                        <SmallText
                          label="VAT"
                          value={`${formatQuantity(
                            Number(
                              item.vat_rate,
                            ),
                          )}%`}
                        />

                        <SmallText
                          label="Line total"
                          value={formatCurrency(
                            Number(
                              item.line_total,
                            ),
                            purchase.currency,
                          )}
                        />
                      </div>

                      {!complete &&
                      purchase.status !==
                        "draft" &&
                      purchase.status !==
                        "cancelled" ? (
                        <form
                          action={
                            receiveItem
                          }
                          className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4"
                        >
                          <input
                            type="hidden"
                            name="purchase_item_id"
                            value={item.id}
                          />

                          <label>
                            <span className="text-sm font-semibold text-emerald-900">
                              Receive quantity
                            </span>

                            <div className="mt-2 flex gap-3">
                              <input
                                required
                                name="quantity"
                                type="number"
                                min="0.01"
                                max={
                                  remaining
                                }
                                step="0.01"
                                defaultValue={
                                  remaining
                                }
                                className="h-11 min-w-0 flex-1 rounded-xl border border-emerald-200 bg-white px-4 text-sm outline-none focus:border-emerald-500"
                              />

                              <button
                                type="submit"
                                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                              >
                                <PackageCheck
                                  size={
                                    16
                                  }
                                />
                                Receive
                              </button>
                            </div>

                            <p className="mt-2 text-xs text-emerald-700">
                              Maximum remaining:
                              {" "}
                              {formatQuantity(
                                remaining,
                              )}{" "}
                              {product?.unit ||
                                ""}
                            </p>
                          </label>
                        </form>
                      ) : complete ? (
                        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                          Fully received
                        </div>
                      ) : purchase.status ===
                        "draft" ? (
                        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                          Mark this purchase as ordered
                          before receiving goods.
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* TOTALS */}
      <section className="mt-6 ml-auto max-w-md rounded-2xl border border-[#eaecf0] bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-[#101828]">
          Purchase totals
        </h2>

        <div className="mt-5 space-y-4">
          <TotalRow
            label="Subtotal"
            value={formatCurrency(
              Number(
                purchase.subtotal,
              ),
              purchase.currency,
            )}
          />

          <TotalRow
            label="VAT"
            value={formatCurrency(
              Number(
                purchase.vat_total,
              ),
              purchase.currency,
            )}
          />

          <div className="border-t border-[#eaecf0] pt-4">
            <TotalRow
              label="Total"
              value={formatCurrency(
                Number(
                  purchase.total,
                ),
                purchase.currency,
              )}
              strong
            />
          </div>
        </div>
      </section>

      {purchase.notes ? (
        <section className="mt-6 rounded-2xl border border-[#eaecf0] bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-[#101828]">
            Notes
          </h2>

          <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#667085]">
            {purchase.notes}
          </p>
        </section>
      ) : null}

      <section className="mt-6 rounded-2xl border border-[#eaecf0] bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <CalendarDays
            size={18}
            className="text-[#667085]"
          />

          <h2 className="font-semibold text-[#101828]">
            Record information
          </h2>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <DetailRow
            label="Created"
            value={formatDateTime(
              purchase.created_at,
            )}
          />

          <DetailRow
            label="Last updated"
            value={formatDateTime(
              purchase.updated_at,
            )}
          />
        </div>
      </section>
    </div>
  );
}

function PurchaseStatus({
  status,
}: {
  status: string;
}) {
  const base =
    "inline-flex h-10 items-center rounded-xl px-4 text-sm font-semibold";

  if (status === "received") {
    return (
      <span
        className={`${base} bg-emerald-50 text-emerald-700`}
      >
        Received
      </span>
    );
  }

  if (
    status ===
    "partially_received"
  ) {
    return (
      <span
        className={`${base} bg-orange-50 text-orange-700`}
      >
        Partially received
      </span>
    );
  }

  if (status === "ordered") {
    return (
      <span
        className={`${base} bg-blue-50 text-blue-700`}
      >
        Ordered
      </span>
    );
  }

  if (status === "cancelled") {
    return (
      <span
        className={`${base} bg-red-50 text-red-700`}
      >
        Cancelled
      </span>
    );
  }

  return (
    <span
      className={`${base} bg-[#f2f4f7] text-[#475467]`}
    >
      Draft
    </span>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  warning = false,
}: {
  icon: React.ComponentType<{
    size?: number;
  }>;
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
    </article>
  );
}

function SmallMetric({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[#eaecf0] bg-[#fcfcfd] px-4 py-3">
      <p className="text-xs text-[#98a2b3]">
        {label}
      </p>

      <p
        className={[
          "mt-1 text-sm font-semibold",
          warning
            ? "text-orange-700"
            : "text-[#101828]",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}

function SmallText({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs text-[#98a2b3]">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-[#101828]">
        {value}
      </p>
    </div>
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

function TotalRow({
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

function formatDate(
  value: string,
) {
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      dateStyle: "medium",
    },
  ).format(new Date(value));
}

function formatDateTime(
  value: string,
) {
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(new Date(value));
}

function formatStatus(
  value: string,
) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}