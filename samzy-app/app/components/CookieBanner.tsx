"use client";

import Link from "next/link";
import { useState } from "react";

const CONSENT_KEY = "samzy_cookie_consent";

function getInitialVisibility() {
  if (typeof window === "undefined") {
    return false;
  }

  return !window.localStorage.getItem(CONSENT_KEY);
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(getInitialVisibility);

  function accept() {
    window.localStorage.setItem(CONSENT_KEY, "accepted");
    setVisible(false);
  }

  function decline() {
    window.localStorage.setItem(CONSENT_KEY, "declined");
    setVisible(false);
  }

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed inset-x-4 bottom-4 z-[100] mx-auto max-w-2xl rounded-2xl border border-white/10 bg-[#111111] p-5 text-white shadow-[0_24px_70px_rgba(0,0,0,0.35)] sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-md">
          <p className="text-sm font-semibold">
            We use cookies
          </p>

          <p className="mt-2 text-xs leading-5 text-white/65">
            Essential cookies keep you signed in and help improve your
            experience. Read our{" "}
            <Link
              href="/privacy"
              className="font-semibold text-orange-400 hover:text-orange-300"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>

        <div className="flex shrink-0 gap-3">
          <button
            type="button"
            onClick={decline}
            className="h-10 rounded-xl border border-white/15 bg-white/5 px-5 text-sm font-semibold text-white/80 transition hover:bg-white/10"
          >
            Decline
          </button>

          <button
            type="button"
            onClick={accept}
            className="h-10 rounded-xl bg-orange-500 px-5 text-sm font-semibold text-white transition hover:bg-orange-600"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}