import {
  CheckCircle2,
  ScanLine,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Workflow,
} from "lucide-react";

import { AIInsightCard } from "./dashboard/AIInsightCard";
import { LowStockCard } from "./dashboard/LowStockCard";
import { RevenueCard } from "./dashboard/RevenueCard";
import { TopProductsCard } from "./dashboard/TopProductsCard";

const benefits = [
  {
    icon: Workflow,
    title: "Automate repetitive work",
    description:
      "Reduce manual data entry across products, invoices, pricing and inventory.",
  },
  {
    icon: ScanLine,
    title: "Turn documents into data",
    description:
      "Extract information from invoices, receipts and quotations using AI-powered OCR.",
  },
  {
    icon: TrendingUp,
    title: "Make better decisions",
    description:
      "Understand margins, supplier prices, stock levels and sales performance.",
  },
  {
    icon: Sparkles,
    title: "Ask your business anything",
    description:
      "Use the AI Assistant to answer questions using your live operational data.",
  },
  {
    icon: ShieldCheck,
    title: "Keep business data secure",
    description:
      "Each organization operates inside its own protected and isolated workspace.",
  },
];

export function SolutionsSection() {
  return (
    <section
      id="solutions"
      className="relative scroll-mt-20 overflow-hidden border-b border-[#eef0f5] bg-[#fdfdfe] py-20 lg:py-28"
    >
      <div className="pointer-events-none absolute -right-20 top-16 h-80 w-80 rounded-full bg-emerald-100/50 blur-[120px]" />

      <div className="pointer-events-none absolute -left-24 bottom-10 h-72 w-72 rounded-full bg-violet-100/50 blur-[120px]" />

      <div className="relative mx-auto grid max-w-[1380px] gap-14 px-5 lg:grid-cols-[0.72fr_1.28fr] lg:items-center lg:px-10">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-4 py-2 text-xs font-semibold text-violet-600">
            <Sparkles size={14} strokeWidth={2} />
            Why Teams Love SAMZY
          </div>

          <h2 className="mt-7 max-w-[470px] text-4xl font-extrabold leading-tight tracking-[-0.045em] text-[#07113b] lg:text-5xl">
            Built for modern business teams
          </h2>

          <p className="mt-6 max-w-[480px] text-base leading-7 text-[#6e768d]">
            SAMZY combines the familiarity of spreadsheets with AI,
            automation and real-time business intelligence.
          </p>

          <div className="mt-9 space-y-5">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;

              return (
                <div key={benefit.title} className="flex items-start gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <Icon size={19} strokeWidth={1.9} />
                  </span>

                  <div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2
                        size={15}
                        className="text-emerald-600"
                        strokeWidth={2.2}
                      />

                      <h3 className="text-sm font-bold text-[#152047]">
                        {benefit.title}
                      </h3>
                    </div>

                    <p className="mt-1.5 max-w-[420px] text-sm leading-6 text-[#737b91]">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <RevenueCard />

          <TopProductsCard />

          <LowStockCard />

          <AIInsightCard />
        </div>
      </div>
    </section>
  );
}