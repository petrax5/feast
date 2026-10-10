"use client";

import Link from "next/link";
import { ActionButton } from "@/components/ui";
import { setRunStatusAction } from "./actions";

export function RunAdminActions({ id, status }: { id: number; status: string }) {
  if (status === "cancelled")
    return (
      <div className="flex gap-2">
        <ActionButton action={() => setRunStatusAction(id, "pending")}>Restore for this day</ActionButton>
      </div>
    );
  return (
    <div className="flex flex-wrap gap-2">
      <Link href={`/admin/runs/${id}`} className="btn-ghost btn-sm">View / edit</Link>
      {status === "completed" ? (
        <ActionButton action={() => setRunStatusAction(id, "pending")} confirm="Mark as not completed? Its pay will be removed from the driver's week.">
          Undo completed
        </ActionButton>
      ) : (
        <ActionButton action={() => setRunStatusAction(id, "completed")} confirm="Mark this route as completed? Its pay will be added to the driver's week." className="btn-sm btn bg-done-soft text-done">
          Mark completed
        </ActionButton>
      )}
    </div>
  );
}
