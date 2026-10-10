import { notFound } from "next/navigation";
import { deliveryRoutes, drivers, houses, routeDeliveryWeekdays, routeDriverId, today } from "@/lib/data";
import { TopBar } from "@/components/chrome";
import { ActionButton } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { BasicsForm, AddHouseForm } from "./route-detail-forms";
import { MonthCalendar } from "./month-calendar";
import { deleteDeliveryRouteAction, moveRouteHouseAction, removeRouteHouseAction } from "../../actions";

export default async function RouteDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const id = Number((await params).id);
  const [routes, ds, hs, now] = await Promise.all([deliveryRoutes(), drivers(), houses(), today()]);
  const route = routes.find((r) => r.id === id);
  if (!route) notFound();

  const driverId = routeDriverId(route);
  const driverName = ds.find((x) => x.id === driverId)?.name.split(" ")[0];
  const addable = hs.filter((h) => h.active && !route.houses.some((m) => m.id === h.id));
  const deliveryWeekdays = routeDeliveryWeekdays(route);
  const d = new Date(now + "T12:00:00");

  const moveBtn = (h: { id: number }, i: number, dir: -1 | 1, label: string) => {
    const disabled = dir === -1 ? i === 0 : i === route.houses.length - 1;
    return disabled ? (
      <span key={label} className="btn-ghost btn-sm w-9 px-0 opacity-30 pointer-events-none" aria-hidden>{dir === -1 ? "↑" : "↓"}</span>
    ) : (
      <ActionButton key={label} action={moveRouteHouseAction.bind(null, route.id, h.id, dir)} className="btn-ghost btn-sm w-9 px-0">
        <span aria-label={label}>{dir === -1 ? "↑" : "↓"}</span>
      </ActionButton>
    );
  };

  return (
    <>
      <TopBar title={route.name} sub={`${route.houses.length} ${route.houses.length === 1 ? "house" : "houses"}${driverName ? ` · ${driverName}` : ""}`} back="/admin/routes" />
      <main className="mx-auto max-w-xl px-4 space-y-5 pb-8">
        <section className="space-y-3">
          <h2 className="font-bold text-lg px-1">Route settings</h2>
          <BasicsForm
            route={{ id: route.id, name: route.name, pay_cents: route.pay_cents, active: route.active }}
            drivers={ds.map((x) => ({ id: x.id, name: x.name, active: x.active }))}
            driverId={driverId}
          />
        </section>

        <section className="space-y-3">
          <h2 className="font-bold text-lg px-1">Houses in delivery order <span className="text-muted font-medium">({route.houses.length})</span></h2>
          {route.houses.map((h, i) => (
            <div key={h.id} className="card p-4 flex items-center gap-2">
              <span className="h-7 w-7 rounded-full bg-ink text-white grid place-items-center text-[13px] font-bold shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{h.name || h.address}</p>
                <p className="text-[13px] text-muted truncate">{h.address}</p>
              </div>
              {moveBtn(h, i, -1, "Move up")}
              {moveBtn(h, i, 1, "Move down")}
              <ActionButton action={removeRouteHouseAction.bind(null, route.id, h.id)} confirm="Remove this house from the route? Past deliveries stay in the history." className="btn-ghost btn-sm text-danger">
                Remove
              </ActionButton>
            </div>
          ))}
          <AddHouseForm routeId={route.id} houses={addable.map((h) => ({ id: h.id, name: h.name, address: h.address }))} />
        </section>

        <section className="space-y-3">
          <h2 className="font-bold text-lg px-1">Delivery calendar</h2>
          <div className="card p-5">
            {deliveryWeekdays.length === 0 ? (
              <p className="text-sm text-muted">No delivery days — add houses with a schedule, or set one in Houses.</p>
            ) : (
              <MonthCalendar
                deliveryWeekdays={deliveryWeekdays}
                dayBase={`/admin/routes/${route.id}/day`}
                year={d.getFullYear()}
                month={d.getMonth()}
                today={now}
              />
            )}
            <p className="text-[13px] text-muted mt-3">Tap a green day to change that date only — remove a house or add one to an empty day.</p>
          </div>
        </section>

        <section>
          <ActionButton
            action={deleteDeliveryRouteAction.bind(null, route.id)}
            confirm="Delete this route? Past deliveries and pay stay in the history."
            className="btn-ghost w-full text-danger"
          >
            Delete route
          </ActionButton>
        </section>
      </main>
    </>
  );
}
