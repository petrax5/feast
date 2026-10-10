import { requireAdmin } from "@/lib/auth";
import { AdminTabs } from "./tabs";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <>
      <div className="pb-28">{children}</div>
      <AdminTabs />
    </>
  );
}
