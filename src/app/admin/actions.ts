"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sql, one } from "@/lib/db";
import { hashPassword, requireAdmin } from "@/lib/auth";
import { dishTypes, getRun, refreshRuns, setSetting, today } from "@/lib/data";
import { MEALS, freezeStops, isDate, isTimeZone, parseMoney, routeKey, weekdayOf, type TemplateStop } from "@/lib/core";
import type { FormState } from "../actions";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const ints = (f: FormData, k: string) =>
  f.getAll(k).map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
const meals = (f: FormData, k: string) => f.getAll(k).map(String).filter((m) => (MEALS as readonly string[]).includes(m));

// ---------- drivers ----------

export async function saveDriverAction(_: FormState, form: FormData): Promise<FormState> {
  const me = await requireAdmin();
  const id = Number(form.get("id")) || null;
  const name = str(form, "name");
  const username = str(form, "username").toLowerCase();
  const password = String(form.get("password") ?? "");
  const phone = str(form, "phone");
  if (!name) return { error: "Name is required." };
  if (!/^[a-z0-9._-]{3,30}$/.test(username))
    return { error: "Username: 3–30 characters, letters, numbers, dots, dashes." };
  if (password && password.length < 6) return { error: "New password must be at least 6 characters." };
  const taken = await one("SELECT 1 FROM users WHERE lower(username) = $1 AND id <> $2", [username, id ?? 0]);
  if (taken) return { error: "That username is already taken." };

  const values = [name, username, form.get("active") === "on", phone];
  if (id) {
    await sql(
      "UPDATE users SET name=$1, username=$2, active=$3, phone=$4, is_admin=$5 WHERE id=$6 AND is_driver",
      [...values, id === me.id || form.get("is_admin") === "on", id],
    );
    if (password) await sql("UPDATE users SET password_hash=$1 WHERE id=$2", [await hashPassword(password), id]);
  } else {
    await sql(
      "INSERT INTO users (name, username, active, phone, password_hash, is_admin, role, is_driver) VALUES ($1,$2,$3,$4,$5,$6,'driver',true)",
      [...values, password ? await hashPassword(password) : "", form.get("is_admin") === "on"],
    );
  }
  revalidatePath("/admin", "layout");
  redirect("/admin/drivers");
}

export async function toggleDriverAction(id: number) {
  const me = await requireAdmin();
  if (id === me.id) return; // never lock yourself out
  await sql("UPDATE users SET active = NOT active WHERE id = $1 AND is_driver", [id]);
  await refreshRuns();
  revalidatePath("/admin", "layout");
}

// ---------- routes and day runs ----------

function parseStops(raw: string): TemplateStop[] | null {
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return null;
    return data.map((s: any) => ({
      name: String(s.name ?? "").trim(),
      address: String(s.address ?? "").trim(),
      items: Object.fromEntries(
        Object.entries(s.items ?? {})
          .map(([k, v]) => [k, Math.max(0, Math.floor(Number(v) || 0))] as const)
          .filter(([, v]) => v > 0),
      ),
    }));
  } catch {
    return null;
  }
}

function parseRouteForm(form: FormData) {
  const name = str(form, "name");
  const meal = str(form, "meal");
  const pay = parseMoney(form.get("pay"));
  const driverId = Number(form.get("driver_id")) || null;
  const stops = parseStops(String(form.get("stops") ?? "[]"));
  if (!name) return { error: "Route name is required." };
  if (!(MEALS as readonly string[]).includes(meal)) return { error: "Choose breakfast, lunch or dinner." };
  if (pay === null) return { error: "Enter the route pay, e.g. 45 or 45.50." };
  if (!stops || !stops.length) return { error: "Add at least one house." };
  const bad = stops.findIndex((s) => !s.address);
  if (bad >= 0) return { error: `House #${bad + 1} needs an address.` };
  const empty = stops.findIndex((s) => !Object.keys(s.items).length);
  if (empty >= 0) return { error: `House #${empty + 1} needs at least one meal.` };
  return { name, meal, pay, driverId, stops };
}

/** Saves a route for one specific date: a one-off route, or a change to that day's copy of a recurring one. */
export async function saveRunAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const id = Number(form.get("id")) || null;
  const date = str(form, "date");
  if (!isDate(date)) return { error: "Invalid date." };
  const r = parseRouteForm(form);
  if ("error" in r) return { error: r.error };
  const stops = JSON.stringify(freezeStops(r.stops, await dishTypes(true)));
  if (id) {
    await sql(
      "UPDATE runs SET name=$1, meal=$2, driver_id=$3, pay_cents=$4, stops=$5, customized=true, current_stop=0 WHERE id=$6",
      [r.name, r.meal, r.driverId, r.pay, stops, id],
    );
  } else {
    await sql(
      "INSERT INTO runs (run_date, name, meal, driver_id, pay_cents, stops, customized) VALUES ($1,$2,$3,$4,$5,$6,true)",
      [date, r.name, r.meal, r.driverId, r.pay, stops],
    );
  }
  revalidatePath("/admin", "layout");
  redirect(`/admin?date=${date}`);
}

