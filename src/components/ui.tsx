"use client";

import { useFormStatus } from "react-dom";
import { useTransition } from "react";
import type { FormState } from "@/app/actions";

export function Submit({ children, className = "btn-primary w-full" }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? "Saving…" : children}
    </button>
  );
}

export function FormMessage({ state }: { state: FormState }) {
  if (state?.error) return <p className="rounded-2xl bg-red-50 text-danger text-sm font-medium px-4 py-3">{state.error}</p>;
  if (state?.ok) return <p className="rounded-2xl bg-done-soft text-done text-sm font-medium px-4 py-3">{state.ok}</p>;
  return null;
}

/** Button that runs a server action, with an optional confirmation prompt. */
export function ActionButton({
  action, confirm, className = "btn-ghost btn-sm", children,
}: {
  action: () => Promise<unknown>;
  confirm?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className={className}
      disabled={pending}
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        start(async () => { await action(); });
      }}
    >
      {children}
    </button>
  );
}
