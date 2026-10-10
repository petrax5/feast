import Link from "next/link";
import { addDays, formatDate, formatWeek, money, MEAL_LABEL } from "@/lib/core";
import type { WeekEarnings } from "@/lib/data";

export function WeekNav({ start, current, href }: { start: string; current: string; href: (week: string) => string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Link href={href(addDays(start, -7))} className="btn-ghost btn-sm w-10 px-0" aria-label="Previous week">‹</Link>
      <div className="text-center">
        <p className="font-semibold">{formatWeek(start)}</p>
        <p className="text-xs text-muted">{start === current ? "This week · Fri–Thu" : "Fri–Thu"}</p>
      </div>
      <Link
        href={href(addDays(start, 7))}
        aria-label="Next week"
        className={`btn-ghost btn-sm w-10 px-0 ${start >= current ? "pointer-events-none opacity-30" : ""}`}
      >
        ›
      </Link>
    </div>
  );
}

export function WeekEarningsView({ week, pdfHref }: { week: WeekEarnings; pdfHref: string }) {
  const worked = week.days.filter((d) => d.runs.length);
  return (
    <div className="space-y-4">
      <div className="card p-5">
        <p className="text-sm font-medium text-muted">Total for the week</p>
        <p className="text-4xl font-bold tracking-tight tabular-nums mt-1">{money(week.total)}</p>
        <p className="text-sm text-muted mt-1">
          {week.count} completed {week.count === 1 ? "route" : "routes"} · {worked.length} {worked.length === 1 ? "day" : "days"}
        </p>
        <a href={pdfHref} target="_blank" rel="noopener" className="btn-dark w-full mt-4">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 3v12m0 0-5-5m5 5 5-5M5 21h14" /></svg>
          Download weekly report (PDF)
        </a>
      </div>

      {week.days.map((d) => (
        <div key={d.date} className={`card overflow-hidden ${d.runs.length ? "" : "opacity-60"}`}>
          <div className="flex items-center justify-between px-5 py-3.5">
            <p className="font-semibold">{formatDate(d.date, { weekday: "long", month: "short", day: "numeric" })}</p>
            <p className="font-bold tabular-nums">{money(d.total)}</p>
          </div>
          {d.runs.length > 0 && (
            <ul className="border-t border-line divide-y divide-line">
              {d.runs.map((r) => (
                <li key={r.id} className="flex items-center justify-between px-5 py-3 text-[15px]">
                  <span className="min-w-0 truncate">
                    <span className="text-muted">{MEAL_LABEL[r.meal]} · </span>{r.name}
                  </span>
                  <span className="tabular-nums font-medium">{money(r.pay_cents)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
