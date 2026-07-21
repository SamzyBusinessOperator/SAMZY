"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const supabase = createClient();

      const callbackUrl = `${window.location.origin}/auth/callback?next=/onboarding`;

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: callbackUrl,
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      setSuccess(true);
    } catch {
      setMessage("Unable to create your account. Please try again.");
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

          {success ? (
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                Check your email
              </h1>

              <p className="mt-4 leading-7 text-[#667085]">
                We sent a confirmation link to{" "}
                <strong className="text-[#101828]">{email}</strong>. Open that
                link to verify your account and create your SAMZY workspace.
              </p>

              <Link
                href="/login"
                className="mt-8 flex h-12 items-center justify-center rounded-xl bg-[#101828] font-semibold text-white"
              >
                Return to sign in
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-semibold tracking-tight">
                Create your account
              </h1>

              <p className="mt-2 text-sm text-[#667085]">
                Start building your intelligent business workspace.
              </p>

              <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium">
                    Full name
                  </span>
                  <input
                    required
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="h-12 w-full rounded-xl border border-[#d0d5dd] px-4 outline-none focus:border-[#101828]"
                    placeholder="Your full name"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium">Email</span>
                  <input
                    required
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="h-12 w-full rounded-xl border border-[#d0d5dd] px-4 outline-none focus:border-[#101828]"
                    placeholder="you@company.com"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium">
                    Password
                  </span>
                  <input
                    required
                    minLength={8}
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-12 w-full rounded-xl border border-[#d0d5dd] px-4 outline-none focus:border-[#101828]"
                    placeholder="At least 8 characters"
                  />
                </label>

                {message ? (
                  <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                    {message}
                  </p>
                ) : null}

                <button
                  disabled={loading}
                  className="h-12 w-full rounded-xl bg-[#101828] font-semibold text-white hover:bg-black disabled:opacity-60"
                >
                  {loading ? "Creating account..." : "Create account"}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-[#667085]">
                Already registered?{" "}
                <Link href="/login" className="font-semibold text-[#101828]">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
