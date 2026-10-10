import Link from "next/link";
import { logoutAction } from "@/app/actions";

export function TopBar({ title, sub, back, right, logo, below }: { title: string; sub?: string; back?: string; right?: React.ReactNode; logo?: boolean; below?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-20 bg-bg/90 backdrop-blur pt-[env(safe-area-inset-top)]">
      <div className="mx-auto max-w-xl px-4 h-16 flex items-center gap-3">
        {back && (
          <Link href={back} aria-label="Back" className="-ml-2 h-10 w-10 grid place-items-center rounded-full hover:bg-white">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </Link>
        )}
        {logo && <img src="/icons/icon-192.png" alt="Feast Mode" className="h-10 w-10 rounded-xl border border-line" />}
        <div className="min-w-0 flex-1">
          <h1 className="text-[22px] font-bold tracking-tight truncate leading-tight">{title}</h1>
          {sub && <p className="text-[13px] text-muted truncate">{sub}</p>}
        </div>
        {right}
      </div>
      {below && <div className="mx-auto max-w-xl px-4 pb-3">{below}</div>}
    </header>
  );
}

/** Admin ⇄ driver switch for people who are both. */
export function ModeSwitch({ mode }: { mode: "admin" | "driver" }) {
  return (
    <div className="grid grid-cols-2 rounded-xl border border-line bg-white p-1 text-sm font-bold" role="group" aria-label="Dashboard">
      <Link href="/admin" className={`h-9 grid place-items-center rounded-lg ${mode === "admin" ? "bg-ink text-white" : "text-muted"}`}>Admin dashboard</Link>
      <Link href="/" className={`h-9 grid place-items-center rounded-lg ${mode === "driver" ? "bg-ink text-white" : "text-muted"}`}>Driver dashboard</Link>
    </div>
  );
}

export function SignOut() {
  return (
    <form action={logoutAction}>
      <button className="text-sm font-semibold text-muted px-2 h-10">Sign out</button>
    </form>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="card px-6 py-10 text-center text-muted">{children}</div>;
}
