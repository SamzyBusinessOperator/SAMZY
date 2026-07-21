"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function OnboardingPage() {
  const router = useRouter();

  const [businessName, setBusinessName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("Main Workspace");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const supabase = createClient();

      const { error } = await supabase.rpc(
        "create_organization_with_workspace",
        {
          organization_name: businessName.trim(),
          workspace_name: workspaceName.trim(),
          organization_currency: "EUR",
          organization_timezone: "Europe/Lisbon",
          organization_country_code: "PT",
        },
      );

      if (error) {
        setMessage(error.message);
        return;
      }

      router.replace("/app/dashboard");
      router.refresh();
    } catch {
      setMessage("Unable to create your workspace. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f8fa] px-6 py-12 text-[#101828]">
      <div className="mx-auto max-w-3xl">
        <header className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="SAMZY"
            width={42}
            height={42}
            className="rounded-xl"
          />
          <span className="text-xl font-semibold">SAMZY</span>
        </header>

        <section className="mt-12 rounded-3xl border border-black/5 bg-white p-8 shadow-[0_20px_70px_rgba(16,24,40,0.08)] md:p-12">
          <span className="text-sm font-semibold text-[#ff6b00]">
            WORKSPACE SETUP
          </span>

          <h1 className="mt-4 text-4xl font-semibold tracking-tight">
            Welcome to SAMZY
          </h1>

          <p className="mt-3 max-w-xl leading-7 text-[#667085]">
            Create your business workspace. Products, inventory, suppliers,
            documents, reports and AI insights will all belong to this
            organization.
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
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
                className="h-12 w-full rounded-xl border border-[#d0d5dd] px-4 outline-none focus:border-[#101828]"
                placeholder="Example: RM TECH"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-medium">
                Workspace name
              </span>
              <input
                required
                value={workspaceName}
                onChange={(event) => setWorkspaceName(event.target.value)}
                className="h-12 w-full rounded-xl border border-[#d0d5dd] px-4 outline-none focus:border-[#101828]"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-medium">Currency</span>
              <input
                disabled
                value="EUR — Euro"
                className="h-12 w-full rounded-xl border border-[#eaecf0] bg-[#f9fafb] px-4 text-[#667085]"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-medium">Country</span>
              <input
                disabled
                value="Portugal"
                className="h-12 w-full rounded-xl border border-[#eaecf0] bg-[#f9fafb] px-4 text-[#667085]"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-medium">Timezone</span>
              <input
                disabled
                value="Europe/Lisbon"
                className="h-12 w-full rounded-xl border border-[#eaecf0] bg-[#f9fafb] px-4 text-[#667085]"
              />
            </label>

            {message ? (
              <p className="md:col-span-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {message}
              </p>
            ) : null}

            <button
              disabled={loading}
              className="md:col-span-2 h-12 rounded-xl bg-[#101828] font-semibold text-white hover:bg-black disabled:opacity-60"
            >
              {loading ? "Creating workspace..." : "Create workspace"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