export async function setRunStatusAction(id: number, status: "pending" | "completed" | "cancelled") {
  await requireAdmin();
  const run = await getRun(id);
  if (!run) return;
  if (status === "completed")
    await sql("UPDATE runs SET status='completed', completed_at=COALESCE(completed_at, now()) WHERE id=$1", [id]);
  else
    await sql("UPDATE runs SET status=$2, completed_at=NULL, started_at=NULL, current_stop=0 WHERE id=$1", [id, status]);
  revalidatePath("/admin", "layout");
}

/** Removes a one-off route entirely (recurring copies are cancelled instead so they don't come back). */
export async function deleteRunAction(id: number) {
  await requireAdmin();
  const run = await getRun(id);
  if (!run) return;
  if (run.route_id || run.route_key) await sql("UPDATE runs SET status='cancelled' WHERE id=$1", [id]);
  else await sql("DELETE FROM runs WHERE id=$1", [id]);
  revalidatePath("/admin", "layout");
  redirect(`/admin?date=${run.run_date}`);
}

// ---------- houses ----------

export async function saveHouseAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const id = Number(form.get("id")) || null;
  const name = str(form, "name");
  const address = str(form, "address");
  const notes = String(form.get("notes") ?? "").trim();
  if (!address) return { error: "Address is required." };
  let items: Record<string, number> = {};
  try {
    items = Object.fromEntries(
      Object.entries(JSON.parse(String(form.get("items") ?? "{}")))
        .map(([k, v]) => [k, Math.max(0, Math.floor(Number(v) || 0))] as const)
        .filter(([, v]) => v > 0),
    );
  } catch {
    return { error: "Something went wrong reading the form. Try again." };
  }
  if (!Object.keys(items).length) return { error: "Enter the number of clients or at least one special." };
  let schedule: Record<string, string[]> = {};
  try {
    const raw = JSON.parse(String(form.get("schedule") ?? "{}")) as Record<string, unknown>;
    for (const [k, v] of Object.entries(raw)) {
      const wd = Number(k);
      if (!Number.isInteger(wd) || wd < 0 || wd > 6) continue;
      const ms = (Array.isArray(v) ? v : []).map(String).filter((m) => (MEALS as readonly string[]).includes(m));
      if (ms.length) schedule[String(wd)] = [...new Set(ms)];
    }
  } catch {
    return { error: "Something went wrong reading the form. Try again." };
  }
  const values = [name, address, JSON.stringify(items), notes, JSON.stringify(schedule)];
  if (id) await sql("UPDATE houses SET name=$1, address=$2, items=$3, notes=$4, schedule=$5 WHERE id=$6", [...values, id]);
  else await sql("INSERT INTO houses (name, address, items, notes, schedule) VALUES ($1,$2,$3,$4,$5)", values);
  await refreshRuns();
  revalidatePath("/admin", "layout");
  redirect("/admin/houses");
}

export async function toggleHouseAction(id: number) {
  await requireAdmin();
  await sql("UPDATE houses SET active = NOT active WHERE id = $1", [id]);
  await refreshRuns();
  revalidatePath("/admin", "layout");
}

export async function deleteHouseAction(id: number) {
  await requireAdmin();
  await sql("DELETE FROM houses WHERE id = $1", [id]);
  await refreshRuns();
  revalidatePath("/admin", "layout");
  redirect("/admin/houses");
}

// ---------- routes ----------

type SlotInput = { weekday: number; meal: string; driver_id: number | null; skip: number[] };

