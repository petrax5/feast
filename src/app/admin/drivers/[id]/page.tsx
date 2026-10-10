import { notFound } from "next/navigation";
import { one } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { TopBar } from "@/components/chrome";
import { DriverForm } from "../driver-form";

export default async function EditDriver({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireAdmin();
  const d = await one<{ id: number; name: string; username: string; phone: string; active: boolean; has_password: boolean; is_admin: boolean }>(
    "SELECT id, name, username, phone, active, is_admin, password_hash <> '' AS has_password FROM users WHERE id = $1 AND is_driver",
    [Number((await params).id)],
  );
  if (!d) notFound();
  return (
    <>
      <TopBar title={d.name} back="/admin/drivers" />
      <main className="mx-auto max-w-xl px-4">
        <DriverForm initial={d} isSelf={d.id === me.id} />
      </main>
    </>
  );
}
