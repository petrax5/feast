"use client";

import { useRouter } from "next/navigation";

export function DatePicker({ date }: { date: string }) {
  const router = useRouter();
  return (
    <input
      type="date"
      value={date}
      onChange={(e) => e.target.value && router.push(`/admin?date=${e.target.value}`)}
      className="field h-9 rounded-xl text-sm text-center flex-1 min-w-0"
      aria-label="Pick a date"
    />
  );
}
