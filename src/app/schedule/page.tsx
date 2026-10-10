import { requireDriver } from "@/lib/auth";
import { deliveryRoutes, slotHouses, today } from "@/lib/data";
import { MEALS, MEAL_LABEL, WEEKDAY_LONG, WEEK_ORDER, houseTotal, money, weekdayOf } from "@/lib/core";
import { TopBar, Empty } from "@/components/chrome";

export const dynamic = "force-dynamic";

/** The driver's weekly schedule: which route they drive each day and shift. */
export default async function SchedulePage() {
  const driver = await requireDriver();
  const [routes, now] = await Promise.all([deliveryRoutes(), today()]);
  const todayWd = weekdayOf(now);

  const days = WEEK_ORDER.map((wd) => ({
    wd,
    shifts: MEALS.flatMap((meal) =>
      routes
        .filter((r) => r.active)
        .flatMap((r) =>
          r.slots
            .filter((s) => s.weekday === wd && s.meal === meal && s.driver_id === driver.id)
            .map((s) => {
              const hs = slotHouses(r, s);
              return { meal, route: r.name, houses: hs.length, meals: hs.reduce((n, h) => n + houseTotal(h.items), 0), pay: r.pay_cents };
            }),
        ),
    ),
  }));
  const any = days.some((d) => d.shifts.length);

  return (
    <>
      <TopBar title="My schedule" sub="Your routes each week" back="/" />
      <main className="mx-auto max-w-xl px-4 pb-16 space-y-3">
        {!any && <Empty>You&apos;re not on any route yet.</Empty>}
        {any &&
          days.map((d) => (
            <div key={d.wd} className={`card overflow-hidden ${d.wd === todayWd ? "border-brand" : ""} ${d.shifts.length ? "" : "opacity-55"}`}>
              <div className="flex items-center justify-between px-5 py-3">
                <p className="font-bold">{WEEKDAY_LONG[d.wd]}</p>
                {d.wd === todayWd && <span className="chip-done">Today</span>}
                {!d.shifts.length && <span className="text-sm text-muted">Off</span>}
              </div>
              {d.shifts.length > 0 && (
                <ul className="border-t border-line divide-y divide-line">
                  {d.shifts.map((s, i) => (
                    <li key={i} className="flex items-center gap-3 px-5 py-3">
                      <span className="h-9 w-9 shrink-0 rounded-xl bg-brand grid place-items-center font-bold">{MEAL_LABEL[s.meal][0]}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate">{s.route}</p>
                        <p className="text-sm text-muted">{MEAL_LABEL[s.meal]} · {s.houses} {s.houses === 1 ? "house" : "houses"} · {s.meals} meals</p>
                      </div>
                      <p className="font-semibold tabular-nums">{money(s.pay)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
      </main>
    </>
  );
}
