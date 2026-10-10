"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sql, one } from "@/lib/db";
import { hashPassword, requireDriver, signIn, signOut } from "@/lib/auth";
import { getRun, setSetting, today } from "@/lib/data";
import { isTimeZone } from "@/lib/core";

export type FormState = { error?: string; ok?: string } | undefined;

export async function loginAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await signIn(String(form.get("username") ?? ""), String(form.get("password") ?? ""));
  if (!user) return { error: "Wrong username or password, or the account is inactive." };
  redirect(user.is_admin ? "/admin" : "/");
}

export async function logoutAction() {
  await signOut();
  redirect("/login");
}

/** First launch only: creates the admin account while none exists. */
export async function setupAction(_: FormState, form: FormData): Promise<FormState> {
  const existing = await one("SELECT 1 FROM users WHERE is_admin");
  if (existing) redirect("/login");
  const name = String(form.get("name") ?? "").trim();
  const username = String(form.get("username") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const tz = String(form.get("timezone") ?? "");
  if (!name || !username) return { error: "Name and username are required." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  await sql("INSERT INTO users (username, password_hash, name, role, is_admin) VALUES ($1, $2, $3, 'admin', true)", [
    username, await hashPassword(password), name,
  ]);
  if (isTimeZone(tz)) await setSetting("timezone", tz);
  await signIn(username, password);
  redirect("/admin");
}

// ---------- driver ----------

/** Loads a run the signed-in driver may act on today. */
async function ownTodayRun(runId: number) {
  const driver = await requireDriver();
  const run = await getRun(runId);
  if (!run || run.driver_id !== driver.id || run.status === "cancelled") throw new Error("Route not found");
  if (run.run_date !== (await today())) throw new Error("This route is not for today");
  return run;
}

/** The maps app the driver picks becomes their preference. */
export async function setMapsAppAction(app: "google" | "apple") {
  const driver = await requireDriver();
  await sql("UPDATE users SET maps_app = $1 WHERE id = $2", [app === "apple" ? "apple" : "google", driver.id]);
  revalidatePath("/");
}

export async function startRunAction(runId: number) {
  const run = await ownTodayRun(runId);
  if (run.status === "pending")
    await sql("UPDATE runs SET status = 'started', started_at = now() WHERE id = $1", [run.id]);
  revalidatePath("/");
}

export async function setStopAction(runId: number, index: number) {
  const run = await ownTodayRun(runId);
  const i = Math.max(0, Math.min(index, run.stops.length - 1));
  await sql(
    "UPDATE runs SET current_stop = $2, status = CASE WHEN status = 'pending' THEN 'started' ELSE status END, started_at = COALESCE(started_at, now()) WHERE id = $1",
    [run.id, i],
  );
  revalidatePath("/");
}

export async function completeRunAction(runId: number) {
  const run = await ownTodayRun(runId);
  if (run.status !== "completed")
    await sql("UPDATE runs SET status = 'completed', completed_at = now(), started_at = COALESCE(started_at, now()) WHERE id = $1", [run.id]);
  revalidatePath("/");
}

/** Drivers can undo a completion only on the same day; after that only the admin can. */
export async function undoCompleteAction(runId: number) {
  const run = await ownTodayRun(runId);
  if (run.status === "completed")
    await sql("UPDATE runs SET status = 'started', completed_at = NULL WHERE id = $1", [run.id]);
  revalidatePath("/");
}
