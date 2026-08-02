const steps = [
  {
    number: "1",
    icon: "▤",
    title: "Scan & Upload",
    description:
      "Upload invoices, receipts, quotations or delivery notes using PDF, image or camera.",
    iconClass: "bg-blue-50 text-blue-600",
    numberClass: "bg-blue-600",
  },
  {
    number: "2",
    icon: "▦",
    title: "AI Extract & Automate",
    description:
      "SAMZY reads the document, extracts the data and updates products, inventory and reports automatically.",
    iconClass: "bg-emerald-50 text-emerald-600",
    numberClass: "bg-emerald-500",
  },
  {
    number: "3",
    icon: "✓",
    title: "Analyze & Decide",
    description:
      "Compare prices, identify trends, track performance and make better business decisions.",
    iconClass: "bg-violet-50 text-violet-600",
    numberClass: "bg-violet-600",
  },
];

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-20 border-b border-[#eef0f5] bg-[#fdfdfe] py-20 lg:py-24"
    >
      <div className="mx-auto max-w-[1260px] px-5 lg:px-10">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold tracking-[-0.04em] text-[#07113b] lg:text-4xl">
            How SAMZY Works
          </h2>

          <p className="mt-3 text-sm text-[#6c748c]">
            From document to insight in three simple steps
          </p>
        </div>

        <div className="relative mt-14 grid gap-6 lg:grid-cols-3">
          <div className="absolute left-[20%] right-[20%] top-28 hidden border-t border-dashed border-[#cbd2e2] lg:block" />

          {steps.map((step) => (
            <article
              key={step.number}
              className="relative rounded-2xl border border-[#e5e8f0] bg-white px-7 pb-9 pt-0 text-center shadow-[0_10px_35px_rgba(31,41,91,0.04)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(31,41,91,0.08)]"
            >
              <div
                className={`mx-auto -mt-7 flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold ${step.iconClass}`}
              >
                {step.icon}
              </div>

              <span
                className={`absolute right-6 top-5 flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white ${step.numberClass}`}
              >
                {step.number}
              </span>

              <h3 className="mt-7 text-lg font-bold text-[#111a3d]">
                {step.title}
              </h3>

              <p className="mx-auto mt-3 max-w-[290px] text-sm leading-6 text-[#737b91]">
                {step.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}