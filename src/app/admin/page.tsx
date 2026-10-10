import Link from "next/link";
import { runsForDate, today } from "@/lib/data";
import { addDays, formatDate, isDate, MEAL_LABEL, money } from "@/lib/core";
import { TopBar, SignOut, Empty, ModeSwitch } from "@/components/chrome";
import { requireAdmin } from "@/lib/auth";
import { Specials } from "@/components/stops";
import { RunAdminActions } from "./run-actions";
import { DatePicker } from "./date-picker";

const STATUS: Record<string, React.ReactNode> = {
  pending: <span className="chip-muted">Not started</span>,
  started: <span className="chip-special">In progress</span>,
  completed: <span className="chip-done">Completed</span>,
  cancelled: <span className="chip bg-red-50 text-danger">Cancelled</span>,
};

export default async function AdminDay({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const me = await requireAdmin();
  const { date: q } = await searchParams;
  const now = await today();
  const date = isDate(q) ? q : now;
  const runs = await runsForDate(date);
  const active = runs.filter((r) => r.status !== "cancelled");
  const done = active.filter((r) => r.status === "completed").length;
  const label = date === now ? "Today" : date === addDays(now, 1) ? "Tomorrow" : date === addDays(now, -1) ? "Yesterday" : formatDate(date, { weekday: "long" });

  return (
    <>
      <TopBar logo title={label} sub={formatDate(date, { weekday: "long", month: "long", day: "numeric", year: "numeric" })} right={<SignOut />}
        below={me.is_driver ? <ModeSwitch mode="admin" /> : undefined} />
      <main className="mx-auto max-w-xl px-4 space-y-4">
        <div className="flex items-center gap-2">
          <Link href={`/admin?date=${addDays(date, -1)}`} className="btn-ghost btn-sm w-10 px-0" aria-label="Previous day">‹</Link>
          <DatePicker date={date} />
          <Link href={`/admin?date=${addDays(date, 1)}`} className="btn-ghost btn-sm w-10 px-0" aria-label="Next day">›</Link>
          {date !== now && <Link href="/admin" className="btn-ghost btn-sm">Today</Link>}
        </div>

        {active.length > 0 && (
          <p className="text-sm font-medium text-muted px-1">{done} of {active.length} routes completed</p>
        )}

        {runs.length === 0 && <Empty>No routes on this day.</Empty>}

        {runs.map((r) => (
          <section key={r.id} className={`card p-5 space-y-3 ${r.status === "cancelled" ? "opacity-60" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold uppercase tracking-wide text-brand-ink">
                  {MEAL_LABEL[r.meal]}{!r.route_id && !r.route_key ? " · One-off" : r.customized ? " · Edited for this day" : ""}
                </p>
                <h2 className="text-lg font-bold tracking-tight">{r.name}</h2>
                <p className="text-sm text-muted">
                  {r.driver_name ?? <span className="text-danger font-medium">No driver assigned</span>}
                  {r.driver_name && r.driver_active === false && <span className="text-danger font-medium"> · driver inactive</span>}
                </p>
              </div>
              <div className="text-right shrink-0 space-y-1">
                <p className="font-bold tabular-nums">{money(r.pay_cents)}</p>
                {STATUS[r.status]}
              </div>
            </div>
            <Specials stops={r.stops} />
            <RunAdminActions id={r.id} status={r.status} />
          </section>
        ))}

        <Link href={`/admin/runs/new?date=${date}`} className="btn-primary w-full">+ Add a route just for this day</Link>
      </main>
    </>
  );
}
