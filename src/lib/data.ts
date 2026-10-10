import "server-only";
import { sql, one } from "./db";
import {
  MEALS, freezeStops, routeKey, todayIn, weekDates, weekdayOf,
  type DishType, type RunStatus, type RunStop,
} from "./core";

export type House = {
  id: number;
  name: string;
  address: string;
  items: Record<string, number>;
  notes: string;
  active: boolean;
  /** Default weekly schedule: weekday ("0"-"6", Sun-Sat) -> meals wanted. Used when adding the house to a route. */
  schedule: Record<string, string[]>;
};

/** A day + meal the route runs, its driver, and houses left out that time. */
export type RouteSlot = { weekday: number; meal: string; driver_id: number | null; skip: number[] };

export type DeliveryRoute = {
  id: number;
  name: string;
  pay_cents: number;
  active: boolean;
  /** Houses in order; `meals` = the shifts (B/L/D) each house gets on this route. */
  houses: (House & { meals: string[] })[];
  slots: RouteSlot[];
};

export type Run = {
  id: number;
  run_date: string;
  route_id: number | null;
  route_key: string | null;
  name: string;
  meal: string;
  driver_id: number | null;
  driver_name: string | null;
  driver_active: boolean | null;
  pay_cents: number;
  stops: RunStop[];
  status: RunStatus;
  current_stop: number;
  customized: boolean;
  completed_at: Date | null;
};

// ---------- settings ----------

export async function getSetting(key: string) {
  return (await one<{ value: string }>("SELECT value FROM settings WHERE key = $1", [key]))?.value;
}

export async function setSetting(key: string, value: string) {
  await sql("INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2", [key, value]);
}

export async function timeZone() {
  return (await getSetting("timezone")) ?? "America/New_York";
}

export async function today() {
  return todayIn(await timeZone());
}

// ---------- dish types ----------

export async function dishTypes(includeInactive = false) {
  return sql<DishType>(`SELECT * FROM dish_types ${includeInactive ? "" : "WHERE active"} ORDER BY sort, id`);
}

// ---------- drivers ----------

export type Driver = { id: number; name: string; username: string; phone: string; is_admin: boolean; active: boolean; work_days: number[]; meals: string[]; maps_app: string | null; has_password: boolean };

export async function drivers() {
  return sql<Driver>(
    "SELECT id, name, username, phone, is_admin, active, work_days, meals, maps_app, password_hash <> '' AS has_password FROM users WHERE is_driver ORDER BY active DESC, name",
  );
}

// ---------- houses ----------

export async function houses() {
  return sql<House>("SELECT * FROM houses ORDER BY active DESC, lower(name), lower(address)");
}

export async function getHouse(id: number) {
  return one<House>("SELECT * FROM houses WHERE id = $1", [id]);
}

// ---------- routes ----------

export async function deliveryRoutes(): Promise<DeliveryRoute[]> {
  const [routes, members, slots] = await Promise.all([
    sql<Omit<DeliveryRoute, "houses" | "slots">>("SELECT * FROM delivery_routes ORDER BY active DESC, lower(name)"),
    sql<House & { route_id: number; meals: string[] }>(
      "SELECT h.*, rh.route_id, rh.meals FROM route_houses rh JOIN houses h ON h.id = rh.house_id ORDER BY rh.position, h.id",
    ),
    sql<RouteSlot & { route_id: number }>("SELECT * FROM route_slots"),
  ]);
  return routes.map((r) => ({
    ...r,
    houses: members.filter((m) => m.route_id === r.id),
    slots: slots.filter((s) => s.route_id === r.id).map(({ weekday, meal, driver_id, skip }) => ({ weekday, meal, driver_id, skip })),
  }));
}

export async function getDeliveryRoute(id: number) {
  return (await deliveryRoutes()).find((r) => r.id === id);
}

/** Drivers already assigned on other routes, per weekday + meal (for clash warnings). */
export function takenSlots(routes: DeliveryRoute[], exceptRouteId?: number) {
  return routes
    .filter((r) => r.id !== exceptRouteId && r.active)
    .flatMap((r) => r.slots.filter((s) => s.driver_id).map((s) => ({ route_id: r.id, route_name: r.name, weekday: s.weekday, meal: s.meal, driver_id: s.driver_id! })));
}

/** Houses that go on a route's delivery for one day + meal, in order. */
export function slotHouses(route: DeliveryRoute, slot: RouteSlot) {
  return route.houses.filter((h) => h.active && h.meals.includes(slot.meal) && !slot.skip.includes(h.id));
}

/** The route's driver: the driver assigned to most of its shifts. */
export function routeDriverId(route: DeliveryRoute): number | null {
  const counts = new Map<number, number>();
  for (const s of route.slots) if (s.driver_id) counts.set(s.driver_id, (counts.get(s.driver_id) ?? 0) + 1);
  let best: number | null = null, bestN = 0;
  for (const [id, n] of counts) if (n > bestN) { best = id; bestN = n; }
  return best;
}

