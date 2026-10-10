"use client";

import { useActionState, useEffect, useState } from "react";
import { MEALS, MEAL_LABEL, WEEKDAYS, WEEKDAY_LONG, WEEK_ORDER, houseTotal } from "@/lib/core";
import { FormMessage, Submit } from "@/components/ui";
import { saveDeliveryRouteAction } from "../actions";
import type { Driver, House, RouteSlot } from "@/lib/data";

type Values = { id?: number; name: string; pay: string; active: boolean; houses: number[]; slots: RouteSlot[] };
/** A driver already on another route for a day + meal. */
export type Taken = { route_id: number; route_name: string; weekday: number; meal: string; driver_id: number };

const LETTER: Record<string, string> = { breakfast: "B", lunch: "L", dinner: "D" };


/**
 * Route editor. Pick a day, then set the driver for each shift (B/L/D) and which shifts each house gets that day.
 * A slot (day + meal) delivers the route's houses minus its `skip` list.
 */
export function RouteEditor({
  initial, allHouses, drivers, taken, todayWd,
}: { initial: Values; allHouses: House[]; drivers: Driver[]; taken: Taken[]; todayWd: number }) {
  const [state, action] = useActionState(saveDeliveryRouteAction, undefined);
  const [order, setOrder] = useState<number[]>(initial.houses);
  const [slots, setSlots] = useState<RouteSlot[]>(initial.slots);
  const [day, setDay] = useState(todayWd);
  const [picking, setPicking] = useState("");
  // Other routes' shifts this route takes the driver from (they're left without a driver on save).
  const [release, setRelease] = useState<Taken[]>([]);
  const [touched, setTouched] = useState(false); // name / pay / active edited
  const [saving, setSaving] = useState(false);
  const dirty = touched || release.length > 0 || JSON.stringify([order, slots]) !== JSON.stringify([initial.houses, initial.slots]);

  useEffect(() => setSaving(false), [state]); // a failed save keeps the edits

  // Warn before closing or reloading the page with unsaved edits.
  useEffect(() => {
    if (!dirty || saving) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, saving]);

  const byId = new Map(allHouses.map((h) => [h.id, h]));
  const members = order.map((id) => byId.get(id)).filter(Boolean) as House[];
  const addable = allHouses.filter((h) => !order.includes(h.id));

  const slot = (wd: number, meal: string) => slots.find((s) => s.weekday === wd && s.meal === meal);
  const isOn = (wd: number, meal: string, hid: number) => {
    const s = slot(wd, meal);
    return !!s && !s.skip.includes(hid);
  };
  const housesOn = (wd: number, meal: string) => members.filter((h) => isOn(wd, meal, h.id));
  const dayHasAny = (wd: number) => MEALS.some((m) => housesOn(wd, m).length > 0 || slot(wd, m)?.driver_id);
  const takenBy = (wd: number, meal: string, driverId: number) =>
    taken.find((t) => t.weekday === wd && t.meal === meal && t.driver_id === driverId && !release.some((r) => r.route_id === t.route_id && r.weekday === wd && r.meal === meal));

  // ----- edits -----
  const setSlot = (wd: number, meal: string, next: RouteSlot | null) =>
    setSlots((prev) => [...prev.filter((s) => !(s.weekday === wd && s.meal === meal)), ...(next ? [next] : [])]);

  const toggleHouse = (hid: number, meal: string) => {
    const s = slot(day, meal);
    if (!s) return setSlot(day, meal, { weekday: day, meal, driver_id: null, skip: order.filter((id) => id !== hid) });
    const skip = s.skip.includes(hid) ? s.skip.filter((x) => x !== hid) : [...s.skip, hid];
    const empty = order.every((id) => skip.includes(id));
    setSlot(day, meal, empty && !s.driver_id ? null : { ...s, skip });
  };

  const pickDriver = (meal: string, value: string) => {
    const driverId = Number(value) || null;
    const clash = driverId ? takenBy(day, meal, driverId) : undefined;
    if (clash) {
      const name = drivers.find((d) => d.id === driverId)?.name ?? "This driver";
      if (!confirm(`${name} is already assigned to another route ("${clash.route_name}") on ${WEEKDAY_LONG[day]} ${MEAL_LABEL[meal].toLowerCase()}. Replace that route's driver? It will be left without a driver.`)) return;
      setRelease((r) => [...r, clash]);
    }
    const s = slot(day, meal);
    if (!s && !driverId) return;
    setSlot(day, meal, s ? { ...s, driver_id: driverId } : { weekday: day, meal, driver_id: driverId, skip: [...order] });
  };

  const clearDay = () => setSlots(slots.filter((s) => s.weekday !== day));
  const copyDayToAll = () => {
    const src = slots.filter((s) => s.weekday === day);
    setSlots([
      ...src,
      ...WEEK_ORDER.filter((wd) => wd !== day).flatMap((wd) =>
        src.map((s) => {
          const d = drivers.find((x) => x.id === s.driver_id);
          const keep = d && d.active && !takenBy(wd, s.meal, d.id);
          return { ...s, weekday: wd, driver_id: keep ? s.driver_id : null, skip: [...s.skip] };
        }),
      ),
    ]);
  };

  const move = (i: number, d: number) => {
    const next = [...order];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    setOrder(next);
  };
  const removeHouse = (id: number) => {
    setOrder(order.filter((x) => x !== id));
    setSlots(slots.map((s) => ({ ...s, skip: s.skip.filter((x) => x !== id) })));
  };
  const addHouse = () => {
    const id = Number(picking);
    if (!id) return;
    setOrder([...order, id]);
    // A new house starts off in every existing shift; turn it on per day with B/L/D.
    setSlots(slots.map((s) => ({ ...s, skip: [...s.skip, id] })));
    setPicking("");
  };

  return (
    <form action={action} className="space-y-5" onChange={() => setTouched(true)} onSubmit={() => setSaving(true)}>
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      {initial.id && <input type="hidden" name="has_active" value="1" />}
      <input type="hidden" name="houses" value={JSON.stringify(order.map((id) => ({ id, meals: [...MEALS] })))} />
      <input type="hidden" name="slots" value={JSON.stringify(slots)} />
      <input type="hidden" name="release" value={JSON.stringify(release)} />

      <div className="card p-5 space-y-4">
        <div className="grid grid-cols-[1fr_8rem] gap-3">
          <div>
            <label className="label" htmlFor="name">Route name</label>
            <input id="name" name="name" className="field" defaultValue={initial.name} placeholder="e.g. HB M-F Lunch" required />
          </div>
          <div>
            <label className="label" htmlFor="pay">Pay per shift ($)</label>
            <input id="pay" name="pay" className="field" inputMode="decimal" defaultValue={initial.pay} placeholder="0.00" required />
          </div>
        </div>
        {initial.id && (
          <label className="flex items-center gap-3 text-[15px] font-medium">
            <input type="checkbox" name="active" defaultChecked={initial.active} className="h-5 w-5 accent-ink" />
            Active
          </label>
        )}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 gap-1.5">
        {WEEK_ORDER.map((wd) => {
          const letters = MEALS.filter((m) => housesOn(wd, m).length).map((m) => LETTER[m]).join("");
          const missing = MEALS.some((m) => housesOn(wd, m).length && !slot(wd, m)?.driver_id);
          return (
            <button
              key={wd} type="button" onClick={() => setDay(wd)}
              className={`h-14 rounded-xl text-sm font-bold border flex flex-col items-center justify-center leading-tight ${wd === day ? "bg-ink border-ink text-white" : "bg-white border-line"}`}
            >
              {WEEKDAYS[wd].slice(0, 2)}
              <span className={`text-[10px] font-semibold ${missing ? "text-special" : wd === day ? "text-white/70" : "text-muted"}`}>{letters || "—"}{missing ? " ⚠" : ""}</span>
            </button>
          );
        })}
      </div>

      {/* Drivers for the selected day */}
      <div className="card p-4 space-y-2.5">
        <h2 className="font-bold text-lg">{WEEKDAY_LONG[day]} drivers</h2>
        {MEALS.map((meal) => {
          const s = slot(day, meal);
          const count = housesOn(day, meal).length;
          const options = drivers.filter((d) => d.active || d.id === s?.driver_id);
          return (
            <div key={meal}>
              <div className="flex items-center gap-2">
                <span className={`h-10 w-10 shrink-0 rounded-xl grid place-items-center font-bold ${count ? "bg-brand text-ink" : "bg-bg text-muted"}`}>{LETTER[meal]}</span>
                <select
                  className={`field h-10 rounded-xl text-sm ${count && !s?.driver_id ? "border-special text-special" : ""}`}
                  value={s?.driver_id ?? ""}
                  onChange={(e) => pickDriver(meal, e.target.value)}
                  aria-label={`${MEAL_LABEL[meal]} driver`}
                >
                  <option value="">{count ? "No driver yet" : `${MEAL_LABEL[meal]}: no houses`}</option>
                  {options.map((d) => {
                    const clash = d.id !== s?.driver_id ? takenBy(day, meal, d.id) : undefined;
                    return (
                      <option key={d.id} value={d.id} style={clash ? { color: "#c53030" } : undefined}>
                        {clash ? `🔴 ${d.name} — on ${clash.route_name}` : d.name}{d.active ? "" : " (inactive)"}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          );
        })}
        <p className="text-xs text-muted">🔴 = already on another route that day and shift.</p>
      </div>

      {/* Houses with B/L/D for the selected day */}
      <div className="space-y-3">
        <h2 className="font-bold text-lg px-1">Houses in delivery order <span className="text-muted font-medium">({members.length})</span></h2>
        {members.length > 0 && (
          <ol className="card overflow-hidden divide-y divide-line">
            {members.map((h, i) => (
              <li key={h.id} className="flex items-center gap-3 px-4 py-3">
                <span className="h-7 w-7 shrink-0 rounded-full bg-ink text-white grid place-items-center text-[13px] font-bold">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{h.name || h.address}{!h.active && <span className="chip-muted ml-1.5">Paused</span>}</p>
                  <p className="text-[13px] text-muted truncate">{houseTotal(h.items)} meals · {h.address}</p>
                  <div className="flex gap-1.5 mt-1.5">
                    {MEALS.map((m) => {
                      const on = isOn(day, m, h.id);
                      return (
                        <button
                          key={m} type="button" onClick={() => toggleHouse(h.id, m)}
                          aria-pressed={on} aria-label={`${WEEKDAY_LONG[day]} ${MEAL_LABEL[m]} ${on ? "on" : "off"}`}
                          className={`h-8 w-9 rounded-lg text-sm font-bold border ${on ? "bg-brand border-brand text-ink" : "bg-white border-line text-muted"}`}
                        >
                          {LETTER[m]}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <button type="button" className="btn-ghost btn-sm w-9 px-0" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">↑</button>
                <button type="button" className="btn-ghost btn-sm w-9 px-0" disabled={i === members.length - 1} onClick={() => move(i, 1)} aria-label="Move down">↓</button>
                <button type="button" className="h-9 w-8 text-muted text-xl" onClick={() => removeHouse(h.id)} aria-label="Remove from route">×</button>
              </li>
            ))}
          </ol>
        )}
        {addable.length > 0 ? (
          <div className="flex gap-2">
            <select className="field flex-1 min-w-0" value={picking} onChange={(e) => setPicking(e.target.value)} aria-label="House to add">
              <option value="">Choose a house to add…</option>
              {addable.map((h) => <option key={h.id} value={h.id}>{h.name || h.address}</option>)}
            </select>
            <button type="button" className="btn-primary shrink-0" disabled={!picking} onClick={addHouse}>+ Add</button>
          </div>
        ) : (
          allHouses.length === 0 && <p className="text-sm text-muted px-1">Add houses first in the Houses tab.</p>
        )}

        {members.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="btn-ghost" disabled={!dayHasAny(day)}
              onClick={() => { if (confirm(`Copy ${WEEKDAY_LONG[day]} (houses and drivers) to every day?`)) copyDayToAll(); }}>
              Copy {WEEKDAYS[day]} to all days
            </button>
            <button type="button" className="btn-ghost text-danger" disabled={!slots.some((s) => s.weekday === day)}
              onClick={() => { if (confirm(`No deliveries on ${WEEKDAY_LONG[day]} for this route?`)) clearDay(); }}>
              Clear {WEEKDAYS[day]}
            </button>
          </div>
        )}
      </div>

      <FormMessage state={state} />
      {/* One save for everything: all days, drivers and houses. */}
      <div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-20">
        <div className={`card p-2 pl-4 flex items-center gap-3 shadow-lg ${dirty ? "border-special" : ""}`}>
          <p className={`flex-1 text-sm font-semibold ${dirty ? "text-special" : "text-muted"}`}>
            {dirty ? "Unsaved changes" : initial.id ? "No changes" : "New route"}
          </p>
          <Submit className="btn-dark h-11 px-5">{initial.id ? "Save route" : "Create route"}</Submit>
        </div>
      </div>
    </form>
  );
}
