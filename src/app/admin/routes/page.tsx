import Link from "next/link";
import { deliveryRoutes, drivers, routeDriverId } from "@/lib/data";
import { TopBar, Empty } from "@/components/chrome";
import { requireAdmin } from "@/lib/auth";

export default async function RoutesPage() {
  await requireAdmin();
  const [routes, ds] = await Promise.all([deliveryRoutes(), drivers()]);
  const nameOf = (id: number | null) => ds.find((d) => d.id === id)?.name ?? null;
  const active = routes.filter((r) => r.active);
  const inactive = routes.filter((r) => !r.active);

  const row = (r: (typeof routes)[number]) => {
    const driver = nameOf(routeDriverId(r));
    return (
      <Link key={r.id} href={`/admin/routes/${r.id}`} className={`card p-4 flex items-center justify-between gap-3 ${r.active ? "" : "opacity-55"}`}>
        <p className="font-bold text-lg truncate">{r.name}</p>
        <p className="text-sm text-muted shrink-0">{driver ? driver.split(" ")[0] : <span className="text-danger font-medium">No driver</span>}</p>
      </Link>
    );
  };

  return (
    <>
      <TopBar title="Routes" sub={`${active.length} active`} right={<Link href="/admin/routes/new" className="btn-primary btn-sm">+ New route</Link>} />
      <main className="mx-auto max-w-xl px-4 space-y-3">
        {routes.length === 0 && (
          <Empty>
            <p>No routes yet. Pick the houses and the schedule fills itself in.</p>
            <Link href="/admin/routes/new" className="btn-primary mt-4">+ New route</Link>
          </Empty>
        )}
        {active.map(row)}
        {inactive.length > 0 && (
          <details className="card p-4">
            <summary className="font-semibold text-muted cursor-pointer">Inactive ({inactive.length})</summary>
            <div className="space-y-3 mt-3">{inactive.map(row)}</div>
          </details>
        )}
      </main>
    </>
  );
}
