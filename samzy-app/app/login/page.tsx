import { Suspense } from "react";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#f7f8fa] text-[#667085]">
          Loading...
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
