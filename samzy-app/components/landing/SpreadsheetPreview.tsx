const rows = [
  ["01/05/2026", "iPhone 15", "Mobiles", "5", "€250.00", "€1,250.00", "12"],
  ["02/05/2026", "Samsung S24", "Mobiles", "3", "€300.00", "€900.00", "8"],
  ["03/05/2026", "AirPods Pro", "Accessories", "4", "€200.00", "€800.00", "15"],
  ["04/05/2026", "MacBook Air", "Laptops", "2", "€800.00", "€1,600.00", "6"],
  ["05/05/2026", "Dell XPS 13", "Laptops", "1", "€1,200.00", "€1,200.00", "4"],
  ["06/05/2026", "iPad Air", "Tablets", "2", "€350.00", "€700.00", "10"],
];

const headings = [
  "Date",
  "Product",
  "Category",
  "Qty",
  "Unit Price",
  "Total",
  "Stock",
];

export function SpreadsheetPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[760px]">
      <div className="absolute -inset-10 rounded-full bg-[radial-gradient(circle,rgba(102,83,255,0.15),transparent_68%)] blur-2xl" />

      <div className="relative overflow-hidden rounded-[24px] border border-[#e3e7f2] bg-white shadow-[0_30px_80px_rgba(31,41,91,0.14)]">
        <div className="flex h-14 items-center justify-between border-b border-[#edf0f7] px-4">
          <div className="flex items-center gap-3">
            <span className="text-[#667085]">☰</span>

            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600" />

              <span className="text-sm font-extrabold tracking-[-0.04em] text-[#07113b]">
                SAMZY
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg border border-[#e0e4ef] px-3 py-1.5 text-[11px] font-semibold text-violet-600"
            >
              Share
            </button>

            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">
              A
            </div>
          </div>
        </div>

        <div className="border-b border-[#edf0f7] px-4 py-2">
          <div className="flex flex-wrap items-center gap-4 text-[10px] font-medium text-[#344054]">
            {[
              "File",
              "Edit",
              "View",
              "Insert",
              "Format",
              "Data",
              "Tools",
              "Help",
            ].map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>

        <div className="border-b border-[#edf0f7] px-4 py-2">
          <div className="flex flex-wrap items-center gap-3 text-[10px] text-[#667085]">
            <span>↶</span>
            <span>↷</span>
            <span>100%</span>
            <span>€</span>
            <span>%</span>
            <strong>B</strong>
            <em>I</em>
            <span className="underline">U</span>
          </div>
        </div>

        <div className="flex items-center gap-3 border-b border-[#edf0f7] px-4 py-2 text-[10px]">
          <span className="rounded-md bg-[#f6f7fb] px-2 py-1 text-[#475467]">
            F7
          </span>

          <span className="text-[#667085]">ƒx</span>

          <span className="flex-1 rounded-md border border-[#e6e9f1] px-3 py-1.5 text-[#344054]">
            =SUM(D2:E7)
          </span>
        </div>

        <div className="grid min-h-[330px] grid-cols-1 xl:grid-cols-[1fr_155px]">
          <div className="overflow-x-auto border-r border-[#edf0f7]">
            <div className="min-w-[660px]">
              <div className="grid grid-cols-[28px_repeat(7,minmax(78px,1fr))] bg-[#fafbfe] text-center text-[9px] text-[#98a2b3]">
                <span className="border-b border-r border-[#edf0f7] py-2" />

                {["A", "B", "C", "D", "E", "F", "G"].map((letter) => (
                  <span
                    key={letter}
                    className="border-b border-r border-[#edf0f7] py-2 last:border-r-0"
                  >
                    {letter}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-[28px_repeat(7,minmax(78px,1fr))] text-[9px]">
                <span className="border-b border-r border-[#edf0f7] bg-[#fafbfe] py-3 text-center text-[#98a2b3]">
                  1
                </span>

                {headings.map((heading) => (
                  <span
                    key={heading}
                    className="border-b border-r border-[#edf0f7] bg-[#fff9f4] px-1 py-3 text-center font-bold text-[#344054] last:border-r-0"
                  >
                    {heading}
                  </span>
                ))}

                {rows.flatMap((row, rowIndex) => [
                  <span
                    key={`number-${rowIndex}`}
                    className="border-b border-r border-[#edf0f7] bg-[#fafbfe] py-3 text-center text-[#98a2b3]"
                  >
                    {rowIndex + 2}
                  </span>,

                  ...row.map((value, cellIndex) => (
                    <span
                      key={`${rowIndex}-${cellIndex}`}
                      className={[
                        "border-b border-r border-[#edf0f7] px-1 py-3 text-center text-[#344054] last:border-r-0",
                        rowIndex === 5 && cellIndex === 5
                          ? "relative bg-blue-50 font-semibold after:absolute after:inset-0 after:border-2 after:border-blue-500"
                          : "",
                      ].join(" ")}
                    >
                      {value}
                    </span>
                  )),
                ])}
              </div>

              <div className="flex h-12 items-center gap-5 border-t border-[#edf0f7] px-4 text-[9px] text-[#667085]">
                <span>‹</span>
                <span>›</span>
                <span>Dashboard</span>
                <span>Sales</span>

                <span className="rounded-md bg-emerald-50 px-2 py-1 font-semibold text-emerald-600">
                  Purchases
                </span>

                <span>Inventory</span>
                <span>＋</span>
              </div>
            </div>
          </div>

          <aside className="hidden bg-[#fbfbfe] p-3 xl:block">
            <div className="rounded-xl border border-[#e7e9f2] bg-white p-3">
              <p className="text-[11px] font-bold text-[#101828]">
                AI Assistant
              </p>

              <div className="mt-3 space-y-2">
                {[
                  "What should I reorder?",
                  "Compare supplier prices",
                  "Top selling products",
                  "Profit last month",
                ].map((question) => (
                  <button
                    type="button"
                    key={question}
                    className="w-full rounded-lg border border-[#eceef5] bg-[#fcfcfe] p-2 text-left text-[8px] text-[#475467]"
                  >
                    {question}
                  </button>
                ))}
              </div>

              <div className="mt-3 flex items-center justify-between rounded-lg border border-[#eceef5] px-2 py-2">
                <span className="text-[8px] text-[#98a2b3]">
                  Ask anything...
                </span>

                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-violet-600 text-[9px] text-white">
                  →
                </span>
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-[#e7e9f2] bg-white p-3">
              <p className="text-[8px] text-[#667085]">Total Profit</p>

              <p className="mt-1 text-xl font-bold text-[#101828]">
                €12,540
              </p>

              <p className="mt-1 text-[8px] font-semibold text-emerald-600">
                +10% this month
              </p>

              <div className="mt-5 flex h-14 items-end gap-1">
                {[25, 39, 30, 50, 43, 62, 76].map((height, index) => (
                  <div
                    key={index}
                    className="flex-1 rounded-t-sm bg-violet-400"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}