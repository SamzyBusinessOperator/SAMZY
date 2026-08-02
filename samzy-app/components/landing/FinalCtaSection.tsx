import Link from "next/link";
import { ArrowRight, Rocket } from "lucide-react";

export function FinalCtaSection() {
  return (
    <section id="pricing" className="bg-white px-5 py-12 lg:px-10 lg:py-16">
      <div className="mx-auto grid max-w-[1320px] gap-8 overflow-hidden rounded-[28px] border border-violet-100 bg-gradient-to-r from-[#f7f5ff] via-[#fbfaff] to-[#f4f7ff] px-7 py-10 sm:grid-cols-[auto_1fr_auto] sm:items-center lg:px-12 lg:py-12">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-violet-100 text-violet-600">
          <Rocket size={34} strokeWidth={1.8} />
        </span>

        <div>
          <h2 className="max-w-[560px] text-2xl font-extrabold leading-tight tracking-[-0.035em] text-[#07113b] lg:text-3xl">
            Ready to transform the way you run your business?
          </h2>

          <p className="mt-3 max-w-[620px] text-sm leading-6 text-[#65708a]">
            Start building a smarter, faster and more connected business with
            SAMZY.
          </p>
        </div>

        <div className="sm:text-center">
          <Link
            href="/signup"
            className="inline-flex h-[52px] items-center justify-center rounded-xl bg-[#07113b] px-7 text-sm font-semibold text-white shadow-xl shadow-indigo-950/10 transition hover:-translate-y-0.5 hover:bg-[#111d52]"
          >
            Get Started Free

            <ArrowRight
              size={16}
              strokeWidth={2}
              className="ml-3"
            />
          </Link>

          <p className="mt-2 text-[10px] text-[#838ba0]">
            No credit card required
          </p>
        </div>
      </div>
    </section>
  );
}