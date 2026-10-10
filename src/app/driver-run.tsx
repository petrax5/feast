"use client";

import { useState, useTransition } from "react";
import { googleAppLegs, googleLegs, money, stopLink, GOOGLE_LEG, type MapsApp } from "@/lib/core";
import type { Run } from "@/lib/data";
import { completeRunAction, setMapsAppAction, setStopAction, startRunAction, undoCompleteAction } from "./actions";
import { Specials, StopRow } from "@/components/stops";

export function DriverRun({ run, mapsApp, mealLabel }: { run: Run; mapsApp: MapsApp | null; mealLabel: string }) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(run.status !== "completed");
  const [app, setApp] = useState<MapsApp | null>(mapsApp);
  // When the driver hasn't picked a maps app yet, we ask first and then continue with `after`.
  const [chooser, setChooser] = useState<null | { after?: (a: MapsApp) => void }>(null);
  const done = run.status === "completed";
  const addresses = run.stops.map((s) => s.address);
  const legs = googleLegs(addresses);
  const current = Math.min(run.current_stop, run.stops.length - 1);
  const apple = app === "apple";

  // Open maps right away (iPhone only follows app links straight from a tap) and save in the background.
  const go = (urls: string[], before?: () => Promise<unknown>) => {
    if (before) start(async () => { await before(); });
    openMaps(urls);
  };
  // Google Maps on iPhone: the app link keeps every stop; the web link is the fallback if the app isn't installed.
  const googleLeg = (i: number) => (isIOS() ? [googleAppLegs(addresses)[i], legs[i]] : [legs[i]]);
  const stopUrls = (a: MapsApp, address: string) =>
    a === "google" && isIOS()
      ? [`comgooglemaps://?daddr=${encodeURIComponent(address)}&directionsmode=driving`, stopLink("google", address)]
      : [stopLink(a, address)];

  const withApp = (fn: (a: MapsApp) => void) => (app ? fn(app) : setChooser({ after: fn }));

  const choose = (a: MapsApp) => {
    const after = chooser?.after;
    setChooser(null);
    setApp(a);
    start(async () => { await setMapsAppAction(a); });
    after?.(a);
  };

  const startRoute = () =>
    withApp((a) => go(a === "apple" ? stopUrls("apple", addresses[current]) : googleLeg(0), () => startRunAction(run.id)));
  const nextHouse = () => go(stopUrls("apple", addresses[current + 1]), () => setStopAction(run.id, current + 1));

  return (
    <section className="card overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)} className="w-full text-left px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold uppercase tracking-wide text-brand-ink">{mealLabel}</p>
            <h2 className="text-xl font-bold tracking-tight mt-0.5">{run.name}</h2>
          </div>
          <div className="text-right shrink-0 space-y-1">
            <p className="text-lg font-bold tabular-nums">{money(run.pay_cents)}</p>
            {done ? <span className="chip-done">Completed</span> : run.status === "started" ? <span className="chip-special">In progress</span> : null}
          </div>
        </div>
        <div className="mt-3"><Specials stops={run.stops} /></div>
      </button>

      {open && (
        <>
          <ol className="border-t border-line divide-y divide-line">
            {run.stops.map((s, i) => (
              <StopRow
                key={i}
                stop={s}
                index={i}
                copy
                active={apple && !done && run.status === "started" && i === current}
                right={!done && (
                  <button type="button" onClick={() => withApp((a) => go(stopUrls(a, s.address)))} className="mt-2 inline-block text-[13px] font-semibold text-brand-ink">
                    Go
                  </button>
                )}
              />
            ))}
          </ol>

          <div className="border-t border-line p-4 space-y-2.5">
            {done ? (
              <>
                <p className="text-center text-done font-semibold py-1">Done · {money(run.pay_cents)} added to your week</p>
                <button
                  className="btn-ghost w-full"
                  disabled={pending}
                  onClick={() => {
                    if (confirm("Mark this route as not completed?")) start(async () => { await undoCompleteAction(run.id); });
                  }}
                >
                  Undo
                </button>
              </>
            ) : (
              <>
                {run.status === "pending" || !apple ? (
                  <button className="btn-dark w-full h-14 text-base" disabled={pending} onClick={startRoute}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 2 4.5 20.3l.7.7L12 18l6.8 3 .7-.7z" /></svg>
                    {run.status === "pending" ? "Start route" : "Open route in Maps"}
                    {app === "google" && legs.length > 1 ? ` · houses 1–${GOOGLE_LEG}` : ""}
                  </button>
                ) : current < addresses.length - 1 ? (
                  <button className="btn-dark w-full h-14 text-base" disabled={pending} onClick={nextHouse}>
                    Next house: #{current + 2}
                  </button>
                ) : null}
                {app === "google" && legs.slice(1).map((url, i) => {
                  const from = (i + 1) * GOOGLE_LEG + 1;
                  return (
                    <button key={url} className="btn-ghost w-full" disabled={pending} onClick={() => go(googleLeg(i + 1), () => setStopAction(run.id, from - 1))}>
                      Continue in Maps · houses {from}–{Math.min(from + GOOGLE_LEG - 1, addresses.length)}
                    </button>
                  );
                })}
                <button
                  className="btn-done w-full h-14 text-base"
                  disabled={pending}
                  onClick={() => {
                    if (confirm(`Mark "${run.name}" as completed?`)) start(async () => { await completeRunAction(run.id); setOpen(false); });
                  }}
                >
                  Mark route completed
                </button>
                {app && (
                  <p className="text-center text-[13px] text-muted">
                    Maps: {apple ? "Apple Maps" : "Google Maps"} ·{" "}
                    <button type="button" className="font-semibold text-brand-ink underline underline-offset-2" onClick={() => setChooser({})}>change</button>
                  </p>
                )}
              </>
            )}
          </div>
        </>
      )}

      {chooser && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end" onClick={() => setChooser(null)}>
          <div className="w-full bg-white rounded-t-3xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] space-y-3 max-w-xl mx-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold">Which maps app do you use?</h3>
            <p className="text-sm text-muted -mt-2">We&apos;ll remember it for next time. You can change it anytime.</p>
            <button type="button" className="btn-dark w-full h-auto py-3 text-base flex-col gap-0.5" onClick={() => choose("google")}>
              Google Maps
              <span className="text-xs font-medium text-white/70">Whole route with every stop, in order (recommended)</span>
            </button>
            <button type="button" className="btn-ghost w-full h-auto py-3 text-base flex-col gap-0.5" onClick={() => choose("apple")}>
              Apple Maps
              <span className="text-xs font-medium text-muted">One house at a time: Apple Maps can&apos;t take several stops from a link</span>
            </button>
            <button type="button" className="btn-ghost w-full" onClick={() => setChooser(null)}>Cancel</button>
          </div>
        </div>
      )}
    </section>
  );
}

const isIOS = () => typeof navigator !== "undefined" && /iPhone|iPad|iPod/.test(navigator.userAgent);

/** Tries each link in turn: if the page is still showing after a moment, the app didn't open, so use the next. */
function openMaps(urls: string[]) {
  const [first, ...rest] = urls;
  window.location.href = first;
  if (!rest.length) return;
  const timer = setTimeout(() => {
    if (document.visibilityState === "visible") openMaps(rest);
  }, 1500);
  document.addEventListener("visibilitychange", () => clearTimeout(timer), { once: true });
}
