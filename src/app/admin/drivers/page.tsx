import Link from "next/link";
import { deliveryRoutes, drivers } from "@/lib/data";
import { requireAdmin } from "@/lib/auth";
import { MEALS, MEAL_LABEL, WEEKDAYS, WEEK_ORDER } from "@/lib/core";
import { TopBar, Empty } from "@/components/chrome";
import { ActionButton } from "@/components/ui";
import { toggleDriverAction } from "../actions";

export default async function DriversPage() {
  const [me, list, routes] = await Promise.all([requireAdmin(), drivers(), deliveryRoutes()]);

  // A driver's schedule = the route shifts they're assigned to.
  const scheduleOf = (id: number) =>
    routes
      .filter((r) => r.active)
      .flatMap((r) =>
        MEALS.map((m) => {
          const days = WEEK_ORDER.filter((wd) => r.slots.some((s) => s.weekday === wd && s.meal === m && s.driver_id === id));
          return days.length ? { route: r.name, meal: m, days } : null;
        }).filter(Boolean),
      ) as { route: string; meal: string; days: number[] }[];

  return (
    <>
      <TopBar title="Drivers" right={<Link href="/admin/drivers/new" className="btn-primary btn-sm">+ New</Link>} />
      <main className="mx-auto max-w-xl px-4 space-y-3">
        {list.length === 0 && <Empty>No drivers yet.</Empty>}
        {list.map((d) => {
          const schedule = scheduleOf(d.id);
          return (
            <div key={d.id} className={`card p-4 ${d.active ? "" : "opacity-60"}`}>
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 shrink-0 rounded-full bg-bg grid place-items-center font-bold">{d.name.slice(0, 1).toUpperCase()}</div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{d.name} {d.is_admin && <span className="chip-done ml-1">Admin</span>}{!d.active && <span className="chip-muted ml-1">Inactive</span>}</p>
                  <p className="text-sm text-muted">
                    @{d.username} · {d.maps_app === "apple" ? "Apple Maps" : d.maps_app === "google" ? "Google Maps" : "Maps not chosen yet"}
                  </p>
                  {d.phone && <a href={`tel:${d.phone.replace(/[^\d+]/g, "")}`} className="text-sm font-medium text-brand-ink">{d.phone}</a>}
                  {!d.has_password && <p className="text-sm font-medium text-special">⚠ No password yet</p>}
                  <div className="mt-1.5 text-sm space-y-0.5">
                    {schedule.length === 0 ? (
                      <p className="text-muted">Not on any route yet</p>
                    ) : (
                      schedule.map((s) => (
                        <p key={`${s.route}-${s.meal}`} className="text-muted">
                          <span className="font-semibold text-ink">{MEAL_LABEL[s.meal]}</span> · {s.days.map((wd) => WEEKDAYS[wd]).join(" ")} · {s.route}
                        </p>
                      ))
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <Link href={`/admin/drivers/${d.id}`} className="btn-ghost btn-sm">Edit</Link>
                <Link href={`/admin/pay/${d.id}`} className="btn-ghost btn-sm">Earnings</Link>
                {d.id !== me.id && <ActionButton
                  action={toggleDriverAction.bind(null, d.id)}
                  confirm={d.active ? `Deactivate ${d.name}? They won't be able to sign in.` : undefined}
                >
                  {d.active ? "Deactivate" : "Activate"}
                </ActionButton>}
              </div>
            </div>
          );
        })}
      </main>
    </>
  );
}
