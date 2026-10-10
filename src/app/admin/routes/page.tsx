import Link from "next/link";
import { deliveryRoutes, drivers } from "@/lib/data";
import { MEALS, MEAL_LABEL, WEEKDAYS, WEEK_ORDER, money } from "@/lib/core";
import { TopBar, Empty } from "@/components/chrome";

export default async function RoutesPage() {
  const [routes, ds] = await Promise.all([deliveryRoutes(), drivers()]);
  const first = (id: number | null) => ds.find((d) => d.id === id)?.name.split(" ")[0];

  return (
    <>
      <TopBar title="Routes" sub={`${routes.filter((r) => r.active).length} active`} right={<Link href="/admin/routes/new" className="btn-primary btn-sm">+ New route</Link>} />
      <main className="mx-auto max-w-xl px-4 space-y-3">
        {routes.length === 0 && (
          <Empty>
            <p>No routes yet. A route has a name, its houses in order, and the days, shifts and drivers it runs with.</p>
            <Link href="/admin/routes/new" className="btn-primary mt-4">+ New route</Link>
          </Empty>
        )}
        {routes.map((r) => {
          return (
            <Link key={r.id} href={`/admin/routes/${r.id}`} className={`card p-4 block space-y-2 ${r.active ? "" : "opacity-55"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-lg truncate">{r.name}{!r.active && <span className="chip-muted ml-2">Inactive</span>}</p>
                  <p className="text-sm text-muted">{r.houses.length} {r.houses.length === 1 ? "house" : "houses"}</p>
                </div>
                <p className={`font-bold tabular-nums ${r.pay_cents ? "" : "text-special"}`}>{r.pay_cents ? `${money(r.pay_cents)}/shift` : "Set pay"}</p>
              </div>
              <div className="text-sm space-y-0.5">
                {MEALS.map((m) => {
                  const ss = WEEK_ORDER.map((wd) => r.slots.find((s) => s.weekday === wd && s.meal === m)).filter(Boolean);
                  if (!ss.length) return null;
                  const names = [...new Set(ss.map((s) => first(s!.driver_id) ?? "No driver"))];
                  return (
                    <p key={m} className="text-muted">
                      <span className="font-semibold text-ink">{MEAL_LABEL[m]}</span> · {ss.map((s) => WEEKDAYS[s!.weekday]).join(" ")} · {names.join(", ")}
                    </p>
                  );
                })}
                {r.slots.length === 0 && <p className="text-special font-medium">No days or shifts yet</p>}
              </div>
            </Link>
          );
        })}
      </main>
    </>
  );
}
