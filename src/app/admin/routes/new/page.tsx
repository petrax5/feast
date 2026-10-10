import { deliveryRoutes, drivers, houses, takenSlots, today } from "@/lib/data";
import { weekdayOf } from "@/lib/core";
import { TopBar } from "@/components/chrome";
import { RouteEditor } from "../route-editor";

export default async function NewRoute() {
  const [hs, ds, now, routes] = await Promise.all([houses(), drivers(), today(), deliveryRoutes()]);
  return (
    <>
      <TopBar title="New route" back="/admin/routes" />
      <main className="mx-auto max-w-xl px-4">
        <RouteEditor allHouses={hs} drivers={ds} taken={takenSlots(routes)} todayWd={weekdayOf(now)} initial={{ name: "", pay: "", active: true, houses: [], slots: [] }} />
      </main>
    </>
  );
}
