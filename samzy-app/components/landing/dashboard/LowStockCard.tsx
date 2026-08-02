import { AlertTriangle, Package } from "lucide-react";

const products = [
  {
    name: "iPhone 15 Pro",
    stock: 3,
    color: "bg-red-100 text-red-600",
  },
  {
    name: "AirPods Pro",
    stock: 5,
    color: "bg-orange-100 text-orange-600",
  },
  {
    name: "USB-C Cable",
    stock: 8,
    color: "bg-amber-100 text-amber-600",
  },
];

export function LowStockCard() {
  return (
    <article className="rounded-2xl border border-[#e5e8f0] bg-white p-6 shadow-[0_16px_45px_rgba(31,41,91,0.06)]">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-[#07113b]">
            Low Stock Alerts
          </h3>

          <p className="mt-1 text-xs text-[#98a2b3]">
            Products that need reordering
          </p>
        </div>

        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
          <AlertTriangle size={20} strokeWidth={2} />
        </span>
      </div>

      <div className="mt-6 space-y-4">
        {products.map((item) => (
          <div
            key={item.name}
            className="flex items-center justify-between rounded-xl border border-[#edf1f7] p-4 transition hover:border-red-200 hover:bg-red-50/30"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f5f7fb]">
                <Package size={18} className="text-[#667085]" />
              </div>

              <div>
                <p className="text-sm font-semibold text-[#07113b]">
                  {item.name}
                </p>

                <p className="text-xs text-[#98a2b3]">
                  Reorder recommended
                </p>
              </div>
            </div>

            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${item.color}`}
            >
              {item.stock} left
            </span>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl bg-gradient-to-r from-red-50 to-orange-50 p-4">
        <div className="flex items-center gap-2">
          <AlertTriangle
            size={18}
            className="text-red-600"
            strokeWidth={2}
          />

          <p className="text-sm font-semibold text-[#07113b]">
            AI Recommendation
          </p>
        </div>

        <p className="mt-2 text-sm leading-6 text-[#667085]">
          Based on recent sales, consider placing a supplier order within the
          next <span className="font-semibold text-[#07113b]">48 hours</span> to
          avoid stock shortages.
        </p>
      </div>
    </article>
  );
}