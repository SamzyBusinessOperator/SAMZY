import Link from "next/link";

const modules = [
  {
    icon: "▦",
    title: "Spreadsheet",
    description:
      "An Excel-like workspace with formulas, formatting and structured business data.",
    className: "bg-emerald-50 text-emerald-600",
  },
  {
    icon: "⌗",
    title: "Smart Scanners",
    description:
      "AI-powered OCR for invoices, receipts, quotations and delivery documents.",
    className: "bg-blue-50 text-blue-600",
  },
  {
    icon: "◇",
    title: "Inventory",
    description:
      "Real-time stock tracking, automatic updates, alerts and inventory valuation.",
    className: "bg-orange-50 text-orange-600",
  },
  {
    icon: "♙",
    title: "Suppliers",
    description:
      "Manage suppliers, compare prices, review quotations and monitor performance.",
    className: "bg-indigo-50 text-indigo-600",
  },
  {
    icon: "◔",
    title: "Dashboard",
    description:
      "Real-time KPIs, charts, cash flow, profitability and business health.",
    className: "bg-violet-50 text-violet-600",
  },
  {
    icon: "✦",
    title: "AI Assistant",
    description:
      "Ask questions and receive answers, insights and predictions from your data.",
    className: "bg-pink-50 text-pink-600",
  },
];

export function ModulesSection() {
  return (
    <section
      id="modules"
      className="scroll-mt-20 border-b border-[#eef0f5] bg-white py-20 lg:py-24"
    >
      <div className="mx-auto max-w-[1380px] px-5 lg:px-10">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold tracking-[-0.04em] text-[#07113b] lg:text-4xl">
            Powerful Modules. One Intelligent Workspace.
          </h2>

          <p className="mt-3 text-sm text-[#6c748c]">
            Everything your business needs in one place.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {modules.map((module) => (
            <article
              key={module.title}
              className="rounded-2xl border border-[#e5e8f0] bg-white p-6 text-center shadow-[0_8px_25px_rgba(31,41,91,0.035)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(31,41,91,0.08)]"
            >
              <span
                className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold ${module.className}`}
              >
                {module.icon}
              </span>

              <h3 className="mt-5 text-base font-bold text-[#111a3d]">
                {module.title}
              </h3>

              <p className="mt-3 text-xs leading-6 text-[#737b91]">
                {module.description}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/signup"
            className="inline-flex h-12 items-center justify-center rounded-xl border border-[#dce1eb] bg-white px-6 text-sm font-semibold text-[#111a3d] transition hover:bg-[#f8f9fc]"
          >
            Explore All Features
            <span className="ml-3" aria-hidden="true">
              →
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}