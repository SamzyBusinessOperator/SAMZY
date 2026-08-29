const metrics = [
  ["Revenue", "€24,560.80", "+12.8% this month"],
  ["Profit", "€8,560.20", "+8.1% this month"],
  ["Expenses", "€5,240.60", "-2.5% this month"],
  ["Purchases", "€15,200.30", "+5.7% this month"],
  ["Inventory", "€24,560.80", "236 total products"],
];

const activity = [
  ["Sales invoice created", "€1,250.00", "Today, 10:42"],
  ["Purchase invoice scanned", "ABC Traders", "Today, 09:18"],
  ["Inventory adjusted", "Wireless Headphones", "Yesterday"],
  ["Customer payment received", "€840.00", "Yesterday"],
];

const lowStockProducts = [
  ["Wireless Headphones", "5 left"],
  ["Smart Watch", "8 left"],
  ["USB-C Cable", "4 left"],
  ["Power Bank", "7 left"],
  ["Laptop Stand", "6 left"],
];

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-[1500px]">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#101828]">
            Dashboard
          </h1>

          <p className="mt-2 text-[#667085]">
            Business health, activity and intelligent insights.
          </p>
        </div>

        <button
          type="button"
          className="h-11 rounded-xl bg-[#101828] px-5 text-sm font-semibold text-white transition hover:bg-[#344054]"
        >
          + New spreadsheet
        </button>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {metrics.map(([label, value, note], index) => (
          <article
            key={label}
            className="rounded-2xl border border-[#eaecf0] bg-white p-5 shadow-sm"
          >
            <div
              className={[
                "mb-5 flex h-10 w-10 items-center justify-center rounded-xl",
                index === 0
                  ? "bg-emerald-50 text-emerald-700"
                  : index === 1
                    ? "bg-green-50 text-green-700"
                    : index === 2
                      ? "bg-red-50 text-red-700"
                      : index === 3
                        ? "bg-blue-50 text-blue-700"
                        : "bg-violet-50 text-violet-700",
              ].join(" ")}
            >
              {index + 1}
            </div>

            <p className="text-sm text-[#667085]">
              {label}
            </p>

            <p className="mt-2 text-2xl font-semibold text-[#101828]">
              {value}
            </p>

            <p
              className={[
                "mt-2 text-xs font-medium",
                label === "Expenses"
                  ? "text-red-600"
                  : "text-emerald-700",
              ].join(" ")}
            >
              {note}
            </p>
          </article>
        ))}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <article className="rounded-2xl border border-[#eaecf0] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold text-[#101828]">
                Profit overview
              </h2>

              <p className="mt-1 text-sm text-[#667085]">
                Performance over the last seven days
              </p>
            </div>

            <button
              type="button"
              className="rounded-lg border border-[#d0d5dd] px-3 py-2 text-xs font-medium text-[#344054]"
            >
              This week
            </button>
          </div>

          <div className="mt-8 flex h-72 items-end gap-4 border-b border-l border-[#eaecf0] px-6 pb-4">
            {[38, 52, 45, 68, 62, 82, 92].map(
              (height, index) => (
                <div
                  key={index}
                  className="flex h-full flex-1 flex-col justify-end"
                >
                  <div
                    className="w-full rounded-t-lg bg-[#d1fadf]"
                    style={{
                      height: `${height}%`,
                    }}
                  />
                </div>
              ),
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-[#eaecf0] bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-[#101828]">
            Low-stock alerts
          </h2>

          <p className="mt-1 text-sm text-[#667085]">
            Products requiring attention
          </p>

          <div className="mt-6 space-y-4">
            {lowStockProducts.map(([product, stock]) => (
              <div
                key={product}
                className="flex items-center justify-between border-b border-[#f2f4f7] pb-4 last:border-0 last:pb-0"
              >
                <div>
                  <p className="text-sm font-medium text-[#101828]">
                    {product}
                  </p>

                  <p className="mt-1 text-xs text-[#98a2b3]">
                    Reorder suggested
                  </p>
                </div>

                <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                  {stock}
                </span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-6 rounded-2xl border border-[#eaecf0] bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-[#101828]">
              Recent activity
            </h2>

            <p className="mt-1 text-sm text-[#667085]">
              Latest changes across your workspace
            </p>
          </div>

          <button
            type="button"
            className="text-sm font-semibold text-[#344054]"
          >
            View all
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {activity.map(([title, detail, time]) => (
            <div
              key={title}
              className="rounded-xl border border-[#eaecf0] p-4"
            >
              <p className="text-sm font-medium text-[#101828]">
                {title}
              </p>

              <p className="mt-2 text-sm font-semibold text-[#101828]">
                {detail}
              </p>

              <p className="mt-2 text-xs text-[#98a2b3]">
                {time}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}