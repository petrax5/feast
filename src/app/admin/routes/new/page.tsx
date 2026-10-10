import { deliveryRoutes, drivers, houses, takenSlots } from "@/lib/data";
import { TopBar } from "@/components/chrome";
import { requireAdmin } from "@/lib/auth";
import { RouteCreateForm } from "../route-create-form";

export default async function NewRoute() {
  await requireAdmin();
  const [routes, hs, ds] = await Promise.all([deliveryRoutes(), houses(), drivers()]);
  return (
    <>
      <TopBar title="New route" sub="Pick the houses — days and meals come from their schedules." back="/admin/routes" />
      <main className="mx-auto max-w-xl px-4">
        <RouteCreateForm
          houses={hs.filter((h) => h.active).map((h) => ({ id: h.id, name: h.name, address: h.address, schedule: h.schedule ?? {} }))}
          drivers={ds.map((d) => ({ id: d.id, name: d.name, active: d.active }))}
          taken={takenSlots(routes)}
        />
      </main>
    </>
  );
}
