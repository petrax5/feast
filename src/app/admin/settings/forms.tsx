"use client";

import { useActionState } from "react";
import type { DishType } from "@/lib/core";
import { FormMessage, Submit } from "@/components/ui";
import { changeAdminPasswordAction, saveDishTypesAction, saveTimeZoneAction } from "../actions";

export function DishTypesForm({ dishes }: { dishes: DishType[] }) {
  const [state, action] = useActionState(saveDishTypesAction, undefined);
  return (
    <form action={action} className="card p-5 space-y-3" key={dishes.length}>
      <div>
        <h2 className="font-bold text-lg">Special types</h2>
        <p className="text-sm text-muted">The first one is the regular meal (a house's clients). The others are specials like Vegan or Diabetic.</p>
      </div>
      {dishes.map((d) => (
        <div key={d.id} className="flex items-center gap-2">
          <input type="hidden" name="dish_id" value={d.id} />
          <input name="dish_name" defaultValue={d.name} className="field flex-1" required />
          {d.is_default ? (
            <span className="chip-muted shrink-0">Regular</span>
          ) : (
            <label className="flex items-center gap-2 text-sm font-medium shrink-0">
              <input type="checkbox" name="dish_active" value={d.id} defaultChecked={d.active} className="h-5 w-5 accent-ink" />
              In use
            </label>
          )}
        </div>
      ))}
      <input name="new_dish" className="field" placeholder="+ Add a special (e.g. Vegan, Diabetic)" />
      <FormMessage state={state} />
      <Submit className="btn-dark w-full">Save special types</Submit>
    </form>
  );
}

export function TimeZoneForm({ tz, zones }: { tz: string; zones: string[] }) {
  const [state, action] = useActionState(saveTimeZoneAction, undefined);
  return (
    <form action={action} className="card p-5 space-y-3">
      <div>
        <h2 className="font-bold text-lg">Kitchen time zone</h2>
        <p className="text-sm text-muted">Decides what &quot;today&quot; is for drivers.</p>
      </div>
      <select name="timezone" defaultValue={tz} className="field">
        {(zones.includes(tz) ? zones : [tz, ...zones]).map((z) => <option key={z} value={z}>{z.replace(/_/g, " ")}</option>)}
      </select>
      <FormMessage state={state} />
      <Submit className="btn-dark w-full">Save time zone</Submit>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changeAdminPasswordAction, undefined);
  return (
    <form action={action} className="card p-5 space-y-3">
      <h2 className="font-bold text-lg">Your password</h2>
      <input name="password" type="password" className="field" placeholder="New password (8+ characters)" autoComplete="new-password" minLength={8} required />
      <FormMessage state={state} />
      <Submit className="btn-dark w-full">Change password</Submit>
    </form>
  );
}
