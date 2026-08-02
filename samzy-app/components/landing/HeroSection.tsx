import Link from "next/link";
import { SpreadsheetPreview } from "./SpreadsheetPreview";

const benefits = [
  {
    icon: "⌗",
    title: "AI + OCR",
    description: "Extract documents in seconds",
    className: "bg-blue-50 text-blue-600",
  },
  {
    icon: "◎",
    title: "Automation",
    description: "Update business data automatically",
    className: "bg-emerald-50 text-emerald-600",
  },
  {
    icon: "▱",
    title: "Intelligence",
    description: "Turn data into better decisions",
    className: "bg-indigo-50 text-indigo-600",
  },
  {
    icon: "⬡",
    title: "Secure",
    description: "Organization-isolated business data",
    className: "bg-orange-50 text-orange-600",
  },
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-[#eef0f5] bg-white">
      <div className="pointer-events-none absolute left-[8%] top-24 h-72 w-72 rounded-full bg-violet-100/60 blur-[100px]" />

      <div className="pointer-events-none absolute right-[8%] top-36 h-72 w-72 rounded-full bg-orange-100/70 blur-[110px]" />

      <div className="relative mx-auto grid max-w-[1440px] gap-14 px-5 pb-16 pt-16 lg:grid-cols-[0.78fr_1.22fr] lg:items-center lg:px-10 lg:pb-20 lg:pt-20">
        <div className="max-w-[590px]">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50/70 px-4 py-2 text-xs font-semibold text-violet-600">
            <span aria-hidden="true">＋</span>
            AI-Powered Business Workspace
          </div>

          <h1 className="mt-7 text-[54px] font-extrabold leading-[0.98] tracking-[-0.06em] text-[#07113b] sm:text-[70px] lg:text-[76px]">
            Intelligent

            <span className="block bg-gradient-to-r from-violet-600 to-indigo-500 bg-clip-text text-transparent">
              Business
            </span>

            Workspace
          </h1>

          <p className="mt-6 text-xl font-medium text-[#4d5674]">
            The spreadsheet that runs your business.
          </p>

          <p className="mt-5 max-w-[520px] text-base leading-8 text-[#69718a]">
            Scan. Extract. Automate. Analyze. All in one intelligent workspace
            designed for businesses that think in spreadsheets. Familiar,
            powerful and intelligent.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex h-14 items-center justify-center rounded-xl bg-[#07113b] px-7 text-sm font-semibold text-white shadow-xl shadow-indigo-950/10 transition duration-200 hover:-translate-y-0.5 hover:bg-[#111d52]"
            >
              Get Started Free

              <span className="ml-3" aria-hidden="true">
                →
              </span>
            </Link>

            <a
              href="#how-it-works"
              className="inline-flex h-14 items-center justify-center rounded-xl border border-[#dce1eb] bg-white px-7 text-sm font-semibold text-[#111a3d] transition duration-200 hover:bg-[#f8f9fc]"
            >
              <span className="mr-3 flex h-6 w-6 items-center justify-center rounded-full border border-[#25305a] text-[9px]">
                ▶
              </span>

              See How It Works
            </a>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
            {benefits.map((benefit) => (
              <div key={benefit.title} className="flex items-start gap-2.5">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${benefit.className}`}
                >
                  {benefit.icon}
                </span>

                <div>
                  <p className="text-[11px] font-bold text-[#1d274b]">
                    {benefit.title}
                  </p>

                  <p className="mt-1 text-[10px] leading-4 text-[#7b8399]">
                    {benefit.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <SpreadsheetPreview />
      </div>

      <div className="relative mx-auto max-w-[1220px] px-5 pb-12 lg:px-10">
        <p className="text-center text-xs font-semibold text-[#5f6881]">
          Built for businesses across retail, wholesale and distribution
        </p>

        <div className="mt-7 grid grid-cols-2 gap-6 text-center text-sm font-semibold text-[#748096] sm:grid-cols-3 lg:grid-cols-5">
          {[
            "Retail Teams",
            "Wholesalers",
            "Distributors",
            "Finance Teams",
            "Growing Businesses",
          ].map((businessType) => (
            <div
              key={businessType}
              className="flex items-center justify-center gap-2"
            >
              <span className="text-lg text-[#9aa3b6]" aria-hidden="true">
                ◉
              </span>

              {businessType}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}