import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { one } from "./db";
import type { MapsApp } from "./core";

export type User = {
  id: number;
  username: string;
  name: string;
  is_admin: boolean;
  is_driver: boolean;
  active: boolean;
  work_days: number[];
  meals: string[];
  maps_app: MapsApp | null;
};

const COOKIE = "kr_session";
const MAX_AGE = 60 * 60 * 24 * 90; // drivers stay signed in on their phone for 90 days

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s && process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET is not set");
  return new TextEncoder().encode(s ?? "dev-only-secret-change-me");
}

export const hashPassword = (pw: string) => bcrypt.hash(pw, 10);

export async function signIn(username: string, password: string): Promise<User | null> {
  const row = await one<User & { password_hash: string }>(
    "SELECT * FROM users WHERE lower(username) = lower($1)",
    [username.trim()],
  );
  if (!row || !row.active || !row.password_hash || !(await bcrypt.compare(password, row.password_hash))) return null;
  const token = await new SignJWT({ uid: row.id })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
  return row;
}

export async function signOut() {
  (await cookies()).delete(COOKIE);
}

/** Current user, re-read from the database so deactivation takes effect immediately. */
export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const u = await one<User>(
      "SELECT id, username, name, is_admin, is_driver, active, work_days, meals, maps_app FROM users WHERE id = $1",
      [payload.uid],
    );
    return u && u.active ? u : null;
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<User> {
  const u = await currentUser();
  if (!u) redirect("/login");
  return u;
}

export async function requireAdmin(): Promise<User> {
  const u = await requireUser();
  if (!u.is_admin) redirect("/");
  return u;
}

export async function requireDriver(): Promise<User> {
  const u = await requireUser();
  if (!u.is_driver) redirect("/admin");
  return u;
}
