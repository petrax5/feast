import { notFound } from "next/navigation";
import { one } from "@/lib/db";
import { today, weekEarnings } from "@/lib/data";
import { isDate, weekStartOf } from "@/lib/core";
import { TopBar } from "@/components/chrome";
import { WeekEarningsView, WeekNav } from "@/components/week";

export default async function DriverPay({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ week?: string }> }) {
  const id = Number((await params).id);
  const { week } = await searchParams;
  const driver = await one<{ id: number; name: string }>("SELECT id, name FROM users WHERE id = $1 AND is_driver", [id]);
  if (!driver) notFound();
  const current = weekStartOf(await today());
  const start = isDate(week) ? weekStartOf(week) : current;
  const data = await weekEarnings(id, start);
  return (
    <>
      <TopBar title={driver.name} sub="Earnings" back={`/admin/pay?week=${start}`} />
      <main className="mx-auto max-w-xl px-4 space-y-4">
        <WeekNav start={start} current={current} href={(w) => `/admin/pay/${id}?week=${w}`} />
        <WeekEarningsView week={data} pdfHref={`/api/report?driver=${id}&week=${start}`} />
      </main>
    </>
  );
}
