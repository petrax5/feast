import { TopBar } from "@/components/chrome";
import { DriverForm } from "../driver-form";

export default function NewDriver() {
  return (
    <>
      <TopBar title="New driver" back="/admin/drivers" />
      <main className="mx-auto max-w-xl px-4">
        <DriverForm initial={{ name: "", username: "", phone: "", has_password: false, active: true, is_admin: false }} />
      </main>
    </>
  );
}
