import {
  BadgeCheck,
  FileScan,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const highlights = [
  {
    icon: Sparkles,
    value: "AI",
    label: "Powered workspace",
    className: "bg-violet-50 text-violet-600",
  },
  {
    icon: FileScan,
    value: "Fast",
    label: "Document processing",
    className: "bg-orange-50 text-orange-600",
  },
  {
    icon: ShieldCheck,
    value: "Secure",
    label: "Protected business data",
    className: "bg-blue-50 text-blue-600",
  },
  {
    icon: BadgeCheck,
    value: "Modern",
    label: "Built to scale",
    className: "bg-emerald-50 text-emerald-600",
  },
];

export function TrustSection() {
  return (
    <section className="border-b border-[#eef0f5] bg-white py-20 lg:py-24">
      <div className="mx-auto grid max-w-[1320px] gap-12 px-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-10">
        <div>
          <p className="text-sm font-bold text-[#182247]">
            Designed for modern businesses
          </p>

          <h2 className="mt-4 max-w-[520px] text-3xl font-extrabold leading-tight tracking-[-0.04em] text-[#07113b] lg:text-4xl">
            A smarter way to manage everyday operations
          </h2>

          <p className="mt-5 max-w-[560px] text-base leading-7 text-[#6e768d]">
            SAMZY connects spreadsheets, products, suppliers, inventory,
            documents and AI insights in one secure workspace.
          </p>

          <div className="mt-9 grid grid-cols-2 gap-8 sm:grid-cols-4">
            {highlights.map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.value}>
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-full ${item.className}`}
                  >
                    <Icon size={19} strokeWidth={1.9} />
                  </span>

                  <p className="mt-4 text-xl font-extrabold text-[#07113b]">
                    {item.value}
                  </p>

                  <p className="mt-1 text-xs leading-5 text-[#788096]">
                    {item.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <article className="rounded-2xl border border-[#e5e8f0] bg-white p-7 shadow-[0_18px_55px_rgba(31,41,91,0.06)]">
          <span className="text-5xl font-extrabold leading-none text-violet-300">
            “
          </span>

          <p className="mt-3 text-base font-medium leading-8 text-[#39435f]">
            SAMZY brings spreadsheets, automation, product management and AI
            insights into one connected business workspace.
          </p>

          <div className="mt-7 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-orange-300 to-violet-500 text-sm font-bold text-white">
              S
            </div>

            <div>
              <p className="text-sm font-bold text-[#111a3d]">
                SAMZY Business Operator
              </p>

              <p className="mt-1 text-xs text-[#858da1]">
                AI-powered business workspace
              </p>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}