import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  // Verify the session against the DB (not just the JWT): if the user no
  // longer exists (e.g. after a re-seed), simply show the login form — the
  // stale cookie is replaced on the next successful sign-in.
  const user = await getCurrentUser();
  if (user) {
    redirect(user.role === "ADMIN" ? "/admin" : user.role === "COURIER" ? "/courier" : "/app");
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-5 py-10">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
