import Link from "next/link";
import { allDriversWeek, today } from "@/lib/data";
import { isDate, money, weekStartOf } from "@/lib/core";
import { TopBar, Empty } from "@/components/chrome";
import { WeekNav } from "@/components/week";

export default async function PayPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const { week } = await searchParams;
  const current = weekStartOf(await today());
  const start = isDate(week) ? weekStartOf(week) : current;
  const rows = await allDriversWeek(start);
  const total = rows.reduce((n, r) => n + r.total, 0);
  return (
    <>
      <TopBar title="Weekly pay" />
      <main className="mx-auto max-w-xl px-4 space-y-4">
        <WeekNav start={start} current={current} href={(w) => `/admin/pay?week=${w}`} />
        <div className="card p-5">
          <p className="text-sm font-medium text-muted">All drivers</p>
          <p className="text-4xl font-bold tracking-tight tabular-nums mt-1">{money(total)}</p>
        </div>
        {rows.length === 0 ? (
          <Empty>No drivers yet.</Empty>
        ) : (
          <div className="card overflow-hidden divide-y divide-line">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-5 py-4">
                <Link href={`/admin/pay/${r.id}?week=${start}`} className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{r.name}{!r.active && <span className="text-muted font-normal"> · inactive</span>}</p>
                  <p className="text-sm text-muted">{r.count} routes · see breakdown</p>
                </Link>
                <p className="font-bold tabular-nums">{money(r.total)}</p>
                <a href={`/api/report?driver=${r.id}&week=${start}`} target="_blank" rel="noopener" className="btn-ghost btn-sm" aria-label={`Download PDF for ${r.name}`}>PDF</a>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
