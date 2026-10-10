"use client";

import { useActionState, useState } from "react";
import { MEALS, MEAL_LABEL } from "@/lib/core";
import { FormMessage, Submit } from "@/components/ui";
import { addHouseForDateAction, overrideDayDriverAction, overrideDriverAction, removeHouseForDateAction, updateStopForDateAction } from "../../../actions";

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
/** One house on one date's delivery: tap to expand and edit its meals (clients/specials) for that date only. */
export function StopEditor({ routeId, date, meal, stop, dishes }: {
  routeId: number;
  date: string;
  meal: string;
  stop: { name: string; address: string; items: { name: string; qty: number; special: boolean }[] };
  dishes: { id: number; name: string; is_default: boolean }[];
}) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(updateStopForDateAction, undefined);
  const qtyOf = (id: number) => stop.items.find((i) => i.name === dishes.find((d) => d.id === id)?.name)?.qty ?? 0;
  const [qtys, setQtys] = useState<Record<string, number>>(() =>
    Object.fromEntries(dishes.map((d) => [String(d.id), qtyOf(d.id)])));
  const setQty = (id: number, v: string) =>
    setQtys((q) => ({ ...q, [String(id)]: Math.max(0, Math.floor(Number(v) || 0)) }));
  const total = Object.values(qtys).reduce((a, n) => a + n, 0);
  const regular = dishes.find((d) => d.is_default);
  const specials = dishes.filter((d) => !d.is_default);

  const qtyRow = (d: { id: number; name: string }, label: string, special: boolean) => (
    <label key={d.id} className={`flex items-center justify-between gap-3 rounded-2xl border px-4 h-14 ${special ? "border-special-soft bg-special-soft/50" : "border-line"}`}>
      <span className={`font-semibold ${special ? "text-special" : ""}`}>{label}</span>
      <input
        type="number" inputMode="numeric" min={0} aria-label={label}
        className="w-20 h-10 text-right rounded-xl border border-line bg-white px-3 text-[17px] font-semibold outline-none focus:border-ink"
        value={qtys[String(d.id)] || ""}
        onChange={(e) => setQty(d.id, e.target.value)}
      />
    </label>
  );

  return (
    <div className="rounded-2xl border border-line">
      <div className="flex items-center gap-2 px-4 py-3">
        <button type="button" className="flex-1 min-w-0 text-left" onClick={() => setOpen(!open)} aria-expanded={open}>
          <p className="font-semibold truncate">{stop.name || stop.address}</p>
          <p className="text-[13px] text-muted">{total} meal{total === 1 ? "" : "s"} · tap to edit</p>
        </button>
        <span className="text-muted text-lg" aria-hidden>{open ? "▾" : "▸"}</span>
        <RemoveHouseForm routeId={routeId} date={date} meal={meal} address={stop.address} />
      </div>
      {open && (
        <form action={action} className="px-4 pb-4 space-y-2 border-t border-line pt-3">
          <input type="hidden" name="route_id" value={routeId} />
          <input type="hidden" name="date" value={date} />
          <input type="hidden" name="meal" value={meal} />
          <input type="hidden" name="address" value={stop.address} />
          <input type="hidden" name="items" value={JSON.stringify(qtys)} />
          {regular && qtyRow(regular, "Clients", false)}
          {specials.map((d) => qtyRow(d, d.name, true))}
          {specials.length === 0 && <p className="text-sm text-muted">Add special types (Vegan, Diabetic…) in Settings.</p>}
          <FormMessage state={state} />
          <Submit className="btn-primary w-full">Save for this date</Submit>
        </form>
      )}
    </div>
  );
}
/** Collapsible meal section: header shows the summary, tap to reveal houses and editing. */
export function MealCard({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="card p-5">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="w-full flex items-center justify-between gap-3 text-left">
        <div className="min-w-0">
          <h2 className="font-bold text-lg">{title}</h2>
          <p className="text-sm text-muted truncate">{sub}</p>
        </div>
        <span className="text-muted text-xl shrink-0" aria-hidden>{open ? "\u25BE" : "\u25B8"}</span>
      </button>
      {open && <div className="mt-4 space-y-4">{children}</div>}
    </section>
  );
}

/** Swap the driver for the whole day (every meal). */
export function DayDriverForm({ routeId, date, drivers, currentId }: {
  routeId: number; date: string; drivers: DriverOpt[]; currentId: number | null;
}) {
  const [state, action] = useActionState(overrideDayDriverAction, undefined);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="route_id" value={routeId} />
      <input type="hidden" name="date" value={date} />
      <div className="flex gap-2 items-center">
        <select name="to_driver" className="field" defaultValue={currentId ?? ""} required aria-label="Driver for the whole day">
          <option value="" disabled>Choose driver…</option>
          {drivers.filter((d) => d.active).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <Submit className="btn-primary shrink-0 px-5">Set</Submit>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
