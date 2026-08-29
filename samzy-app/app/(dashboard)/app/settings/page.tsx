import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default function SettingsPage() {
  async function signOut() {
    "use server";

    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-2 text-[#667085]">
        Manage your account and SAMZY workspace.
      </p>

      <section className="mt-8 rounded-2xl border border-[#eaecf0] bg-white p-6">
        <h2 className="font-semibold">Account session</h2>
        <p className="mt-2 text-sm text-[#667085]">
          Sign out securely from this device.
        </p>

        <form action={signOut}>
          <button className="mt-6 h-11 rounded-xl border border-red-200 px-5 text-sm font-semibold text-red-700">
            Sign out
          </button>
        </form>
      </section>
    </div>
  );
}
