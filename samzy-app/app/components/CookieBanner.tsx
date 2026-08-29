"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

const CONSENT_KEY = "samzy_cookie_consent";
const CONSENT_EVENT = "samzy-cookie-consent-change";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CONSENT_EVENT, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CONSENT_EVENT, callback);
  };
}

function getClientSnapshot() {
  return window.localStorage.getItem(CONSENT_KEY);
}

function getServerSnapshot() {
  return "server";
}

export default function CookieBanner() {
  const consent = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  function saveConsent(value: "accepted" | "declined") {
    window.localStorage.setItem(CONSENT_KEY, value);

    window.dispatchEvent(
      new Event(CONSENT_EVENT),
    );
  }

  if (consent === "server") {
    return null;
  }

  if (consent === "accepted" || consent === "declined") {
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
              className="font-semibold text-orange-400 transition hover:text-orange-300"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>

        <div className="flex shrink-0 gap-3">
          <button
            type="button"
            onClick={() => saveConsent("declined")}
            className="h-10 rounded-xl border border-white/15 bg-white/5 px-5 text-sm font-semibold text-white/80 transition hover:bg-white/10"
          >
            Decline
          </button>

          <button
            type="button"
            onClick={() => saveConsent("accepted")}
            className="h-10 rounded-xl bg-orange-500 px-5 text-sm font-semibold text-white transition hover:bg-orange-600"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}