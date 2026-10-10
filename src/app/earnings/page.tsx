import { requireDriver } from "@/lib/auth";
import { today, weekEarnings } from "@/lib/data";
import { isDate, weekStartOf } from "@/lib/core";
import { TopBar } from "@/components/chrome";
import { WeekEarningsView, WeekNav } from "@/components/week";

export const dynamic = "force-dynamic";

export default async function EarningsPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const driver = await requireDriver();
  const { week } = await searchParams;
  const current = weekStartOf(await today());
  const start = isDate(week) ? weekStartOf(week) : current;
  const data = await weekEarnings(driver.id, start);
  return (
    <>
      <TopBar title="My earnings" back="/" />
      <main className="mx-auto max-w-xl px-4 pb-16 space-y-4">
        <WeekNav start={start} current={current} href={(w) => `/earnings?week=${w}`} />
        <WeekEarningsView week={data} pdfHref={`/api/report?week=${start}`} />
      </main>
    </>
  );
}
