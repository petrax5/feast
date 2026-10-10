"use client";

import { useActionState } from "react";
import { FormMessage, Submit } from "@/components/ui";
import { addRouteHouseAction, updateRouteBasicsAction } from "../../actions";

type DriverOpt = { id: number; name: string; active: boolean };

export function BasicsForm({ route, drivers, driverId }: { route: { id: number; name: string; pay_cents: number; active: boolean }; drivers: DriverOpt[]; driverId: number | null }) {
  const [state, action] = useActionState(updateRouteBasicsAction, undefined);
  return (
    <form action={action} className="card p-5 space-y-4">
      <input type="hidden" name="id" value={route.id} />
      <div>
        <label className="label" htmlFor="name">Route name</label>
        <input id="name" name="name" className="field" defaultValue={route.name} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="driver_id">Driver</label>
          <select id="driver_id" name="driver_id" className="field" defaultValue={driverId ?? ""} required>
            <option value="" disabled>Choose driver…</option>
            {drivers.filter((d) => d.active).map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="pay">Pay per shift ($)</label>
          <input id="pay" name="pay" className="field" inputMode="decimal" defaultValue={(route.pay_cents / 100).toFixed(2)} required />
        </div>
      </div>
      <label className="flex items-center gap-3 text-[15px] font-medium">
        <input type="checkbox" name="active" defaultChecked={route.active} className="h-5 w-5 accent-ink" />
        Active
      </label>
      <FormMessage state={state} />
      <Submit>Save changes</Submit>
    </form>
  );
}

export function AddHouseForm({ routeId, houses }: { routeId: number; houses: { id: number; name: string; address: string }[] }) {
  const [state, action] = useActionState(addRouteHouseAction, undefined);
  if (!houses.length) return null;
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="route_id" value={routeId} />
      <div className="flex gap-2">
        <select name="house_id" className="field" defaultValue="" required>
          <option value="" disabled>Add a house…</option>
          {houses.map((h) => (
            <option key={h.id} value={h.id}>{h.name || h.address}</option>
          ))}
        </select>
        <Submit className="btn-primary shrink-0 px-5">Add</Submit>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
