"use client";

import { useActionState } from "react";
import { MEALS, MEAL_LABEL } from "@/lib/core";
import { FormMessage, Submit } from "@/components/ui";
import { addHouseForDateAction, overrideDriverAction, removeHouseForDateAction } from "../../../actions";

type HouseOpt = { id: number; name: string; address: string };
type DriverOpt = { id: number; name: string; active: boolean };

/** Remove one house from a single date's delivery. */
export function RemoveHouseForm({ routeId, date, meal, address }: { routeId: number; date: string; meal: string; address: string }) {
  const [state, action] = useActionState(removeHouseForDateAction, undefined);
  return (
    <form action={action} className="shrink-0">
      <input type="hidden" name="route_id" value={routeId} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="meal" value={meal} />
      <input type="hidden" name="address" value={address} />
      <Submit className="btn-ghost btn-sm text-danger">Remove</Submit>
      <FormMessage state={state} />
    </form>
  );
}

/** Add one house to a single date's delivery. */
export function AddHouseForm({ routeId, date, meal, houses, chooseMeal }: {
  routeId: number; date: string; meal?: string; houses: HouseOpt[]; chooseMeal?: boolean;
}) {
  const [state, action] = useActionState(addHouseForDateAction, undefined);
  if (!houses.length) return <p className="text-sm text-muted">Every house is already on this delivery.</p>;
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="route_id" value={routeId} />
      <input type="hidden" name="date" value={date} />
      {!chooseMeal && meal && <input type="hidden" name="meal" value={meal} />}
      <div className="flex gap-2">
        {chooseMeal && (
          <select name="meal" className="field shrink-0" defaultValue="lunch" aria-label="Meal">
            {MEALS.map((m) => <option key={m} value={m}>{MEAL_LABEL[m]}</option>)}
          </select>
        )}
        <select name="house_id" className="field" defaultValue="" required>
          <option value="" disabled>Add a house…</option>
          {houses.map((h) => <option key={h.id} value={h.id}>{h.name || h.address}</option>)}
        </select>
        <Submit className="btn-primary shrink-0 px-5">Add</Submit>
      </div>
      <FormMessage state={state} />
    </form>
  );
}

/** Swap the driver for one date only. */
export function DriverOverrideForm({ routeId, date, meal, drivers, currentId }: {
  routeId: number; date: string; meal: string; drivers: DriverOpt[]; currentId: number | null;
}) {
  const [state, action] = useActionState(overrideDriverAction, undefined);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="route_id" value={routeId} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="meal" value={meal} />
      <div className="flex gap-2 items-center">
        <select name="to_driver" className="field" defaultValue={currentId ?? ""} required aria-label="Driver for this date">
          <option value="" disabled>Choose driver…</option>
          {drivers.filter((d) => d.active).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <Submit className="btn-ghost shrink-0">Set</Submit>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
