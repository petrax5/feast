"use client";

import { useActionState, useEffect, useState } from "react";
import { setupAction } from "../actions";
import { FormMessage, Submit } from "@/components/ui";

export function SetupForm() {
  const [state, action] = useActionState(setupAction, undefined);
  const [tz, setTz] = useState("");
  useEffect(() => setTz(Intl.DateTimeFormat().resolvedOptions().timeZone), []);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="timezone" value={tz} />
      <div>
        <label className="label" htmlFor="name">Your name</label>
        <input id="name" name="name" className="field" required />
      </div>
      <div>
        <label className="label" htmlFor="username">Username</label>
        <input id="username" name="username" className="field" autoCapitalize="none" autoCorrect="off" required />
      </div>
      <div>
        <label className="label" htmlFor="password">Password (8+ characters)</label>
        <input id="password" name="password" type="password" className="field" autoComplete="new-password" minLength={8} required />
      </div>
      {tz && <p className="text-sm text-muted">Kitchen time zone: {tz} (you can change it later)</p>}
      <FormMessage state={state} />
      <Submit>Create account</Submit>
    </form>
  );
}
