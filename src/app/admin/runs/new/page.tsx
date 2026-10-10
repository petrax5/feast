import { dishTypes, drivers, today } from "@/lib/data";
import { formatDate, isDate } from "@/lib/core";
import { TopBar } from "@/components/chrome";
import { RouteForm } from "../../route-form";
import { saveRunAction } from "../../actions";

export default async function NewRun({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date: q } = await searchParams;
  const date = isDate(q) ? q : await today();
  const [ds, dishes] = await Promise.all([drivers(), dishTypes()]);
  return (
    <>
      <TopBar title="Route for one day" sub={formatDate(date, { weekday: "long", month: "long", day: "numeric" })} back={`/admin?date=${date}`} />
      <main className="mx-auto max-w-xl px-4">
        <RouteForm action={saveRunAction} date={date} drivers={ds} dishes={dishes} initial={{ name: "", meal: "lunch", driver_id: null, pay: "", stops: [] }} />
      </main>
    </>
  );
}
