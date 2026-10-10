import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { driverRunsForDate, today } from "@/lib/data";
import { formatDate, MEAL_LABEL } from "@/lib/core";
import { TopBar, SignOut, Empty, ModeSwitch } from "@/components/chrome";
import { DriverRun } from "./driver-run";

export const dynamic = "force-dynamic";

export default async function DriverToday() {
  const user = await requireUser();
  if (!user.is_driver) redirect("/admin");
  const date = await today();
  const runs = await driverRunsForDate(user.id, date);
  const left = runs.filter((r) => r.status !== "completed").length;

  return (
    <>
      <TopBar
        logo
        title={`Hi, ${user.name.split(" ")[0]}`}
        sub={formatDate(date, { weekday: "long", month: "long", day: "numeric" })}
        right={<SignOut />}
        below={user.is_admin ? <ModeSwitch mode="driver" /> : undefined}
      />
      <main className="mx-auto max-w-xl px-4 pb-32 space-y-4">
        {runs.length === 0 ? (
          <Empty>No routes for you today.</Empty>
        ) : (
          <>
            <p className="text-sm font-medium text-muted px-1">
              {left === 0 ? "All routes done today. Nice work!" : `${left} of ${runs.length} ${runs.length === 1 ? "route" : "routes"} left`}
            </p>
            {runs.map((r) => (
              <DriverRun key={r.id} run={r} mapsApp={user.maps_app} mealLabel={MEAL_LABEL[r.meal]} />
            ))}
          </>
        )}
      </main>
      <nav className="fixed bottom-0 inset-x-0 bg-bg/95 backdrop-blur border-t border-line pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-xl px-4 py-3">
          <div className="grid grid-cols-2 gap-2">
            <Link href="/schedule" className="btn-ghost">My schedule</Link>
            <Link href="/earnings" className="btn-ghost">My earnings</Link>
          </div>
        </div>
      </nav>
    </>
  );
}
