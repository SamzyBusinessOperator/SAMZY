"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type OnboardingStatus =
  | "idle"
  | "creating"
  | "success";

export default function OnboardingForm() {
  const router = useRouter();

  const [businessName, setBusinessName] = useState("");
  const [workspaceName, setWorkspaceName] =
    useState("Main Workspace");

  const [message, setMessage] = useState("");
  const [status, setStatus] =
    useState<OnboardingStatus>("idle");

  const loading = status === "creating";

  function goToDashboard() {
    setStatus("success");

    window.setTimeout(() => {
      router.replace("/app/dashboard");
    }, 1400);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (loading || status === "success") {
      return;
    }

    const trimmedBusinessName = businessName.trim();
    const trimmedWorkspaceName = workspaceName.trim();

    if (!trimmedBusinessName) {
      setMessage("Business name is required.");
      return;
    }

    setStatus("creating");
    setMessage("");

    try {
      const supabase = createClient();

      const { error } = await supabase.rpc(
        "create_organization_with_workspace",
        {
          organization_name: trimmedBusinessName,
          workspace_name:
            trimmedWorkspaceName || "Main Workspace",
          organization_currency: "EUR",
          organization_timezone: "Europe/Lisbon",
          organization_country_code: "PT",
        },
      );

      if (error) {
        if (
          error.message
            .toLowerCase()
            .includes("already belongs to an organization")
        ) {
          goToDashboard();
          return;
        }

        setMessage(error.message);
        setStatus("idle");
        return;
      }

      goToDashboard();
    } catch {
      setMessage(
        "Unable to create your workspace. Please try again.",
      );
      setStatus("idle");
    }
  }

  if (status === "success") {
    return (
      <main className="min-h-screen bg-[#f7f8fa] px-5 py-10">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-3">
            <Image
              src="/samzy-logo.png"
              alt="SAMZY"
              width={38}
              height={38}
              priority
            />

            <span className="text-xl font-bold tracking-tight text-[#101828]">
              SAMZY
            </span>
          </div>

          <section className="mt-12 flex min-h-[500px] flex-col items-center justify-center rounded-3xl border border-black/5 bg-white px-8 py-16 text-center shadow-[0_20px_70px_rgba(16,24,40,0.08)]">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle2
                size={42}
                className="text-emerald-600"
              />
            </div>

            <h1 className="mt-7 text-4xl font-semibold tracking-tight text-[#101828]">
              Workspace created
            </h1>

            <p className="mt-4 max-w-md text-base leading-7 text-[#667085]">
              Your SAMZY business workspace is ready.
              Products, inventory, suppliers and business
              data can now be managed from your dashboard.
            </p>

            <div className="mt-8 flex items-center gap-2 text-sm font-medium text-[#667085]">
              <Loader2
                size={16}
                className="animate-spin"
              />
              Opening your dashboard...
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f8fa] px-5 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-3">
          <Image
            src="/samzy-logo.png"
            alt="SAMZY"
            width={38}
            height={38}
            priority
          />

          <span className="text-xl font-bold tracking-tight text-[#101828]">
            SAMZY
          </span>
        </div>

        <section className="mt-12 rounded-3xl border border-black/5 bg-white p-8 shadow-[0_20px_70px_rgba(16,24,40,0.08)] md:p-12">
          <span className="text-sm font-semibold text-[#ff6b00]">
            WORKSPACE SETUP
          </span>

          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[#101828]">
            Welcome to SAMZY
          </h1>

          <p className="mt-3 max-w-xl leading-7 text-[#667085]">
            Create your business workspace. Products,
            inventory, suppliers, documents, reports and AI
            insights will all belong to this organization.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-10 grid gap-6 md:grid-cols-2"
          >
            <label className="md:col-span-2">
              <span className="mb-2 block text-sm font-medium">
                Business or organization name
              </span>

              <input
                required
                disabled={loading}
                value={businessName}
                onChange={(event) =>
                  setBusinessName(event.target.value)
                }
                className="h-12 w-full rounded-xl border border-[#d0d5dd] px-4 outline-none transition focus:border-[#101828] disabled:bg-[#f9fafb]"
                placeholder="Example: RM TECH"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-medium">
                Workspace name
              </span>

              <input
                required
                disabled={loading}
                value={workspaceName}
                onChange={(event) =>
                  setWorkspaceName(event.target.value)
                }
                className="h-12 w-full rounded-xl border border-[#d0d5dd] px-4 outline-none transition focus:border-[#101828] disabled:bg-[#f9fafb]"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-medium">
                Currency
              </span>

              <input
                disabled
                value="EUR — Euro"
                className="h-12 w-full rounded-xl border border-[#eaecf0] bg-[#f9fafb] px-4 text-[#667085]"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-medium">
                Country
              </span>

              <input
                disabled
                value="Portugal"
                className="h-12 w-full rounded-xl border border-[#eaecf0] bg-[#f9fafb] px-4 text-[#667085]"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-medium">
                Timezone
              </span>

              <input
                disabled
                value="Europe/Lisbon"
                className="h-12 w-full rounded-xl border border-[#eaecf0] bg-[#f9fafb] px-4 text-[#667085]"
              />
            </label>

            {message && (
              <p className="md:col-span-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={
                loading || !businessName.trim()
              }
              className="md:col-span-2 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#101828] font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                  Creating workspace...
                </>
              ) : (
                "Create workspace"
              )}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}