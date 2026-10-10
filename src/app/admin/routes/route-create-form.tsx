"use client";

import { useActionState, useState } from "react";
import { MEALS, MEAL_LABEL, WEEKDAYS, WEEK_ORDER } from "@/lib/core";
import { FormMessage, Submit } from "@/components/ui";
import { createRouteAction } from "../actions";
import type { FormState } from "../../actions";

type HouseOpt = { id: number; name: string; address: string; schedule: Record<string, string[]> };
type DriverOpt = { id: number; name: string; active: boolean };
type Taken = { weekday: number; meal: string; driver_id: number; route_name: string };

const LETTER: Record<string, string> = { breakfast: "B", lunch: "L", dinner: "D" };

export function RouteCreateForm({ houses, drivers, taken }: { houses: HouseOpt[]; drivers: DriverOpt[]; taken: Taken[] }) {
  const [state, action] = useActionState(createRouteAction, undefined);
  const [driverId, setDriverId] = useState("");
  const [picked, setPicked] = useState<number[]>([]);
  const [q, setQ] = useState("");

  const byId = new Map(houses.map((h) => [h.id, h]));
  const addable = houses.filter((h) => !picked.includes(h.id) && (h.name + " " + h.address).toLowerCase().includes(q.toLowerCase()));

  const move = (i: number, d: number) => {
    const next = [...picked];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    setPicked(next);
  };

  // Days + meals come straight from the picked houses' own schedules.
  const shifts = new Map<string, { weekday: number; meal: string }>();
  for (const id of picked) {
    const sched = byId.get(id)?.schedule ?? {};
    for (const [k, ms] of Object.entries(sched)) {
      const wd = Number(k);
      if (!Number.isInteger(wd) || wd < 0 || wd > 6) continue;
      for (const m of ms) if ((MEALS as readonly string[]).includes(m)) shifts.set(`${wd}:${m}`, { weekday: wd, meal: m });
    }
  }
  const shiftList = [...shifts.values()].sort((a, b) => WEEK_ORDER.indexOf(a.weekday) - WEEK_ORDER.indexOf(b.weekday) || MEALS.indexOf(a.meal as (typeof MEALS)[number]) - MEALS.indexOf(b.meal as (typeof MEALS)[number]));
  const unscheduled = picked.filter((id) => !Object.keys(byId.get(id)?.schedule ?? {}).length);

  const clashes = taken.filter((t) => String(t.driver_id) === driverId && shifts.has(`${t.weekday}:${t.meal}`));

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="houses" value={JSON.stringify(picked)} />

      <div className="card p-5 space-y-4">
        <div>
          <label className="label" htmlFor="name">Route name</label>
          <input id="name" name="name" className="field" placeholder="e.g. North side" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="driver_id">Driver</label>
            <select id="driver_id" name="driver_id" className="field" value={driverId} onChange={(e) => setDriverId(e.target.value)} required>
              <option value="" disabled>Choose driver…</option>
              {drivers.filter((d) => d.active).map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="pay">Pay per shift ($)</label>
            <input id="pay" name="pay" className="field" inputMode="decimal" placeholder="0.00" required />
          </div>
        </div>
        {clashes.length > 0 && (
          <p className="text-sm text-special font-medium">
            ⚠ Already driving {[...new Set(clashes.map((c) => `${c.route_name} (${WEEKDAYS[c.weekday]} ${MEAL_LABEL[c.meal].toLowerCase()})`))].join(", ")}.
          </p>
        )}
      </div>

      <div className="card p-5 space-y-3">
        <h2 className="font-bold text-lg">Days &amp; meals <span className="text-muted font-medium text-sm">from the houses below</span></h2>
        {shiftList.length === 0 ? (
          <p className="text-sm text-muted">Pick houses below and the schedule fills in automatically.</p>
        ) : (
          <div className="space-y-1">
            {WEEK_ORDER.filter((wd) => shiftList.some((s) => s.weekday === wd)).map((wd) => (
              <p key={wd} className="text-[15px]">
                <span className="font-semibold w-12 inline-block">{WEEKDAYS[wd]}</span>{" "}
                <span className="text-muted">{shiftList.filter((s) => s.weekday === wd).map((s) => MEAL_LABEL[s.meal]).join(" · ")}</span>
              </p>
            ))}
          </div>
        )}
        {unscheduled.length > 0 && (
          <p className="text-sm text-special font-medium">
            No schedule set for: {unscheduled.map((id) => byId.get(id)?.name || `#${id}`).join(", ")}. Add days + meals in Houses.
          </p>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="font-bold text-lg px-1">Houses in delivery order <span className="text-muted font-medium">({picked.length})</span></h2>
        {picked.map((id, i) => {
          const h = byId.get(id)!;
          const n = Object.values(h.schedule ?? {}).reduce((a, ms) => a + ms.length, 0);
          return (
            <div key={id} className="card p-4 flex items-center gap-3">
              <span className="h-7 w-7 rounded-full bg-ink text-white grid place-items-center text-[13px] font-bold shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{h.name || h.address}</p>
                <p className="text-[13px] text-muted truncate">{n ? `${n} deliveries/week` : "No schedule yet"}</p>
              </div>
              <button type="button" className="btn-ghost btn-sm w-9 px-0" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">↑</button>
              <button type="button" className="btn-ghost btn-sm w-9 px-0" disabled={i === picked.length - 1} onClick={() => move(i, 1)} aria-label="Move down">↓</button>
              <button type="button" className="btn-ghost btn-sm text-danger" onClick={() => setPicked(picked.filter((x) => x !== id))}>Remove</button>
            </div>
          );
        })}
        <div className="card p-4 space-y-3">
          <input className="field" placeholder="Search houses…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="max-h-56 overflow-y-auto space-y-1">
            {addable.map((h) => (
              <button
                key={h.id} type="button"
                onClick={() => setPicked([...picked, h.id])}
                className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-bg flex items-center justify-between gap-3"
              >
                <span className="min-w-0">
                  <span className="font-semibold block truncate">{h.name || h.address}</span>
                  <span className="text-[13px] text-muted block truncate">{h.address}</span>
                </span>
                <span className="text-brand-ink font-bold shrink-0">+ Add</span>
              </button>
            ))}
            {addable.length === 0 && <p className="text-sm text-muted px-3 py-2">{houses.length ? "No more houses match." : "No houses yet — add them in Houses first."}</p>}
          </div>
        </div>
      </div>

      <FormMessage state={state as FormState} />
      <Submit className="btn-dark w-full h-14">Create route</Submit>
    </form>
  );
}
