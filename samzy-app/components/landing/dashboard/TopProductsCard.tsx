import { Smartphone } from "lucide-react";

const products = [
  ["iPhone 15 Pro", 128],
  ["Samsung S24", 96],
  ["AirPods Pro", 74],
  ["MacBook Air", 45],
  ["iPad Air", 38],
];

export function TopProductsCard() {
  return (
    <article className="rounded-2xl border border-[#e5e8f0] bg-white p-6 shadow-[0_16px_45px_rgba(31,41,91,0.06)]">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-[#07113b]">
          Top Selling Products
        </h3>

        <span className="rounded-full bg-[#eef2ff] p-2 text-[#4f46e5]">
          <Smartphone size={18} />
        </span>
      </div>

      <div className="mt-6 space-y-4">
        {products.map(([name, sold]) => (
          <div
            key={name}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#f5f7fb]" />

              <div>
                <p className="text-sm font-semibold text-[#07113b]">
                  {name}
                </p>

                <p className="text-xs text-[#98a2b3]">
                  Units Sold
                </p>
              </div>
            </div>

            <span className="text-sm font-bold text-[#07113b]">
              {sold}
            </span>
          </div>
        ))}
      </div>
    </article>
  );
}