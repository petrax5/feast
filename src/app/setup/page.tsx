import { redirect } from "next/navigation";
import { one } from "@/lib/db";
import { SetupForm } from "./form";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if (await one("SELECT 1 FROM users WHERE is_admin")) redirect("/login");
  return (
    <main className="min-h-dvh flex flex-col justify-center px-6 py-12 mx-auto max-w-sm">
      <img src="/logo.webp" alt="Feast Mode Catering" className="w-60 mb-10" />
      <h1 className="text-3xl font-bold tracking-tight">Create admin account</h1>
      <p className="text-muted mt-1 mb-8">This only shows once. You&apos;ll manage drivers and routes with it.</p>
      <SetupForm />
    </main>
  );
}
