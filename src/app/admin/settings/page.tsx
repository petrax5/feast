import { dishTypes, timeZone } from "@/lib/data";
import { TopBar, SignOut } from "@/components/chrome";
import { DishTypesForm, PasswordForm, TimeZoneForm } from "./forms";

export default async function SettingsPage() {
  const [dishes, tz] = await Promise.all([dishTypes(true), timeZone()]);
  return (
    <>
      <TopBar title="Settings" right={<SignOut />} />
      <main className="mx-auto max-w-xl px-4 space-y-4">
        <DishTypesForm dishes={dishes} />
        <TimeZoneForm tz={tz} zones={Intl.supportedValuesOf("timeZone")} />
        <PasswordForm />
      </main>
    </>
  );
}
