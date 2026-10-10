"use client";

import { useActionState } from "react";
import { FormMessage, Submit } from "@/components/ui";
import { saveDriverAction } from "../actions";

type Values = { id?: number; name: string; username: string; phone: string; has_password: boolean; active: boolean; is_admin: boolean };

export function DriverForm({ initial, isSelf = false }: { initial: Values; isSelf?: boolean }) {
  const [state, action] = useActionState(saveDriverAction, undefined);
  return (
    <form action={action} className="space-y-5">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <div className="card p-5 space-y-4">
        <div>
          <label className="label" htmlFor="name">Name</label>
          <input id="name" name="name" className="field" defaultValue={initial.name} required />
        </div>
        <div>
          <label className="label" htmlFor="phone">Phone</label>
          <input id="phone" name="phone" type="tel" className="field" defaultValue={initial.phone} placeholder="(714) 555-0100" />
        </div>
        <div>
          <label className="label" htmlFor="username">Username</label>
          <input id="username" name="username" className="field" defaultValue={initial.username} autoCapitalize="none" autoCorrect="off" required />
        </div>
        <div>
          <label className="label" htmlFor="password">{initial.has_password ? "New password (leave empty to keep)" : "Password"}</label>
          <input id="password" name="password" type="text" className="field" autoComplete="off" autoCapitalize="none" minLength={6} />
          {!initial.has_password && <p className="text-xs text-special mt-1.5">No password yet: the driver can&apos;t sign in until you set one.</p>}
        </div>
        <label className="flex items-center gap-3 text-[15px] font-medium">
          <input type="checkbox" name="active" defaultChecked={initial.active} className="h-5 w-5 accent-ink" />
          Active (can sign in and get routes)
        </label>
        <label className="flex items-center gap-3 text-[15px] font-medium">
          <input type="checkbox" name="is_admin" defaultChecked={initial.is_admin} disabled={isSelf} className="h-5 w-5 accent-ink" />
          Also admin (can manage houses, routes, drivers and pay)
        </label>
        {isSelf && <input type="hidden" name="is_admin" value="on" />}
      </div>
      <p className="text-sm text-muted px-1">Their days and shifts come from the routes you assign them to. They pick Google or Apple Maps the first time they start a route.</p>

      <FormMessage state={state} />
      <Submit className="btn-primary w-full h-14">{initial.id ? "Save driver" : "Create driver"}</Submit>
    </form>
  );
}
