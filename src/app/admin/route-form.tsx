"use client";

import { useActionState, useState } from "react";
import { MEALS, MEAL_LABEL, WEEKDAYS, WEEK_ORDER, weekdayOf, type DishType, type TemplateStop } from "@/lib/core";
import { FormMessage, Submit } from "@/components/ui";
import type { FormState } from "../actions";

type Driver = { id: number; name: string; active: boolean; work_days: number[]; meals: string[] };

export type RouteFormValues = {
  id?: number;
  name: string;
  meal: string;
  driver_id: number | null;
  pay: string;
  weekdays?: number[];
  active?: boolean;
  stops: TemplateStop[];
};

const blankStop = (): TemplateStop => ({ name: "", address: "", items: {} });

/** Form for a recurring route (weekdays) or for one specific day (date). */
export function RouteForm({
  action, initial, drivers, dishes, date,
}: {
  action: (s: FormState, f: FormData) => Promise<FormState>;
  initial: RouteFormValues;
  drivers: Driver[];
  dishes: DishType[];
  date?: string;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const [stops, setStops] = useState<TemplateStop[]>(initial.stops.length ? initial.stops : [blankStop()]);
  const [meal, setMeal] = useState(initial.meal);
  const [driverId, setDriverId] = useState(initial.driver_id ? String(initial.driver_id) : "");
  const [days, setDays] = useState<number[]>(initial.weekdays ?? []);

  // Adds a house at the end and jumps to its address field.
  const addStop = () => {
    setStops([...stops, blankStop()]);
    requestAnimationFrame(() => {
      const inputs = document.querySelectorAll<HTMLInputElement>("input[data-address]");
      const last = inputs[inputs.length - 1];
      last?.scrollIntoView({ behavior: "smooth", block: "center" });
      last?.focus();
    });
  };
  const update = (i: number, patch: Partial<TemplateStop>) => setStops(stops.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const move = (i: number, d: number) => {
    const next = [...stops];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    setStops(next);
  };

  // Warn when the chosen driver doesn't normally work this day or meal.
  const driver = drivers.find((d) => String(d.id) === driverId);
  const routeDays = date ? [weekdayOf(date)] : days;
  const warnings: string[] = [];
  if (driver) {
    if (!driver.active) warnings.push(`${driver.name} is inactive and can't sign in.`);
    const off = routeDays.filter((d) => !driver.work_days.includes(d));
    if (off.length) warnings.push(`${driver.name} doesn't work ${off.map((d) => WEEKDAYS[d]).join(", ")}.`);
    if (!driver.meals.includes(meal)) warnings.push(`${driver.name} isn't set up for ${MEAL_LABEL[meal]?.toLowerCase()}.`);
  }

  return (
    <form action={formAction} className="space-y-5">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      {date && <input type="hidden" name="date" value={date} />}
      <input type="hidden" name="stops" value={JSON.stringify(stops)} />

      <div className="card p-5 space-y-4">
        <div>
          <label className="label" htmlFor="name">Route name</label>
          <input id="name" name="name" className="field" defaultValue={initial.name} placeholder="e.g. North side" required />
        </div>

        <div>
          <span className="label">Meal</span>
          <div className="grid grid-cols-3 gap-2">
            {MEALS.map((m) => (
              <label key={m} className="toggle">
                <input type="radio" name="meal" value={m} checked={meal === m} onChange={() => setMeal(m)} className="sr-only" />
                {MEAL_LABEL[m]}
              </label>
            ))}
          </div>
        </div>

        {!date && (
          <div>
            <span className="label">Repeats on</span>
            <div className="grid grid-cols-7 gap-1.5">
              {WEEK_ORDER.map((d) => (
                <label key={d} className="toggle min-w-0 px-0">
                  <input
                    type="checkbox" name="weekdays" value={d} className="sr-only"
                    checked={days.includes(d)}
                    onChange={(e) => setDays(e.target.checked ? [...days, d] : days.filter((x) => x !== d))}
                  />
                  {WEEKDAYS[d].slice(0, 2)}
                </label>
              ))}
            </div>
            <p className="text-xs text-muted mt-1.5">Leave all off to keep it as a saved route that doesn&apos;t repeat.</p>
          </div>
        )}

        <div className="grid grid-cols-[1fr_8rem] gap-3">
          <div>
            <label className="label" htmlFor="driver_id">Driver</label>
            <select id="driver_id" name="driver_id" className="field" value={driverId} onChange={(e) => setDriverId(e.target.value)}>
              <option value="">No driver yet</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>{d.name}{d.active ? "" : " (inactive)"}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="pay">Pay ($)</label>
            <input id="pay" name="pay" className="field" inputMode="decimal" defaultValue={initial.pay} placeholder="0.00" required />
          </div>
        </div>
        {warnings.map((w) => (
          <p key={w} className="text-sm text-special font-medium -mt-1">⚠ {w}</p>
        ))}

        {!date && (
          <label className="flex items-center gap-3 text-[15px] font-medium">
            <input type="checkbox" name="active" defaultChecked={initial.active ?? true} className="h-5 w-5 accent-ink" />
            Active
          </label>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-bold text-lg">Houses in order <span className="text-muted font-medium">({stops.length})</span></h2>
          <button type="button" className="btn-primary btn-sm" onClick={addStop}>+ Add house</button>
        </div>
        {stops.map((s, i) => (
          <div key={i} className="card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="h-7 w-7 rounded-full bg-ink text-white grid place-items-center text-[13px] font-bold">{i + 1}</span>
              <div className="flex-1" />
              <button type="button" className="btn-ghost btn-sm w-9 px-0" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">↑</button>
              <button type="button" className="btn-ghost btn-sm w-9 px-0" disabled={i === stops.length - 1} onClick={() => move(i, 1)} aria-label="Move down">↓</button>
              <button
                type="button" className="btn-ghost btn-sm text-danger"
                onClick={() => (s.address || s.name ? confirm("Remove this house?") : true) && setStops(stops.filter((_, j) => j !== i))}
              >
                Remove
              </button>
            </div>
            <input className="field" placeholder="Customer / house name (optional)" value={s.name} onChange={(e) => update(i, { name: e.target.value })} />
            <input data-address className="field" placeholder="Full address" value={s.address} onChange={(e) => update(i, { address: e.target.value })} />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {dishes.map((d) => (
                <label key={d.id} className={`flex items-center justify-between gap-2 rounded-2xl border px-3 h-12 ${d.is_default ? "border-line" : "border-special-soft bg-special-soft/50"}`}>
                  <span className={`text-sm font-semibold truncate ${d.is_default ? "" : "text-special"}`}>{d.name}</span>
                  <input
                    type="number" inputMode="numeric" min={0} placeholder="0"
                    className="w-14 h-9 text-right rounded-lg border border-line bg-white px-2 text-[16px] font-semibold outline-none focus:border-ink"
                    value={s.items[d.id] ?? ""}
                    onChange={(e) => {
                      const items = { ...s.items };
                      const n = Math.max(0, Math.floor(Number(e.target.value) || 0));
                      if (n) items[d.id] = n; else delete items[d.id];
                      update(i, { items });
                    }}
                  />
                </label>
              ))}
            </div>
          </div>
        ))}
        <button type="button" className="btn w-full h-14 border-2 border-dashed border-brand text-brand-ink bg-white" onClick={addStop}>
          + Add another house
        </button>
      </div>

      <FormMessage state={state} />
      <Submit className="btn-dark w-full h-14">{date ? "Save for this day" : "Save route"}</Submit>
    </form>
  );
}
