import { redirect } from "next/navigation";
import { one } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { LoginForm } from "./form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await currentUser();
  if (user) redirect(user.is_admin ? "/admin" : "/");
  if (!(await one("SELECT 1 FROM users WHERE is_admin"))) redirect("/setup");
  return (
    <main className="min-h-dvh flex flex-col justify-center px-6 py-12 mx-auto max-w-sm">
      <img src="/logo.webp" alt="Feast Mode Catering" className="w-60 mb-10" />
      <h1 className="text-3xl font-bold tracking-tight">Sign in</h1>
      <p className="text-muted mt-1 mb-8">Use the username your kitchen gave you.</p>
      <LoginForm />
    </main>
  );
}
