"use client";

import { useActionState } from "react";
import { loginAction } from "../actions";
import { FormMessage, Submit } from "@/components/ui";

export function LoginForm() {
  const [state, action] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="username">Username</label>
        <input id="username" name="username" className="field" autoCapitalize="none" autoCorrect="off" autoComplete="username" required />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" className="field" autoComplete="current-password" required />
      </div>
      <FormMessage state={state} />
      <Submit>Sign in</Submit>
    </form>
  );
}
