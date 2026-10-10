import Link from "next/link";
import { deliveryRoutes, dishTypes, houses } from "@/lib/data";
import { houseTotal, scheduleSummary } from "@/lib/core";
import { TopBar, Empty } from "@/components/chrome";

export default async function HousesPage() {
  const [list, dishes, routes] = await Promise.all([houses(), dishTypes(true), deliveryRoutes()]);
  const routesOf = (id: number) => routes.filter((r) => r.houses.some((h) => h.id === id)).map((r) => r.name);

  return (
    <>
      <TopBar title="Houses" sub={`${list.filter((h) => h.active).length} active`} right={<Link href="/admin/houses/new" className="btn-primary btn-sm">+ Add house</Link>} />
      <main className="mx-auto max-w-xl px-4 space-y-3">
        {list.length === 0 && (
          <Empty>
            <p>No houses yet.</p>
            <Link href="/admin/houses/new" className="btn-primary mt-4">+ Add your first house</Link>
          </Empty>
        )}
        {list.map((h) => {
          const specials = dishes.filter((d) => !d.is_default && h.items[d.id]);
          const inRoutes = routesOf(h.id);
          const total = houseTotal(h.items);
          return (
            <Link key={h.id} href={`/admin/houses/${h.id}`} className={`card p-4 block ${h.active ? "" : "opacity-55"}`}>
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-bold truncate">{h.name || h.address}{!h.active && <span className="chip-muted ml-2">Paused</span>}</p>
                  {h.name && <p className="text-sm text-muted truncate">{h.address}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-2xl font-bold leading-none tabular-nums ${total ? "" : "text-special"}`}>{total}</p>
                  <p className="text-[11px] text-muted font-medium mt-1">meals</p>
                </div>
              </div>
              {specials.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {specials.map((d) => <span key={d.id} className="chip-special">{h.items[d.id]} {d.name}</span>)}
                </div>
              )}
              {h.notes && <p className="text-sm text-muted mt-2 line-clamp-2">📝 {h.notes}</p>}
              {scheduleSummary(h.schedule) && (
                <p className="text-sm text-muted mt-2">📅 <span className="font-semibold text-ink">{scheduleSummary(h.schedule)}</span></p>
              )}
              <p className="text-sm mt-2">
                {inRoutes.length ? (
                  <span className="text-muted">Route: <span className="font-semibold text-ink">{inRoutes.join(", ")}</span></span>
                ) : (
                  <span className="text-special font-medium">Not in a route yet</span>
                )}
              </p>
            </Link>
          );
        })}
      </main>
    </>
  );
}
