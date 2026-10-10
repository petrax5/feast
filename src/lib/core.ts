// Pure helpers shared by server and client code (no database access here).

export const MEALS = ["breakfast", "lunch", "dinner"] as const;
export type Meal = (typeof MEALS)[number];
export const MEAL_LABEL: Record<string, string> = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner" };

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
/** Pay weeks run Friday to Thursday. */
export const WEEK_START = 5;
/** Weekdays listed in pay-week order (Fri first). */
export const WEEK_ORDER = Array.from({ length: 7 }, (_, i) => (WEEK_START + i) % 7);

export type MapsApp = "google" | "apple";
export type RunStatus = "pending" | "started" | "completed" | "cancelled";

/** Stop as stored on a route template: quantities keyed by dish type id. */
export type TemplateStop = { name: string; address: string; items: Record<string, number>; notes?: string };
/** Stop as stored on a day's run: a frozen copy with dish names. */
export type RunStop = { name: string; address: string; items: { name: string; qty: number; special: boolean }[]; notes?: string };

export type DishType = { id: number; name: string; is_default: boolean; sort: number; active: boolean };

// ---------- dates (all dates are "YYYY-MM-DD" strings in the kitchen's time zone) ----------

export function todayIn(timeZone: string, now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

function toUTC(date: string) {
  return new Date(date + "T12:00:00Z");
}

export function weekdayOf(date: string): number {
  return toUTC(date).getUTCDay();
}

export function addDays(date: string, days: number): string {
  const d = toUTC(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function weekStartOf(date: string): string {
  return addDays(date, -((weekdayOf(date) - WEEK_START + 7) % 7));
}

export function weekDates(start: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function isDate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(toUTC(s).getTime()) && toUTC(s).toISOString().slice(0, 10) === s;
}

export function formatDate(date: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" }) {
  return toUTC(date).toLocaleDateString("en-US", { timeZone: "UTC", ...opts });
}

export function formatWeek(start: string) {
  const end = addDays(start, 6);
  return `${formatDate(start, { month: "short", day: "numeric" })} – ${formatDate(end, { month: "short", day: "numeric", year: "numeric" })}`;
}

// ---------- money ----------

export function money(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

/** "12", "12.5", "$12.50" → 1250. Returns null when invalid. */
export function parseMoney(input: unknown): number | null {
  const s = String(input ?? "").replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  return Math.round(parseFloat(s) * 100);
}

// ---------- stops ----------

export function freezeStops(stops: TemplateStop[], dishes: DishType[]): RunStop[] {
  const sorted = [...dishes].sort((a, b) => a.sort - b.sort || a.id - b.id);
  return stops.map((s) => ({
    name: s.name,
    address: s.address,
    notes: s.notes || undefined,
    items: sorted
      .map((d) => ({ name: d.name, qty: Number(s.items?.[d.id] ?? 0), special: !d.is_default }))
      .filter((i) => i.qty > 0),
  }));
}

export function stopTotal(stop: RunStop) {
  return stop.items.reduce((n, i) => n + i.qty, 0);
}

export function runTotals(stops: RunStop[]) {
  const specials = new Map<string, number>();
  let meals = 0;
  for (const s of stops)
    for (const i of s.items) {
      meals += i.qty;
      if (i.special) specials.set(i.name, (specials.get(i.name) ?? 0) + i.qty);
    }
  return { stops: stops.length, meals, specials: [...specials].map(([name, qty]) => ({ name, qty })) };
}

// ---------- maps ----------

/** Google Maps links accept 9 waypoints + destination, so long routes are split into legs of 10 stops. */
export const GOOGLE_LEG = 10;

export function googleLegs(addresses: string[]): string[] {
  const legs: string[] = [];
  for (let i = 0; i < addresses.length; i += GOOGLE_LEG) {
    const chunk = addresses.slice(i, i + GOOGLE_LEG);
    const destination = chunk[chunk.length - 1];
    const waypoints = chunk.slice(0, -1);
    const p = new URLSearchParams({ api: "1", destination, travelmode: "driving" });
    if (waypoints.length) p.set("waypoints", waypoints.join("|"));
    legs.push("https://www.google.com/maps/dir/?" + p.toString());
  }
  return legs;
}

/**
 * Same legs for the Google Maps iPhone app (comgooglemaps://), which keeps every stop in order:
 * "daddr=A+to:B+to:C". The web link above drops the stops when it opens in a browser.
 */
export function googleAppLegs(addresses: string[]): string[] {
  const legs: string[] = [];
  for (let i = 0; i < addresses.length; i += GOOGLE_LEG) {
    const chunk = addresses.slice(i, i + GOOGLE_LEG).map((a) => encodeURIComponent(a));
    legs.push(`comgooglemaps://?daddr=${chunk.join("+to:")}&directionsmode=driving`);
  }
  return legs;
}

export function googleStop(address: string) {
  return "https://www.google.com/maps/dir/?" + new URLSearchParams({ api: "1", destination: address, travelmode: "driving" });
}

export function appleStop(address: string) {
  return "https://maps.apple.com/?" + new URLSearchParams({ daddr: address, dirflg: "d" });
}

export function stopLink(app: MapsApp, address: string) {
  return app === "apple" ? appleStop(address) : googleStop(address);
}

export function isTimeZone(tz: string) {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Turns a day's frozen stops back into editable form, matching dishes by name. */
export function unfreezeStops(stops: RunStop[], dishes: DishType[]): TemplateStop[] {
  return stops.map((s) => {
    const items: Record<string, number> = {};
    for (const i of s.items) {
      const d = dishes.find((x) => x.name.toLowerCase() === i.name.toLowerCase());
      if (d) items[d.id] = (items[d.id] ?? 0) + i.qty;
    }
    return { name: s.name, address: s.address, items, notes: s.notes };
  });
}

// ---------- routes built from houses ----------

/** One delivery of a route: route 12 on Mondays at lunch is "r12-1-lunch". */
export function routeKey(routeId: number, weekday: number, meal: string) {
  return `r${routeId}-${weekday}-${meal}`;
}

/** Compact summary of a house's weekly schedule: "every day", "Mon–Fri", "Sat–Sun", "Mon, Wed, Fri", or "" when none. */
export function scheduleSummary(schedule: Record<string, string[]> | undefined | null): string {
  const days = Object.keys(schedule ?? {})
    .map(Number)
    .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6 && ((schedule as Record<string, string[]>)[String(d)] ?? []).length > 0)
    .sort((a, b) => a - b);
  if (!days.length) return "";
  if (days.length === 7) return "every day";
  if (days.length === 2 && days[0] === 0 && days[1] === 6) return "Sat–Sun";
  const consecutive = days.every((d, i) => i === 0 || d === days[i - 1] + 1);
  if (consecutive) return days.length === 1 ? WEEKDAYS[days[0]] : `${WEEKDAYS[days[0]]}–${WEEKDAYS[days[days.length - 1]]}`;
  return days.map((d) => WEEKDAYS[d]).join(", ");
}

export function houseTotal(items: Record<string, number>) {
  return Object.values(items).reduce((n, q) => n + (Number(q) || 0), 0);
}

/** Next date (today included) that falls on `weekday`. */
export function nextWeekday(from: string, weekday: number) {
  return addDays(from, (weekday - weekdayOf(from) + 7) % 7);
}

export const WEEKDAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
