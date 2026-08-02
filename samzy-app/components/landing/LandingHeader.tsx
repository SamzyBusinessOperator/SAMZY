"use client";

import Link from "next/link";
import { useState } from "react";
import { Brand } from "./Brand";

const navigation = [
  { label: "Product", href: "#modules" },
  { label: "Solutions", href: "#solutions" },
  { label: "How it Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "Company", href: "#footer" },
];

export function LandingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-6 lg:px-10">
        <Link href="/landing">
          <Brand />
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {navigation.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-sm font-semibold text-gray-700 transition hover:text-violet-600"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href="/login"
            className="rounded-xl border px-5 py-3 text-sm font-semibold"
          >
            Sign In
          </Link>

          <Link
            href="/signup"
            className="rounded-xl bg-[#07113B] px-6 py-3 text-sm font-semibold text-white hover:bg-[#111d52]"
          >
            Get Started Free →
          </Link>
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-xl border p-3 lg:hidden"
        >
          ☰
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t bg-white lg:hidden">
          {navigation.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="block px-6 py-4 text-sm font-semibold hover:bg-gray-50"
              onClick={() => setMobileOpen(false)}
            >
              {item.label}
            </a>
          ))}

          <div className="grid grid-cols-2 gap-3 p-6">
            <Link
              href="/login"
              className="rounded-xl border py-3 text-center font-semibold"
            >
              Sign In
            </Link>

            <Link
              href="/signup"
              className="rounded-xl bg-[#07113B] py-3 text-center font-semibold text-white"
            >
              Start Free
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}