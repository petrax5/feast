"use client";

import { useState } from "react";
import Link from "next/link";

const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const pad = (n: number) => String(n).padStart(2, "0");

/** Month grid. Days on the route's delivery weekdays are green; tapping a future day opens the day editor. */
export function MonthCalendar({ deliveryWeekdays, dayHref, year, month, today }: {
  deliveryWeekdays: number[];
  dayHref: (date: string) => string;
  year: number;
  month: number; // 0-indexed
  today: string; // YYYY-MM-DD in the kitchen's timezone
}) {
  const [y, setY] = useState(year);
  const [m, setM] = useState(month);
  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const shift = (d: number) => {
    const nm = (m + d + 12) % 12;
    setM(nm);
    if (d === -1 && m === 0) setY(y - 1);
    if (d === 1 && m === 11) setY(y + 1);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button type="button" className="btn-ghost btn-sm w-10 px-0" onClick={() => shift(-1)} aria-label="Previous month">‹</button>
        <p className="font-bold">{MONTHS[m]} {y}</p>
        <button type="button" className="btn-ghost btn-sm w-10 px-0" onClick={() => shift(1)} aria-label="Next month">›</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {DOW.map((d) => (
          <span key={d} className="text-[11px] font-semibold text-muted py-1">{d}</span>
        ))}
        {Array.from({ length: first }).map((_, i) => (
          <span key={`b${i}`} />
        ))}
        {Array.from({ length: days }).map((_, i) => {
          const date = `${y}-${pad(m + 1)}-${pad(i + 1)}`;
          const wd = new Date(y, m, i + 1).getDay();
          const delivers = deliveryWeekdays.includes(wd);
          const past = date < today;
          const isToday = date === today;
          const cls = [
            "h-10 rounded-xl grid place-items-center text-[15px]",
            delivers ? "bg-done-soft text-done font-bold" : "text-muted",
            isToday ? "ring-2 ring-ink" : "",
            past ? "opacity-45" : "",
          ].join(" ");
          return delivers && !past ? (
            <Link key={date} href={dayHref(date)} className={cls + " hover:ring-2 hover:ring-done"}>{i + 1}</Link>
          ) : (
            <span key={date} className={cls}>{i + 1}</span>
          );
        })}
      </div>
    </div>
  );
}
