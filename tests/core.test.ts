import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addDays, freezeStops, googleLegs, isDate, parseMoney, runTotals, todayIn, unfreezeStops, weekDates, weekStartOf, weekdayOf,
} from "../src/lib/core.ts";

test("pay week runs Friday to Thursday", () => {
  assert.equal(weekdayOf("2026-10-09"), 5); // a Friday
  assert.equal(weekStartOf("2026-10-09"), "2026-10-09");
  assert.equal(weekStartOf("2026-10-15"), "2026-10-09"); // Thursday → same week
  assert.equal(weekStartOf("2026-10-16"), "2026-10-16"); // next Friday
  assert.equal(weekStartOf("2026-10-12"), "2026-10-09"); // Monday
  assert.deepEqual(weekDates("2026-10-09").slice(-1), ["2026-10-15"]);
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
});

test("today follows the kitchen time zone", () => {
  const late = new Date("2026-10-10T03:30:00Z"); // still Oct 9 evening in New York
  assert.equal(todayIn("America/New_York", late), "2026-10-09");
  assert.equal(todayIn("UTC", late), "2026-10-10");
});

test("dates and money parse strictly", () => {
  assert.ok(isDate("2026-02-28"));
  assert.ok(!isDate("2026-02-30"));
  assert.ok(!isDate("tomorrow"));
  assert.equal(parseMoney("45"), 4500);
  assert.equal(parseMoney("$45.5"), 4550);
  assert.equal(parseMoney("1,200.99"), 120099);
  assert.equal(parseMoney("-3"), null);
  assert.equal(parseMoney("abc"), null);
});

test("stops freeze with dish names and totals count specials", () => {
  const dishes = [
    { id: 1, name: "Regular", is_default: true, sort: 0, active: true },
    { id: 2, name: "Vegan", is_default: false, sort: 1, active: true },
  ];
  const frozen = freezeStops(
    [
      { name: "Smith", address: "1 Main St", items: { 1: 3, 2: 1 } },
      { name: "", address: "2 Oak Ave", items: { 2: 2 } },
    ],
    dishes,
  );
  assert.deepEqual(frozen[0].items, [
    { name: "Regular", qty: 3, special: false },
    { name: "Vegan", qty: 1, special: true },
  ]);
  assert.deepEqual(runTotals(frozen), { stops: 2, meals: 6, specials: [{ name: "Vegan", qty: 3 }] });
  assert.deepEqual(unfreezeStops(frozen, dishes)[0].items, { 1: 3, 2: 1 });
});

test("google maps links keep order and split every 10 houses", () => {
  const addrs = Array.from({ length: 23 }, (_, i) => `${i + 1} Main St`);
  const legs = googleLegs(addrs);
  assert.equal(legs.length, 3);
  const first = new URL(legs[0]).searchParams;
  assert.equal(first.get("destination"), "10 Main St");
  assert.deepEqual(first.get("waypoints")!.split("|"), addrs.slice(0, 9));
  const last = new URL(legs[2]).searchParams;
  assert.equal(last.get("destination"), "23 Main St");
  assert.deepEqual(last.get("waypoints")!.split("|"), ["21 Main St", "22 Main St"]);
  assert.equal(new URL(googleLegs(["Only one"])[0]).searchParams.get("waypoints"), null);
});

test("route keys and next weekday", async () => {
  const { routeKey, nextWeekday, houseTotal } = await import("../src/lib/core.ts");
  assert.equal(routeKey(12, 1, "lunch"), "r12-1-lunch");
  assert.equal(nextWeekday("2026-10-09", 5), "2026-10-09");
  assert.equal(nextWeekday("2026-10-09", 1), "2026-10-12");
  assert.equal(houseTotal({ 1: 10, 2: 2, 3: 1 }), 13);
});

test("google maps app links chain all stops with +to:", async () => {
  const { googleAppLegs } = await import("../src/lib/core.ts");
  const legs = googleAppLegs(["1 Main St, A", "2 Oak Ave, B", "3 Pine Rd, C"]);
  assert.equal(legs.length, 1);
  assert.equal(legs[0], "comgooglemaps://?daddr=1%20Main%20St%2C%20A+to:2%20Oak%20Ave%2C%20B+to:3%20Pine%20Rd%2C%20C&directionsmode=driving");
  assert.equal(googleAppLegs(Array.from({ length: 12 }, (_, i) => `${i}`)).length, 2);
});
