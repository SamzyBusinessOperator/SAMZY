"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      const destination = searchParams.get("next") || "/app/dashboard";
      router.push(destination);
      router.refresh();
    } catch {
      setMessage("Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f8fa] px-6 py-12 text-[#101828]">
      <div className="mx-auto flex min-h-[80vh] max-w-md items-center">
        <section className="w-full rounded-3xl border border-black/5 bg-white p-8 shadow-[0_20px_70px_rgba(16,24,40,0.08)]">
          <Link href="/" className="mb-10 flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="SAMZY"
              width={42}
              height={42}
              className="rounded-xl"
            />
            <span className="text-xl font-semibold">SAMZY</span>
          </Link>

          <h1 className="text-3xl font-semibold tracking-tight">
            Welcome back
          </h1>

          <p className="mt-2 text-sm text-[#667085]">
            Sign in to your intelligent business workspace.
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Email</span>
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-12 w-full rounded-xl border border-[#d0d5dd] px-4 outline-none transition focus:border-[#101828]"
                placeholder="you@company.com"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium">Password</span>
              <input
                required
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-12 w-full rounded-xl border border-[#d0d5dd] px-4 outline-none transition focus:border-[#101828]"
                placeholder="Enter your password"
              />
            </label>

            {message ? (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {message}
              </p>
            ) : null}

            <button
              disabled={loading}
              className="h-12 w-full rounded-xl bg-[#101828] font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[#667085]">
            New to SAMZY?{" "}
            <Link href="/signup" className="font-semibold text-[#101828]">
              Create an account
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
