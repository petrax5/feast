"use client";

import { useActionState, useState } from "react";
import { MEALS, MEAL_LABEL, WEEKDAYS, WEEK_ORDER, houseTotal, type DishType } from "@/lib/core";
import { FormMessage, Submit } from "@/components/ui";
import { saveHouseAction } from "../actions";

type Values = { id?: number; name: string; address: string; items: Record<string, number>; notes: string; schedule: Record<string, string[]> };

export function HouseForm({ initial, dishes }: { initial: Values; dishes: DishType[] }) {
  const [state, action] = useActionState(saveHouseAction, undefined);
  const regular = dishes.find((d) => d.is_default);
  const specialTypes = dishes.filter((d) => !d.is_default);
  const [clients, setClients] = useState(regular ? initial.items[regular.id] ?? 0 : 0);
  // Specials are a short list of rows: pick a type, type a quantity.
  const [rows, setRows] = useState<{ dish: string; qty: number }[]>(
    specialTypes.filter((d) => initial.items[d.id]).map((d) => ({ dish: String(d.id), qty: initial.items[d.id] })),
  );

  const items: Record<string, number> = {};
  if (regular && clients > 0) items[regular.id] = clients;
  for (const r of rows) if (r.dish && r.qty > 0) items[r.dish] = (items[r.dish] ?? 0) + r.qty;

  const used = new Set(rows.map((r) => r.dish));
  // Default weekly schedule: weekday ("0"-"6") -> meals this house wants. Used when adding the house to a route.
  const [sched, setSched] = useState<Record<string, string[]>>(initial.schedule ?? {});
  const toggleMeal = (wd: number, meal: string) => {
    const k = String(wd);
    const cur = sched[k] ?? [];
    const next = cur.includes(meal) ? cur.filter((m) => m !== meal) : [...MEALS.filter((m) => cur.includes(m) || m === meal)];
    const copy = { ...sched };
    if (next.length) copy[k] = next; else delete copy[k];
    setSched(copy);
  };
  const shiftsPerWeek = Object.values(sched).reduce((n, ms) => n + ms.length, 0);
  const setAll = (on: boolean) => setSched(on ? Object.fromEntries(WEEK_ORDER.map((wd) => [String(wd), [...MEALS]])) : {});
  const updateRow = (i: number, patch: Partial<{ dish: string; qty: number }>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const toInt = (v: string) => Math.max(0, Math.floor(Number(v) || 0));

  return (
    <form action={action} className="space-y-5">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="items" value={JSON.stringify(items)} />
      <input type="hidden" name="schedule" value={JSON.stringify(sched)} />

      <div className="card p-5 space-y-4">
        <div>
          <label className="label" htmlFor="name">House name</label>
          <input id="name" name="name" className="field" defaultValue={initial.name} placeholder="e.g. Amber" />
        </div>
        <div>
          <label className="label" htmlFor="address">Address</label>
          <input id="address" name="address" className="field" defaultValue={initial.address} placeholder="Street, city" required />
        </div>
      </div>

      <div className="card p-5 space-y-3">
        <h2 className="font-bold text-lg">Meals per delivery</h2>
        <label className="flex items-center justify-between gap-3 rounded-2xl border border-line px-4 h-14">
          <span className="font-semibold">Clients</span>
          <input
            type="number" inputMode="numeric" min={0} placeholder="0"
            className="w-20 h-10 text-right rounded-xl border border-line bg-white px-3 text-[17px] font-semibold outline-none focus:border-ink"
            value={clients || ""}
            onChange={(e) => setClients(toInt(e.target.value))}
          />
        </label>

        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2 rounded-2xl border border-special-soft bg-special-soft/50 px-3 h-14">
            <select
              className="flex-1 min-w-0 h-10 rounded-xl border border-line bg-white px-2 text-[15px] font-semibold text-special outline-none"
              value={r.dish}
              onChange={(e) => updateRow(i, { dish: e.target.value })}
              aria-label="Special type"
            >
              <option value="">Choose special…</option>
              {specialTypes.map((d) => (
                <option key={d.id} value={d.id} disabled={used.has(String(d.id)) && r.dish !== String(d.id)}>{d.name}</option>
              ))}
            </select>
            <input
              type="number" inputMode="numeric" min={0} placeholder="0" aria-label="Quantity"
              className="w-16 h-10 text-right rounded-xl border border-line bg-white px-2 text-[17px] font-semibold outline-none focus:border-ink"
              value={r.qty || ""}
              onChange={(e) => updateRow(i, { qty: toInt(e.target.value) })}
            />
            <button type="button" className="h-10 w-9 text-muted text-xl" aria-label="Remove special" onClick={() => setRows(rows.filter((_, j) => j !== i))}>×</button>
          </div>
        ))}

        {specialTypes.length === 0 ? (
          <p className="text-sm text-muted">Add special types (Vegan, Diabetic…) in Settings.</p>
        ) : (
          rows.length < specialTypes.length && (
            <button type="button" className="btn w-full border-2 border-dashed border-special/40 text-special bg-white" onClick={() => setRows([...rows, { dish: "", qty: 1 }])}>
              + Add special
            </button>
          )
        )}

        <div className="flex items-center justify-between border-t border-line pt-3">
          <span className="font-semibold">Total meals</span>
          <span className="text-2xl font-bold tabular-nums">{houseTotal(items)}</span>
        </div>
      </div>

      <div className="card p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-bold text-lg">Delivery schedule</h2>
            <p className="text-sm text-muted">Which days and meals this house wants food. Used as the default when you add it to a route.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button type="button" className="btn-ghost btn-sm" onClick={() => setAll(true)}>All</button>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setAll(false)}>None</button>
          </div>
        </div>
        {WEEK_ORDER.map((wd) => (
          <div key={wd} className="flex items-center justify-between gap-3">
            <span className="font-semibold w-14">{WEEKDAYS[wd]}</span>
            <div className="flex gap-2">
              {MEALS.map((m) => {
                const on = (sched[String(wd)] ?? []).includes(m);
                return (
                  <button
                    key={m} type="button" aria-pressed={on} title={MEAL_LABEL[m]}
                    onClick={() => toggleMeal(wd, m)}
                    className={`h-11 w-11 rounded-xl grid place-items-center font-bold border-2 ${on ? "bg-brand border-brand text-ink" : "border-line text-muted bg-white"}`}
                  >
                    {m[0].toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <p className="text-sm text-muted border-t border-line pt-3">
          {shiftsPerWeek === 0 ? "No days selected yet." : `${shiftsPerWeek} ${shiftsPerWeek === 1 ? "delivery" : "deliveries"} a week.`}
        </p>
      </div>

      <div className="card p-5 space-y-2">
        <label className="font-bold text-lg block" htmlFor="notes">Notes for the driver</label>
        <textarea
          id="notes" name="notes" rows={3} defaultValue={initial.notes}
          className="block w-full rounded-2xl border border-line bg-white px-4 py-3 text-[16px] outline-none focus:border-ink"
          placeholder="e.g. Gate code 1234, leave at the side door"
        />
      </div>

      <FormMessage state={state} />
      <Submit className="btn-dark w-full h-14">{initial.id ? "Save house" : "Add house"}</Submit>
    </form>
  );
}
