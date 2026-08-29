import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const navigation = [
  ["Dashboard", "/app/dashboard", "⌂"],
  ["Sales", "/app/sales", "↗"],
  ["Purchases", "/app/purchases", "↙"],
  ["Inventory", "/app/inventory", "▦"],
  ["Products", "/app/products", "□"],
  ["Customers", "/app/customers", "○"],
  ["Suppliers", "/app/suppliers", "◇"],
  ["Reports", "/app/reports", "▤"],
  ["AI Assistant", "/app/ai-assistant", "✦"],
  ["Settings", "/app/settings", "⚙"],
];

export default async function ApplicationLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  /*
   * Step 1:
   * Resolve the user's organization membership by itself.
   *
   * Do not combine this with the organizations relationship.
   */
  const {
    data: membership,
    error: membershipError,
  } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    console.error(
      "SAMZY membership lookup failed:",
      membershipError,
    );
  }

  if (!membership) {
    redirect("/onboarding");
  }

  /*
   * Step 2:
   * Fetch the organization separately after membership
   * has already been confirmed.
   */
  const {
    data: organization,
    error: organizationError,
  } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("id", membership.organization_id)
    .maybeSingle();

  if (organizationError) {
    console.error(
      "SAMZY organization lookup failed:",
      organizationError,
    );
  }

  const organizationName =
    organization?.name || "My Business";

  return (
    <div className="min-h-screen bg-[#f8f9fb] text-[#101828]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-[#eaecf0] bg-white lg:flex lg:flex-col">
        <div className="flex h-20 items-center gap-3 px-6">
          <Image
            src="/samzy-logo.png"
            alt="SAMZY"
            width={38}
            height={38}
            className="rounded-xl"
            priority
          />

          <span className="text-xl font-semibold">
            SAMZY
          </span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map(([label, href, icon]) => (
            <Link
              key={href}
              href={href}
              className="flex h-11 items-center gap-3 rounded-xl px-4 text-sm font-medium text-[#475467] transition hover:bg-[#f2f4f7] hover:text-[#101828]"
            >
              <span className="w-5 text-center">
                {icon}
              </span>

              {label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-[#eaecf0] p-4">
          <p className="truncate text-sm font-semibold">
            {organizationName}
          </p>

          <p className="mt-1 truncate text-xs text-[#667085]">
            {user.email}
          </p>

          <p className="mt-1 text-[11px] capitalize text-[#98a2b3]">
            {membership.role}
          </p>
        </div>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-[#eaecf0] bg-white/90 px-6 backdrop-blur-xl lg:px-10">
          <div>
            <p className="text-sm text-[#667085]">
              Workspace
            </p>

            <p className="font-semibold">
              {organizationName}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              className="hidden h-10 min-w-64 rounded-xl border border-[#d0d5dd] bg-white px-4 text-left text-sm text-[#98a2b3] md:block"
            >
              Search anything...
            </button>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#101828] text-sm font-semibold text-white">
              {(user.email?.[0] || "S").toUpperCase()}
            </div>
          </div>
        </header>

        <main className="p-6 lg:p-10">
          {children}
        </main>
      </div>
    </div>
  );
}