/** Weekdays (0-6) this route delivers: a shift with a driver and at least one house on. */
export function routeDeliveryWeekdays(route: DeliveryRoute): number[] {
  const out: number[] = [];
  for (let wd = 0; wd < 7; wd++) {
    if (route.slots.some((s) => s.weekday === wd && s.driver_id && slotHouses(route, s).length > 0)) out.push(wd);
  }
  return out;
}

// ---------- day runs ----------

const RUN_SELECT = `
  SELECT r.*, u.name AS driver_name, u.active AS driver_active
  FROM runs r LEFT JOIN users u ON u.id = r.driver_id`;

const mealOrder = (m: string) => MEALS.indexOf(m as any);
const sortRuns = (runs: Run[]) =>
  runs.sort((a, b) => a.run_date.localeCompare(b.run_date) || mealOrder(a.meal) - mealOrder(b.meal) || a.name.localeCompare(b.name));

/**
 * Creates the day's runs from the house schedules. Runs are frozen copies, so later changes never alter
 * past or completed days. Only today and future days are generated.
 */
export async function ensureRuns(date: string) {
  if (date < (await today())) return;
  const wd = weekdayOf(date);
  const routes = (await deliveryRoutes()).filter((r) => r.active && r.slots.some((s) => s.weekday === wd));
  if (!routes.length) return;
  const dishes = await dishTypes(true);
  const overrides = await sql<{ route_key: string; driver_id: number }>("SELECT route_key, driver_id FROM run_overrides WHERE run_date = $1", [date]);
  for (const r of routes)
    for (const slot of r.slots.filter((s) => s.weekday === wd)) {
      const key = routeKey(r.id, wd, slot.meal);
      const driverId = overrides.find((o) => o.route_key === key)?.driver_id ?? slot.driver_id;
      const stops = slotHouses(r, slot);
      if (!driverId || !stops.length) continue;
      await sql(
        `INSERT INTO runs (run_date, route_key, name, meal, driver_id, pay_cents, stops)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (route_key, run_date) WHERE route_key IS NOT NULL DO NOTHING`,
        [date, key, r.name, slot.meal, driverId, r.pay_cents, JSON.stringify(freezeStops(stops, dishes))],
      );
    }
}

/** After houses or routes change, drop untouched upcoming runs so they regenerate. */
export async function refreshRuns() {
  await sql(
    "DELETE FROM runs WHERE route_key IS NOT NULL AND run_date >= $1 AND status = 'pending' AND NOT customized",
    [await today()],
  );
}

export async function runsForDate(date: string) {
  await ensureRuns(date);
  return sortRuns(await sql<Run>(`${RUN_SELECT} WHERE r.run_date = $1`, [date]));
}

export async function driverRunsForDate(driverId: number, date: string) {
  await ensureRuns(date);
  return sortRuns(
    await sql<Run>(`${RUN_SELECT} WHERE r.run_date = $1 AND r.driver_id = $2 AND r.status <> 'cancelled'`, [date, driverId]),
  );
}

export async function getRun(id: number) {
  return one<Run>(`${RUN_SELECT} WHERE r.id = $1`, [id]);
}

// ---------- earnings ----------

export type WeekEarnings = {
  start: string;
  total: number;
  count: number;
  days: { date: string; total: number; runs: Run[] }[];
};

/** Completed runs in the pay week (Fri–Thu) starting at `start`. */
export async function weekEarnings(driverId: number, start: string): Promise<WeekEarnings> {
  const dates = weekDates(start);
  const runs = sortRuns(
    await sql<Run>(
      `${RUN_SELECT} WHERE r.driver_id = $1 AND r.status = 'completed' AND r.run_date >= $2 AND r.run_date <= $3`,
      [driverId, dates[0], dates[6]],
    ),
  );
  const days = dates.map((date) => {
    const dayRuns = runs.filter((r) => r.run_date === date);
    return { date, runs: dayRuns, total: dayRuns.reduce((n, r) => n + r.pay_cents, 0) };
  });
  return { start, days, total: runs.reduce((n, r) => n + r.pay_cents, 0), count: runs.length };
}

export async function allDriversWeek(start: string) {
  const dates = weekDates(start);
  return sql<{ id: number; name: string; active: boolean; total: number; count: number }>(
    `SELECT u.id, u.name, u.active,
            COALESCE(SUM(r.pay_cents), 0)::int AS total, COUNT(r.id)::int AS count
     FROM users u
     LEFT JOIN runs r ON r.driver_id = u.id AND r.status = 'completed' AND r.run_date >= $1 AND r.run_date <= $2
     WHERE u.is_driver
     GROUP BY u.id ORDER BY u.active DESC, u.name`,
    [dates[0], dates[6]],
  );
}