/** Saves a route: name, pay, houses in order, and for each day + meal its driver and skipped houses. */
export async function saveDeliveryRouteAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const id = Number(form.get("id")) || null;
  const name = str(form, "name");
  const pay = parseMoney(form.get("pay"));
  if (!name) return { error: "Route name is required." };
  if (pay === null) return { error: "Enter the route pay, e.g. 45 or 45.50." };
  let members: { id: number; meals: string[] }[] = [];
  let houseIds: number[] = [];
  let slots: SlotInput[] = [];
  try {
    const seen = new Set<number>();
    members = (JSON.parse(String(form.get("houses") ?? "[]")) as { id: unknown; meals: unknown }[])
      .map((m) => ({ id: Number(m.id), meals: (Array.isArray(m.meals) ? m.meals : []).map(String).filter((x) => (MEALS as readonly string[]).includes(x)) }))
      .filter((m) => m.id > 0 && !seen.has(m.id) && seen.add(m.id));
    houseIds = members.map((m) => m.id);
    slots = (JSON.parse(String(form.get("slots") ?? "[]")) as SlotInput[])
      .filter((s) => Number.isInteger(s.weekday) && s.weekday >= 0 && s.weekday <= 6 && (MEALS as readonly string[]).includes(s.meal))
      .map((s) => ({ ...s, driver_id: Number(s.driver_id) || null, skip: (s.skip ?? []).map(Number).filter((h) => houseIds.includes(h)) }));
  } catch {
    return { error: "Something went wrong reading the form. Try again." };
  }
  if (!houseIds.length) return { error: "Add at least one house to the route." };

  const active = form.get("has_active") ? form.get("active") === "on" : true;
  let routeId = id;
  if (id) await sql("UPDATE delivery_routes SET name=$1, pay_cents=$2, active=$3 WHERE id=$4", [name, pay, active, id]);
  else routeId = (await one<{ id: number }>("INSERT INTO delivery_routes (name, pay_cents, active) VALUES ($1,$2,$3) RETURNING id", [name, pay, active]))!.id;

  await sql("DELETE FROM route_houses WHERE route_id=$1", [routeId]);
  for (const [pos, m] of members.entries())
    await sql("INSERT INTO route_houses (route_id, house_id, position, meals) VALUES ($1,$2,$3,$4)", [routeId, m.id, pos, m.meals]);
  // Drivers taken from other routes (admin confirmed "replace"): those shifts are left without a driver.
  try {
    const release = JSON.parse(String(form.get("release") ?? "[]")) as { route_id: number; weekday: number; meal: string; driver_id: number }[];
    for (const r of release)
      await sql("UPDATE route_slots SET driver_id = NULL WHERE route_id=$1 AND weekday=$2 AND meal=$3 AND driver_id=$4 AND route_id <> $5", [
        Number(r.route_id), Number(r.weekday), String(r.meal), Number(r.driver_id), routeId,
      ]);
  } catch {}
  await sql("DELETE FROM route_slots WHERE route_id=$1", [routeId]);
  for (const s of slots)
    await sql("INSERT INTO route_slots (route_id, weekday, meal, driver_id, skip) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING", [
      routeId, s.weekday, s.meal, s.driver_id, s.skip,
    ]);
  await refreshRuns();
  revalidatePath("/admin", "layout");
  redirect("/admin/routes");
}

export async function deleteDeliveryRouteAction(id: number) {
  await requireAdmin();
  await sql("DELETE FROM delivery_routes WHERE id=$1", [id]);
  await refreshRuns();
  revalidatePath("/admin", "layout");
  redirect("/admin/routes");
}

/** Gives one delivery (date + meal) of a route to another driver; other weeks stay the same. */
export async function overrideDriverAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const routeId = Number(form.get("route_id"));
  const meal = str(form, "meal");
  const date = str(form, "date");
  const to = Number(form.get("to_driver"));
  if (!to) return { error: "Choose a driver." };
  if (!isDate(date)) return { error: "Pick a date." };
  if (date < (await today())) return { error: "That date has already passed." };
  const slot = await one("SELECT 1 FROM route_slots WHERE route_id=$1 AND weekday=$2 AND meal=$3", [routeId, weekdayOf(date), meal]);
  if (!slot) return { error: "This route doesn't run that day and meal." };
  const key = routeKey(routeId, weekdayOf(date), meal);
  await sql(
    "INSERT INTO run_overrides (run_date, route_key, driver_id) VALUES ($1,$2,$3) ON CONFLICT (run_date, route_key) DO UPDATE SET driver_id=$3",
    [date, key, to],
  );
  await sql("UPDATE runs SET driver_id=$1 WHERE route_key=$2 AND run_date=$3 AND status <> 'completed'", [to, key, date]);
  revalidatePath("/admin", "layout");
  return { ok: "Done. Only that date changes." };
}

// ---------- settings ----------

export async function saveDishTypesAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const ids = form.getAll("dish_id").map(Number);
  const names = form.getAll("dish_name").map((n) => String(n).trim());
  const actives = new Set(form.getAll("dish_active").map(Number));
  for (let i = 0; i < ids.length; i++) {
    if (!names[i]) return { error: "Dish names can't be empty." };
    await sql("UPDATE dish_types SET name=$1, active=$2 OR is_default, sort=$3 WHERE id=$4", [names[i], actives.has(ids[i]), i, ids[i]]);
  }
  const added = str(form, "new_dish");
  if (added) await sql("INSERT INTO dish_types (name, sort) VALUES ($1, $2)", [added, ids.length]);
  revalidatePath("/admin", "layout");
  return { ok: "Saved." };
}

export async function saveTimeZoneAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const tz = str(form, "timezone");
  if (!isTimeZone(tz)) return { error: "Unknown time zone." };
  await setSetting("timezone", tz);
  revalidatePath("/", "layout");
  return { ok: "Saved." };
}

export async function changeAdminPasswordAction(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const pw = String(form.get("password") ?? "");
  if (pw.length < 8) return { error: "Password must be at least 8 characters." };
  await sql("UPDATE users SET password_hash=$1 WHERE id=$2", [await hashPassword(pw), admin.id]);
  return { ok: "Password changed." };
}
