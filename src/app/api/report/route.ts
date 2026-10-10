import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { currentUser } from "@/lib/auth";
import { one } from "@/lib/db";
import { today, weekEarnings } from "@/lib/data";
import { addDays, formatDate, formatWeek, isDate, money, MEAL_LABEL, runTotals, weekStartOf } from "@/lib/core";

export const dynamic = "force-dynamic";

// Weekly pay report. Drivers get their own; the admin passes ?driver=<id>.
export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const params = new URL(req.url).searchParams;
  const week = params.get("week");
  const start = isDate(week) ? weekStartOf(week) : weekStartOf(await today());
  // Admins can download anyone's report with ?driver=; without it, it's your own.
  const driverId = user.is_admin && params.get("driver") ? Number(params.get("driver")) : user.id;
  const driver = await one<{ id: number; name: string }>("SELECT id, name FROM users WHERE id = $1 AND is_driver", [driverId]);
  if (!driver) return new Response("Driver not found", { status: 404 });
  const data = await weekEarnings(driver.id, start);

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.09, 0.08, 0.06), muted = rgb(0.43, 0.42, 0.39), line = rgb(0.88, 0.87, 0.84);
  const W = 612, H = 792, M = 48;
  let page = pdf.addPage([W, H]);
  let y = H - M;

  // Standard PDF fonts only cover Latin-1, so anything else (e.g. emoji in a name) becomes "?".
  const safe = (s: string) => s.replace(/[^\x20-\x7E\xA0-\xFF–—…‘’“”]/g, "?");
  const text = (s: string, x: number, size = 10, f = font, color = ink) => page.drawText(safe(s), { x, y, size, font: f, color });
  const right = (s: string, x: number, size = 10, f = font, color = ink) =>
    page.drawText(safe(s), { x: x - f.widthOfTextAtSize(safe(s), size), y, size, font: f, color });
  const fit = (s: string, max: number, size = 10) => {
    s = safe(s);
    while (s.length > 1 && font.widthOfTextAtSize(s, size) > max) s = s.slice(0, -2) + "…";
    return s;
  };
  const ensure = (h: number) => {
    if (y - h < M) { page = pdf.addPage([W, H]); y = H - M; }
  };

  // Logo in the corner (skipped if it can't be loaded).
  try {
    const png = await pdf.embedPng(await (await fetch(new URL("/logo.png", req.url))).arrayBuffer());
    const w = 120, h = (png.height / png.width) * w;
    page.drawImage(png, { x: W - M - w, y: y - h + 14, width: w, height: h });
  } catch {}
  text("Weekly pay report", M, 20, bold);
  y -= 24;
  text(`${driver.name}  ·  ${formatWeek(start)} (Fri–Thu)`, M, 11, font, muted);
  y -= 34;
  text("Total", M, 11, font, muted);
  right(money(data.total), W - M, 22, bold);
  y -= 16;
  text(`${data.count} completed ${data.count === 1 ? "route" : "routes"}`, M, 10, font, muted);
  y -= 28;

  // Column headers
  const cols = { meal: M + 110, route: M + 175, houses: W - M - 120, pay: W - M };
  text("Day", M, 9, bold, muted);
  text("Meal", cols.meal, 9, bold, muted);
  text("Route", cols.route, 9, bold, muted);
  right("Houses / meals", cols.houses, 9, bold, muted);
  right("Pay", cols.pay, 9, bold, muted);
  y -= 8;
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 1, color: line });
  y -= 16;

  for (const d of data.days) {
    ensure(18 * (d.runs.length + 1) + 10);
    const label = formatDate(d.date, { weekday: "short", month: "short", day: "numeric" });
    if (!d.runs.length) {
      text(label, M, 10, font, muted);
      right("—", cols.pay, 10, font, muted);
      y -= 18;
    }
    d.runs.forEach((r, i) => {
      const t = runTotals(r.stops);
      if (i === 0) text(label, M, 10, bold);
      text(MEAL_LABEL[r.meal] ?? r.meal, cols.meal, 10);
      text(fit(r.name, cols.houses - cols.route - 90), cols.route, 10);
      right(`${t.stops} / ${t.meals}`, cols.houses, 10, font, muted);
      right(money(r.pay_cents), cols.pay, 10);
      y -= 18;
    });
    if (d.runs.length > 1) {
      right(`Day total ${money(d.total)}`, cols.pay, 9, bold, muted);
      y -= 16;
    }
    page.drawLine({ start: { x: M, y: y + 6 }, end: { x: W - M, y: y + 6 }, thickness: 0.5, color: line });
    y -= 8;
  }

  ensure(30);
  y -= 10;
  text("Week total", M, 12, bold);
  right(money(data.total), cols.pay, 12, bold);
  y -= 30;
  text(`Generated ${formatDate(await today(), { month: "short", day: "numeric", year: "numeric" })}`, M, 8, font, muted);

  const bytes = await pdf.save();
  const file = `pay-${driver.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${start}-to-${addDays(start, 6)}.pdf`;
  return new Response(new Uint8Array(bytes), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${file}"` },
  });
}
