import Link from "next/link";
import {
  notFound,
  redirect,
} from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  ArrowLeft,
  CalendarDays,
  CreditCard,
  Package,
  ReceiptText,
  UserRound,
} from "lucide-react";

import CompleteSaleButton from "@/components/sales/CompleteSaleButton";
import { createClient } from "@/lib/supabase/server";

type SaleItemRow = {
  id: string;
  product_id: string;
  product_name_snapshot: string;
  sku_snapshot: string | null;
  quantity: number;
  unit_price: number;
  unit_cost: number | null;
  discount_amount: number;
  vat_rate: number;
  line_subtotal: number;
  line_discount: number;
  line_vat: number;
  line_total: number;
};

type SaleRow = {
  id: string;
  organization_id: string;
  sale_number: string;
  customer_id: string | null;
  sale_date: string;
  payment_method: string | null;
  currency: string;
  status: string;
  subtotal: number;
  discount_total: number;
  vat_total: number;
  total: number;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
};

type SaleDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function SaleDetailPage({
  params,
  searchParams,
}: SaleDetailPageProps) {
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

  const {
    data: sale,
    error: saleError,
  } = await supabase
    .from("sales")
    .select(
      `
        id,
        organization_id,
        sale_number,
        customer_id,
        sale_date,
        payment_method,
        currency,
        status,
        subtotal,
        discount_total,
        vat_total,
        total,
        notes,
        completed_at,
        created_at
      `,
    )
    .eq("id", id)
    .eq(
      "organization_id",
      organizationId,
    )
    .maybeSingle();

  if (saleError) {
    throw new Error(
      `Unable to load sale: ${saleError.message}`,
    );
  }

  if (!sale) {
    notFound();
  }

  const {
    data: saleItems,
    error: itemsError,
  } = await supabase
    .from("sale_items")
    .select(
      `
        id,
        product_id,
        product_name_snapshot,
        sku_snapshot,
        quantity,
        unit_price,
        unit_cost,
        discount_amount,
        vat_rate,
        line_subtotal,
        line_discount,
        line_vat,
        line_total
      `,
    )
    .eq("sale_id", sale.id)
    .eq(
      "organization_id",
      organizationId,
    )
    .order("created_at", {
      ascending: true,
    });

  if (itemsError) {
    throw new Error(
      `Unable to load sale items: ${itemsError.message}`,
    );
  }

  async function completeSale() {
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

    const organizationId =
      membership.organization_id;

    const {
      data: saleCheck,
      error: saleCheckError,
    } = await supabase
      .from("sales")
      .select(
        `
          id,
          status
        `,
      )
      .eq("id", id)
      .eq(
        "organization_id",
        organizationId,
      )
      .maybeSingle();

    if (
      saleCheckError ||
      !saleCheck
    ) {
      redirect(
        `/app/sales/${id}?error=${encodeURIComponent(
          saleCheckError?.message ||
            "Sale could not be found.",
        )}`,
      );
    }

    if (
      saleCheck.status ===
      "completed"
    ) {
      redirect(
        `/app/sales/${id}?error=${encodeURIComponent(
          "This sale has already been completed.",
        )}`,
      );
    }

    if (
      saleCheck.status ===
      "cancelled"
    ) {
      redirect(
        `/app/sales/${id}?error=${encodeURIComponent(
          "Cancelled sales cannot be completed.",
        )}`,
      );
    }

    const { error } =
      await supabase.rpc(
        "complete_sale",
        {
          requested_sale_id:
            id,
        },
      );

    if (error) {
      redirect(
        `/app/sales/${id}?error=${encodeURIComponent(
          error.message,
        )}`,
      );
    }

    revalidatePath(
      "/app/sales",
    );

    revalidatePath(
      `/app/sales/${id}`,
    );

    revalidatePath(
      "/app/products",
    );

    revalidatePath(
      "/app/inventory",
    );

    redirect(
      `/app/sales/${id}?success=${encodeURIComponent(
        "Sale completed successfully.",
      )}`,
    );
  }

  const safeSale =
    sale as SaleRow;

  const safeItems =
    (saleItems ?? []) as SaleItemRow[];

  const netBeforeVat =
    Number(
      safeSale.total || 0,
    ) -
    Number(
      safeSale.vat_total || 0,
    );

  return (
    <div className="mx-auto max-w-[1500px]">
      <Link
        href="/app/sales"
        className="inline-flex items-center gap-2 text-sm font-semibold text-[#667085] transition hover:text-[#101828]"
      >
        <ArrowLeft size={16} />
        Back to sales
      </Link>

      <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-[#101828]">
              {
                safeSale.sale_number
              }
            </h1>

            <SaleStatus
              status={
                safeSale.status
              }
            />
          </div>

          <p className="mt-2 text-sm text-[#667085]">
            Review sale details,
            items and transaction
            status.
          </p>
        </div>

        {safeSale.status ===
        "draft" ? (
          <CompleteSaleButton
            saleNumber={
              safeSale.sale_number
            }
            itemCount={
              safeItems.length
            }
            action={
              completeSale
            }
          />
        ) : null}
      </div>

      {query.error ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {query.error}
        </div>
      ) : null}

      {query.success ? (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {query.success}
        </div>
      ) : null}

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <InfoCard
          icon={
            CalendarDays
          }
          label="Sale date"
          value={formatDate(
            safeSale.sale_date,
          )}
        />

        <InfoCard
          icon={UserRound}
          label="Customer"
          value={
            safeSale.customer_id
              ? "Customer"
              : "Walk-in"
          }
        />

        <InfoCard
          icon={CreditCard}
          label="Payment"
          value={formatPaymentMethod(
            safeSale.payment_method,
          )}
        />

        <InfoCard
          icon={ReceiptText}
          label="Total"
          value={formatCurrency(
            Number(
              safeSale.total ||
                0,
            ),
            safeSale.currency,
          )}
        />
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="overflow-hidden rounded-2xl border border-[#eaecf0] bg-white shadow-sm">
          <div className="border-b border-[#eaecf0] px-6 py-5">
            <h2 className="font-semibold text-[#101828]">
              Sale items
            </h2>

            <p className="mt-1 text-sm text-[#667085]">
              {safeItems.length}{" "}
              {safeItems.length ===
              1
                ? "product"
                : "products"}{" "}
              in this sale.
            </p>
          </div>

          {safeItems.length ===
          0 ? (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f2f4f7] text-[#667085]">
                <Package
                  size={20}
                />
              </div>

              <p className="mt-4 font-semibold text-[#101828]">
                No sale items
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-[#eaecf0] bg-[#fcfcfd] text-left">
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                      Product
                    </th>

                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                      Qty
                    </th>

                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                      Price
                    </th>

                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                      VAT
                    </th>

                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#667085]">
                      Discount
                    </th>

                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[#667085]">
                      Total
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {safeItems.map(
                    (item) => {
                      const net =
                        Number(
                          item.line_total ||
                            0,
                        ) -
                        Number(
                          item.line_vat ||
                            0,
                        );

                      return (
                        <tr
                          key={
                            item.id
                          }
                          className="border-b border-[#f2f4f7] last:border-0"
                        >
                          <td className="px-6 py-4">
                            <p className="text-sm font-semibold text-[#101828]">
                              {
                                item.product_name_snapshot
                              }
                            </p>

                            <p className="mt-1 text-xs text-[#98a2b3]">
                              {item.sku_snapshot ||
                                "No SKU"}
                            </p>
                          </td>

                          <td className="px-4 py-4 text-sm text-[#344054]">
                            {formatQuantity(
                              Number(
                                item.quantity,
                              ),
                            )}
                          </td>

                          <td className="px-4 py-4 text-sm text-[#344054]">
                            {formatCurrency(
                              Number(
                                item.unit_price,
                              ),
                              safeSale.currency,
                            )}
                          </td>

                          <td className="px-4 py-4 text-sm text-[#344054]">
                            {Number(
                              item.vat_rate,
                            )}
                            %
                          </td>

                          <td className="px-4 py-4 text-sm text-[#344054]">
                            {formatCurrency(
                              Number(
                                item.line_discount ||
                                  0,
                              ),
                              safeSale.currency,
                            )}
                          </td>

                          <td className="px-6 py-4 text-right">
                            <p className="text-sm font-semibold text-[#101828]">
                              {formatCurrency(
                                Number(
                                  item.line_total ||
                                    0,
                                ),
                                safeSale.currency,
                              )}
                            </p>

                            <p className="mt-1 text-xs text-[#98a2b3]">
                              Net{" "}
                              {formatCurrency(
                                net,
                                safeSale.currency,
                              )}
                              {" · "}
                              VAT{" "}
                              {formatCurrency(
                                Number(
                                  item.line_vat ||
                                    0,
                                ),
                                safeSale.currency,
                              )}
                            </p>
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

        <aside className="space-y-6">
          <section className="rounded-2xl border border-[#eaecf0] bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-[#101828]">
              Summary
            </h2>

            <div className="mt-5 space-y-3">
              <SummaryRow
                label="Subtotal"
                value={formatCurrency(
                  Number(
                    safeSale.subtotal ||
                      0,
                  ),
                  safeSale.currency,
                )}
              />

              <SummaryRow
                label="Discount"
                value={`-${formatCurrency(
                  Number(
                    safeSale.discount_total ||
                      0,
                  ),
                  safeSale.currency,
                )}`}
              />

              <SummaryRow
                label="Net before VAT"
                value={formatCurrency(
                  netBeforeVat,
                  safeSale.currency,
                )}
              />

              <SummaryRow
                label="VAT included"
                value={formatCurrency(
                  Number(
                    safeSale.vat_total ||
                      0,
                  ),
                  safeSale.currency,
                )}
              />

              <div className="border-t border-[#eaecf0] pt-4">
                <SummaryRow
                  label="Total"
                  value={formatCurrency(
                    Number(
                      safeSale.total ||
                        0,
                    ),
                    safeSale.currency,
                  )}
                  strong
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[#eaecf0] bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-[#101828]">
              Sale information
            </h2>

            <dl className="mt-5 space-y-4">
              <DetailRow
                label="Sale number"
                value={
                  safeSale.sale_number
                }
              />

              <DetailRow
                label="Status"
                value={capitalize(
                  safeSale.status,
                )}
              />

              <DetailRow
                label="Payment"
                value={formatPaymentMethod(
                  safeSale.payment_method,
                )}
              />

              <DetailRow
                label="Created"
                value={formatDateTime(
                  safeSale.created_at,
                )}
              />

              {safeSale.completed_at ? (
                <DetailRow
                  label="Completed"
                  value={formatDateTime(
                    safeSale.completed_at,
                  )}
                />
              ) : null}
            </dl>

            {safeSale.notes ? (
              <div className="mt-6 border-t border-[#eaecf0] pt-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#667085]">
                  Notes
                </p>

                <p className="mt-2 text-sm leading-6 text-[#475467]">
                  {
                    safeSale.notes
                  }
                </p>
              </div>
            ) : null}
          </section>
        </aside>
      </div>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{
    size?: number;
  }>;
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-2xl border border-[#eaecf0] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-[#667085]">
            {label}
          </p>

          <p className="mt-4 text-lg font-semibold text-[#101828]">
            {value}
          </p>
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f2f4f7] text-[#475467]">
          <Icon size={17} />
        </div>
      </div>
    </article>
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

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-sm text-[#667085]">
        {label}
      </dt>

      <dd className="text-right text-sm font-medium text-[#344054]">
        {value}
      </dd>
    </div>
  );
}

function SaleStatus({
  status,
}: {
  status: string;
}) {
  if (
    status === "completed"
  ) {
    return (
      <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
        Completed
      </span>
    );
  }

  if (
    status === "cancelled"
  ) {
    return (
      <span className="inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
        Cancelled
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-[#f2f4f7] px-3 py-1 text-xs font-semibold text-[#475467]">
      Draft
    </span>
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
  ).format(
    Number.isFinite(value)
      ? value
      : 0,
  );
}

function formatDate(
  value: string,
) {
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      dateStyle: "medium",
    },
  ).format(
    new Date(value),
  );
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
  ).format(
    new Date(value),
  );
}

function formatPaymentMethod(
  value: string | null,
) {
  if (!value) {
    return "—";
  }

  const labels: Record<
    string,
    string
  > = {
    cash: "Cash",
    card: "Card",
    mb_way: "MB Way",
    bank_transfer:
      "Bank transfer",
    other: "Other",
  };

  return (
    labels[value] ||
    value
  );
}

function formatQuantity(
  value: number,
) {
  return new Intl.NumberFormat(
    "en-GB",
    {
      maximumFractionDigits:
        3,
    },
  ).format(value);
}

function capitalize(
  value: string,
) {
  if (!value) {
    return "—";
  }

  return (
    value
      .charAt(0)
      .toUpperCase() +
    value.slice(1)
  );
}