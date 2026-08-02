import { ArrowUpRight, TrendingUp } from "lucide-react";

const chartPoints = [28, 44, 36, 58, 49, 72, 63, 88];

export function RevenueCard() {
  return (
    <article className="rounded-2xl border border-[#e5e8f0] bg-white p-6 shadow-[0_16px_45px_rgba(31,41,91,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-[#152047]">
            Revenue Overview
          </p>

          <p className="mt-1 text-xs text-[#8890a3]">
            This month
          </p>
        </div>

        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          <TrendingUp size={19} strokeWidth={1.9} />
        </span>
      </div>

      <div className="mt-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-3xl font-extrabold tracking-[-0.04em] text-[#07113b]">
            €48,250
          </p>

          <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
            <ArrowUpRight size={14} strokeWidth={2} />
            16.4% vs last month
          </div>
        </div>

        <span className="rounded-full bg-[#f5f7fb] px-3 py-1 text-[10px] font-semibold text-[#667085]">
          Last 30 days
        </span>
      </div>

      <div className="relative mt-8 h-40 overflow-hidden rounded-xl border border-emerald-100 bg-gradient-to-b from-emerald-50 to-white px-4 pb-4 pt-5">
        <div className="absolute inset-x-4 top-1/4 border-t border-dashed border-emerald-100" />
        <div className="absolute inset-x-4 top-1/2 border-t border-dashed border-emerald-100" />
        <div className="absolute inset-x-4 top-3/4 border-t border-dashed border-emerald-100" />

        <div className="relative flex h-full items-end gap-2">
          {chartPoints.map((height, index) => (
            <div
  key={`${height}-${index}`}
  className="group flex h-full flex-1 items-end"
>
              <div
                className="relative min-h-3 w-full rounded-t-md bg-gradient-to-t from-emerald-600 to-emerald-300 shadow-[0_5px_14px_rgba(16,185,129,0.22)] transition duration-200 group-hover:from-emerald-700 group-hover:to-emerald-400"
                style={{ height: `${height}%` }}
              >
                <span className="absolute -top-7 left-1/2 hidden -translate-x-1/2 rounded-md bg-[#07113b] px-2 py-1 text-[9px] font-semibold text-white group-hover:block">
                  €{Math.round(height * 73)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex justify-between text-[9px] font-medium text-[#98a2b3]">
        <span>Week 1</span>
        <span>Week 2</span>
        <span>Week 3</span>
        <span>Week 4</span>
      </div>
    </article>
  );
}