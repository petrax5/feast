import { notFound } from "next/navigation";
import { dishTypes, drivers, getRun } from "@/lib/data";
import { formatDate, unfreezeStops } from "@/lib/core";
import { TopBar } from "@/components/chrome";
import { ActionButton } from "@/components/ui";
import { RouteForm } from "../../route-form";
import { deleteRunAction, saveRunAction } from "../../actions";

export default async function EditRun({ params }: { params: Promise<{ id: string }> }) {
  const run = await getRun(Number((await params).id));
  if (!run) notFound();
  const [ds, dishes] = await Promise.all([drivers(), dishTypes(true)]);
  const day = formatDate(run.run_date, { weekday: "long", month: "long", day: "numeric" });
  return (
    <>
      <TopBar title={run.name} sub={run.route_id || run.route_key ? `Changes only affect ${day}` : `One-off route · ${day}`} back={`/admin?date=${run.run_date}`} />
      <main className="mx-auto max-w-xl px-4 space-y-4">
        <RouteForm
          action={saveRunAction}
          date={run.run_date}
          drivers={ds}
          dishes={dishes.filter((d) => d.active || run.stops.some((s) => s.items.some((i) => i.name === d.name)))}
          initial={{ id: run.id, name: run.name, meal: run.meal, driver_id: run.driver_id, pay: (run.pay_cents / 100).toFixed(2), stops: unfreezeStops(run.stops, dishes) }}
        />
        <ActionButton
          action={deleteRunAction.bind(null, run.id)}
          confirm={run.route_id || run.route_key ? `Cancel this route for ${day} only?` : "Delete this one-off route?"}
          className="btn-ghost w-full text-danger"
        >
          {run.route_id || run.route_key ? "Cancel for this day" : "Delete route"}
        </ActionButton>
      </main>
    </>
  );
}
