import { runTotals, stopTotal, type RunStop } from "@/lib/core";
import { CopyButton } from "./copy-button";

export function Specials({ stops }: { stops: RunStop[] }) {
  const t = runTotals(stops);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="chip-muted">{t.stops} {t.stops === 1 ? "house" : "houses"}</span>
      <span className="chip-muted">{t.meals} meals</span>
      {t.specials.map((s) => (
        <span key={s.name} className="chip-special">{s.qty} {s.name}</span>
      ))}
    </div>
  );
}

export function StopRow({ stop, index, active, right, copy }: { stop: RunStop; index: number; active?: boolean; right?: React.ReactNode; copy?: boolean }) {
  return (
    <li className={`flex gap-3 px-4 py-3.5 ${active ? "bg-special-soft/60" : ""}`}>
      <span className={`mt-0.5 h-7 w-7 shrink-0 rounded-full grid place-items-center text-[13px] font-bold ${active ? "bg-ink text-white" : "bg-bg text-ink"}`}>
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        {stop.name && <p className="font-semibold leading-snug">{stop.name}</p>}
        <p className={`text-[14px] leading-snug ${stop.name ? "text-muted" : "font-semibold"}`}>{stop.address}</p>
        {copy && <div className="mt-1"><CopyButton text={stop.address} /></div>}
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {stop.items.map((i) => (
            <span key={i.name} className={i.special ? "chip-special" : "chip-muted"}>{i.qty} {i.name}</span>
          ))}
        </div>
        {stop.notes && <p className="mt-2 rounded-xl bg-bg px-3 py-2 text-[13px] leading-snug whitespace-pre-line">📝 {stop.notes}</p>}
      </div>
      <div className="text-right shrink-0">
        <p className="text-2xl font-bold leading-none tabular-nums">{stopTotal(stop)}</p>
        <p className="text-[11px] text-muted font-medium mt-1">meals</p>
        {right}
      </div>
    </li>
  );
}
