import { notFound } from "next/navigation";
import { deliveryRoutes, drivers, houses, takenSlots, today } from "@/lib/data";
import { weekdayOf } from "@/lib/core";
import { TopBar } from "@/components/chrome";
import { ActionButton } from "@/components/ui";
import { RouteEditor } from "../route-editor";
import { OverrideForm } from "./override-form";
import { deleteDeliveryRouteAction } from "../../actions";

export default async function EditRoute({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const [routes, hs, ds, now] = await Promise.all([deliveryRoutes(), houses(), drivers(), today()]);
  const route = routes.find((r) => r.id === id);
  if (!route) notFound();
  // Older routes kept B/L/D per house for every day; fold that into each day's skip list.
  const slots = route.slots.map((s) => ({
    ...s,
    skip: [...new Set([...s.skip, ...route.houses.filter((h) => !h.meals.includes(s.meal)).map((h) => h.id)])],
  }));
  return (
    <>
      <TopBar title={route.name} sub="Changes apply from today on. Past days stay as they were." back="/admin/routes" />
      <main className="mx-auto max-w-xl px-4 space-y-4">
        <RouteEditor
          allHouses={hs}
          drivers={ds}
          taken={takenSlots(routes, route.id)}
          todayWd={weekdayOf(now)}
          initial={{
            id: route.id, name: route.name, pay: route.pay_cents ? (route.pay_cents / 100).toFixed(2) : "", active: route.active,
            houses: route.houses.map((h) => h.id), slots,
          }}
        />
        {route.slots.length > 0 && <OverrideForm routeId={route.id} slots={route.slots} drivers={ds} today={now} />}
        <ActionButton
          action={deleteDeliveryRouteAction.bind(null, route.id)}
          confirm="Delete this route? Upcoming days are removed. Completed days and pay stay in the history."
          className="btn-ghost w-full text-danger"
        >
          Delete route
        </ActionButton>
      </main>
    </>
  );
}
