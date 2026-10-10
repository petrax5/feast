import { notFound } from "next/navigation";
import { deliveryRoutes, dishTypes, drivers, houses, runsForDate, slotHouses, today } from "@/lib/data";
import { MEALS, MEAL_LABEL, WEEKDAY_LONG, formatDate, isDate, routeKey, stopTotal, weekdayOf } from "@/lib/core";
import { sql } from "@/lib/db";
import { TopBar, Empty } from "@/components/chrome";
import { requireAdmin } from "@/lib/auth";
import { AddHouseForm, DayDriverForm, DriverOverrideForm, MealCard, StopEditor } from "./day-forms";

/** One date of a route: change houses or the driver for that date only. */
export default async function RouteDay({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ date?: string }> }) {
  await requireAdmin();
  const id = Number((await params).id);
  const { date } = await searchParams;
  if (!date || !isDate(date)) notFound();
  const [routes, ds, hs, now, allDishes] = await Promise.all([deliveryRoutes(), drivers(), houses(), today(), dishTypes(true)]);
  const dishList = [...allDishes].sort((a, b) => a.sort - b.sort || a.id - b.id);
  const dishOpts = dishList.map((d) => ({ id: d.id, name: d.name, is_default: d.is_default }));
  const route = routes.find((r) => r.id === id);
  if (!route) notFound();

  const wd = weekdayOf(date);
  const editable = date >= now;
  const shifts = route.slots
    .filter((s) => s.weekday === wd)
    .sort((a, b) => MEALS.indexOf(a.meal as (typeof MEALS)[number]) - MEALS.indexOf(b.meal as (typeof MEALS)[number]));
  const runs = (await runsForDate(date)).filter((r) => r.route_key?.startsWith(`r${route.id}-`));
  const overrides = await sql<{ route_key: string; driver_id: number }>(
    "SELECT route_key, driver_id FROM run_overrides WHERE run_date=$1 AND route_key LIKE $2", [date, `r${route.id}-%`],
  );
  const driverOpts = ds.map((d) => ({ id: d.id, name: d.name, active: d.active }));
  const driverName = (did: number | null) => ds.find((d) => d.id === did)?.name ?? "No driver";

  return (
    <>
      <TopBar
        title={formatDate(date, { weekday: "long", month: "long", day: "numeric" })}
        sub={`${route.name} — changes apply to this date only`}
        back={`/admin/routes/${route.id}`}
      />
      <main className="mx-auto max-w-xl px-4 space-y-5 pb-8">
        {!editable && (
          <p className="card p-4 text-sm text-muted">This date has passed — shown for reference.</p>
        )}

        {shifts.length === 0 && (
          <div className="card p-5 space-y-4">
            <p className="font-semibold">No delivery this {WEEKDAY_LONG[wd]}.</p>
            {editable ? (
              <AddHouseForm
                routeId={route.id} date={date} chooseMeal
                houses={hs.filter((h) => h.active).map((h) => ({ id: h.id, name: h.name, address: h.address }))}
              />
            ) : (
              <Empty>Nothing was scheduled.</Empty>
            )}
          </div>
        )}

        {editable && shifts.length > 0 && (() => {
          const ids = [...new Set(shifts.map((s) => {
            const key = routeKey(route.id, wd, s.meal);
            const run = runs.find((r) => r.route_key === key);
            return run?.driver_id ?? overrides.find((o) => o.route_key === key)?.driver_id ?? s.driver_id;
          }))].filter((x) => x !== null);
          const dayDriverId = ids.length === 1 ? ids[0] : null;
          return (
            <section className="card p-5 space-y-3">
              <div>
                <h2 className="font-bold text-lg">Day driver</h2>
                <p className="text-sm text-muted">
                  {dayDriverId
                    ? <>Currently <span className="font-semibold text-ink">{driverName(dayDriverId)}</span> for the whole day.</>
                    : "Different drivers per meal — set one driver for the whole day:"}
                </p>
              </div>
              <DayDriverForm routeId={route.id} date={date} drivers={driverOpts} currentId={dayDriverId} />
            </section>
          );
        })()}

        {shifts.map((s) => {
          const key = routeKey(route.id, wd, s.meal);
          const run = runs.find((r) => r.route_key === key);
          const driverId = run?.driver_id ?? overrides.find((o) => o.route_key === key)?.driver_id ?? s.driver_id;
          const stops = run
            ? run.stops.map((st) => ({ name: st.name, address: st.address, items: st.items }))
            : slotHouses(route, s).map((h) => ({
                name: h.name,
                address: h.address,
                items: dishList
                  .filter((d) => (h.items[String(d.id)] ?? 0) > 0)
                  .map((d) => ({ name: d.name, qty: h.items[String(d.id)], special: !d.is_default })),
              }));
          const onAddrs = new Set(stops.map((st) => st.address));
          const addable = hs.filter((h) => h.active && !onAddrs.has(h.address))
            .map((h) => ({ id: h.id, name: h.name, address: h.address }));
          const sub = `${driverName(driverId)} · ${stops.length} ${stops.length === 1 ? "house" : "houses"}${run?.customized ? " · edited" : ""}`;
          return (
            <MealCard key={s.meal} title={MEAL_LABEL[s.meal]} sub={sub}>

              {editable && (
                <DriverOverrideForm routeId={route.id} date={date} meal={s.meal} drivers={driverOpts} currentId={driverId} />
              )}

              <div className="space-y-2">
                <h3 className="font-semibold text-[15px]">Houses <span className="text-muted font-medium">({stops.length})</span></h3>
                {stops.map((st) =>
                  editable ? (
                    <StopEditor key={st.address + JSON.stringify(st.items)} routeId={route.id} date={date} meal={s.meal} stop={st} dishes={dishOpts} />
                  ) : (
                    <div key={st.address} className="flex items-center gap-3 rounded-2xl border border-line px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{st.name || st.address}</p>
                        {st.name && <p className="text-[13px] text-muted truncate">{st.address}</p>}
                      </div>
                      <span className="text-sm font-bold tabular-nums shrink-0">{stopTotal(st)} meals</span>
                    </div>
                  )
                )}
                {stops.length === 0 && <p className="text-sm text-muted">No houses on this delivery.</p>}
              </div>

              {editable && (
                <AddHouseForm routeId={route.id} date={date} meal={s.meal} houses={addable} />
              )}
            </MealCard>
          );
        })}
      </main>
    </>
  );
}
