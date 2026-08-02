import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fbfcff] px-6">
      <div className="mx-auto max-w-xl text-center">
        <div className="mb-8 inline-flex h-24 w-24 items-center justify-center rounded-full bg-[#eef3ff]">
          <span className="text-5xl font-bold text-[#07113b]">404</span>
        </div>

        <h1 className="text-5xl font-bold tracking-tight text-[#07113b]">
          Page not found
        </h1>

        <p className="mt-6 text-lg leading-8 text-[#667085]">
          Sorry, the page you&apos;re looking for doesn&apos;t exist or has been
          moved.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-[#07113b] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#0d1a52]"
          >
            <Home size={18} />
            Go Home
          </Link>

          <Link
            href="/landing"
            className="inline-flex items-center gap-2 rounded-xl border border-[#d9def2] bg-white px-6 py-3 text-sm font-semibold text-[#07113b] transition hover:bg-[#f7f9ff]"
          >
            <ArrowLeft size={18} />
            Back to Landing
          </Link>
        </div>

        <div className="mt-12 rounded-2xl border border-[#e8ecf5] bg-white p-6 shadow-sm">
          <p className="text-sm text-[#98a2b3]">
            Need help?
          </p>

          <p className="mt-2 font-semibold text-[#07113b]">
            Contact the SAMZY team if you believe this is an error.
          </p>
        </div>
      </div>
    </main>
  );
}