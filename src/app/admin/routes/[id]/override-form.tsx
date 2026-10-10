"use client";

import { useActionState, useState } from "react";
import { MEALS, MEAL_LABEL, WEEKDAY_LONG, weekdayOf } from "@/lib/core";
import { FormMessage, Submit } from "@/components/ui";
import { overrideDriverAction } from "../../actions";
import type { Driver, RouteSlot } from "@/lib/data";

/** Swap the driver for one date only (someone is off that day). */
export function OverrideForm({ routeId, slots, drivers, today }: { routeId: number; slots: RouteSlot[]; drivers: Driver[]; today: string }) {
  const [state, action] = useActionState(overrideDriverAction, undefined);
  const [date, setDate] = useState(today);
  const wd = weekdayOf(date);
  const meals = MEALS.filter((m) => slots.some((s) => s.weekday === wd && s.meal === m));
  return (
    <form action={action} className="card p-5 space-y-3">
      <input type="hidden" name="route_id" value={routeId} />
      <div>
        <h2 className="font-bold text-lg">Change driver for one date</h2>
        <p className="text-sm text-muted">Only that date changes; the usual driver stays for other weeks.</p>
      </div>
      <input type="date" name="date" className="field" value={date} min={today} onChange={(e) => setDate(e.target.value)} />
      {meals.length === 0 ? (
        <p className="text-sm text-special font-medium">This route doesn&apos;t run on {WEEKDAY_LONG[wd]}s.</p>
      ) : (
        <>
          <select name="meal" className="field" defaultValue={meals[0]} key={date}>
            {meals.map((m) => <option key={m} value={m}>{MEAL_LABEL[m]}</option>)}
          </select>
          <select name="to_driver" className="field" defaultValue="" required>
            <option value="" disabled>Choose driver…</option>
            {drivers.filter((d) => d.active).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <FormMessage state={state} />
          <Submit className="btn-primary w-full">Change driver for this date</Submit>
        </>
      )}
    </form>
  );
}
