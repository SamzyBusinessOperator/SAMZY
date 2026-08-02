import {
  ArrowUpRight,
  Lightbulb,
  Sparkles,
  TrendingDown,
} from "lucide-react";

export function AIInsightCard() {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-[#f8f7ff] via-white to-[#f2f6ff] p-6 shadow-[0_16px_45px_rgba(76,29,149,0.08)]">
      <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-violet-200/40 blur-3xl" />

      <div className="pointer-events-none absolute -bottom-14 -left-10 h-32 w-32 rounded-full bg-blue-200/40 blur-3xl" />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-600/20">
              <Sparkles size={20} strokeWidth={1.9} />
            </span>

            <div>
              <h3 className="text-sm font-bold text-[#07113b]">
                AI Business Insight
              </h3>

              <p className="mt-1 text-xs text-[#7b8399]">
                Generated from your latest business data
              </p>
            </div>
          </div>

          <span className="rounded-full border border-violet-100 bg-white/80 px-3 py-1 text-[10px] font-semibold text-violet-600">
            Live insight
          </span>
        </div>

        <div className="mt-6 rounded-2xl border border-white/80 bg-white/75 p-5 shadow-sm backdrop-blur">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Lightbulb size={18} strokeWidth={1.9} />
            </span>

            <div>
              <p className="text-sm font-semibold leading-6 text-[#182247]">
                You could save approximately €1,250 on your next supplier order.
              </p>

              <p className="mt-2 text-xs leading-6 text-[#69728a]">
                Global Supplies currently offers the lowest verified price for
                iPhone 15 units, while maintaining the same delivery window.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-[#e7e9f2] bg-white/80 p-4">
            <div className="flex items-center gap-2 text-emerald-600">
              <TrendingDown size={16} strokeWidth={2} />

              <span className="text-xs font-bold">
                8.4% lower cost
              </span>
            </div>

            <p className="mt-2 text-[11px] leading-5 text-[#7b8399]">
              Compared with your current supplier price.
            </p>
          </div>

          <div className="rounded-xl border border-[#e7e9f2] bg-white/80 p-4">
            <div className="flex items-center gap-2 text-blue-600">
              <ArrowUpRight size={16} strokeWidth={2} />

              <span className="text-xs font-bold">
                Higher margin
              </span>
            </div>

            <p className="mt-2 text-[11px] leading-5 text-[#7b8399]">
              Estimated margin improvement of 3.1%.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#07113b] px-5 text-sm font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-[#111d52]"
        >
          View Recommendation

          <ArrowUpRight
            size={16}
            strokeWidth={2}
            className="ml-2"
          />
        </button>
      </div>
    </article>
  );
}