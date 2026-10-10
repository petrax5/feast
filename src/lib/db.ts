import "server-only";

// Production uses Neon Postgres (DATABASE_URL). Without it, an embedded Postgres (PGlite)
// stores data in ./.data so the app runs locally with no setup.
type Row = Record<string, any>;
type Runner = (text: string, params: unknown[]) => Promise<Row[]>;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id serial PRIMARY KEY,
  username text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin','driver')),
  active boolean NOT NULL DEFAULT true,
  work_days int[] NOT NULL DEFAULT '{}',
  meals text[] NOT NULL DEFAULT '{}',
  maps_app text NOT NULL DEFAULT 'google',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS settings (
  key text PRIMARY KEY,
  value text NOT NULL
);
CREATE TABLE IF NOT EXISTS dish_types (
  id serial PRIMARY KEY,
  name text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  sort int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS routes (
  id serial PRIMARY KEY,
  name text NOT NULL,
  meal text NOT NULL,
  driver_id int REFERENCES users(id) ON DELETE SET NULL,
  pay_cents int NOT NULL DEFAULT 0,
  weekdays int[] NOT NULL DEFAULT '{}',
  stops jsonb NOT NULL DEFAULT '[]',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS runs (
  id serial PRIMARY KEY,
  run_date text NOT NULL,
  route_id int REFERENCES routes(id) ON DELETE SET NULL,
  name text NOT NULL,
  meal text NOT NULL,
  driver_id int REFERENCES users(id) ON DELETE SET NULL,
  pay_cents int NOT NULL DEFAULT 0,
  stops jsonb NOT NULL DEFAULT '[]',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','started','completed','cancelled')),
  current_stop int NOT NULL DEFAULT 0,
  customized boolean NOT NULL DEFAULT false,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS runs_route_date ON runs (route_id, run_date) WHERE route_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS runs_date ON runs (run_date);
CREATE INDEX IF NOT EXISTS runs_driver_date ON runs (driver_id, run_date);
CREATE TABLE IF NOT EXISTS houses (
  id serial PRIMARY KEY,
  name text NOT NULL DEFAULT '',
  address text NOT NULL,
  items jsonb NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS house_slots (
  house_id int NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  weekday int NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  meal text NOT NULL,
  driver_id int REFERENCES users(id) ON DELETE SET NULL,
  position int NOT NULL DEFAULT 0,
  PRIMARY KEY (house_id, weekday, meal)
);
CREATE TABLE IF NOT EXISTS route_settings (
  weekday int NOT NULL,
  meal text NOT NULL,
  driver_id int NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  pay_cents int NOT NULL DEFAULT 0,
  PRIMARY KEY (weekday, meal, driver_id)
);
CREATE TABLE IF NOT EXISTS run_overrides (
  run_date text NOT NULL,
  route_key text NOT NULL,
  driver_id int NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (run_date, route_key)
);
ALTER TABLE runs ADD COLUMN IF NOT EXISTS route_key text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone text NOT NULL DEFAULT '';
ALTER TABLE users ALTER COLUMN maps_app DROP NOT NULL;
ALTER TABLE users ALTER COLUMN maps_app DROP DEFAULT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_driver boolean NOT NULL DEFAULT false;
ALTER TABLE houses ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT '';
CREATE TABLE IF NOT EXISTS delivery_routes (
  id serial PRIMARY KEY,
  name text NOT NULL,
  pay_cents int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS route_houses (
  route_id int NOT NULL REFERENCES delivery_routes(id) ON DELETE CASCADE,
  house_id int NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  position int NOT NULL DEFAULT 0,
  PRIMARY KEY (route_id, house_id)
);
ALTER TABLE route_houses ADD COLUMN IF NOT EXISTS meals text[] NOT NULL DEFAULT '{breakfast,lunch,dinner}';
CREATE TABLE IF NOT EXISTS route_slots (
  route_id int NOT NULL REFERENCES delivery_routes(id) ON DELETE CASCADE,
  weekday int NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  meal text NOT NULL,
  driver_id int REFERENCES users(id) ON DELETE SET NULL,
  skip int[] NOT NULL DEFAULT '{}',
  PRIMARY KEY (route_id, weekday, meal)
);
CREATE UNIQUE INDEX IF NOT EXISTS runs_key_date ON runs (route_key, run_date) WHERE route_key IS NOT NULL;
INSERT INTO dish_types (name, is_default, sort)
  SELECT 'Regular', true, 0 WHERE NOT EXISTS (SELECT 1 FROM dish_types);
`;

let ready: Promise<Runner> | null = null;

async function connect(): Promise<Runner> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { Pool } = await import("@neondatabase/serverless");
    const pool = new Pool({ connectionString: url });
    const run: Runner = async (text, params) => (await pool.query(text, params as any[])).rows;
    for (const stmt of SCHEMA.split(";").map((s) => s.trim()).filter(Boolean)) await run(stmt, []);
    await migrateRoutes(run);
    return run;
  }
  if (process.env.VERCEL) throw new Error("DATABASE_URL is not set. Connect a Neon Postgres database to this Vercel project.");
  const { PGlite } = await import("@electric-sql/pglite");
  const pg = new PGlite(process.env.PGLITE_DIR ?? "./.data");
  await pg.exec(SCHEMA);
  const run: Runner = async (text, params) => (await pg.query<Row>(text, params as any[])).rows;
  await migrateRoutes(run);
  return run;
}

/** One-time move from the first version (hand-built routes) to houses with a schedule. */
async function migrateRoutes(run: Runner) {
  if (!(await run("SELECT 1 FROM settings WHERE key = 'user_flags'", [])).length) {
    await run("UPDATE users SET is_admin = (role = 'admin'), is_driver = (role = 'driver')", []);
    await run("INSERT INTO settings (key, value) VALUES ('user_flags', '1') ON CONFLICT DO NOTHING", []);
  }
  if (!(await run("SELECT 1 FROM settings WHERE key = 'maps_choice'", [])).length) {
    await run("UPDATE users SET maps_app = NULL WHERE role = 'driver'", []);
    await run("INSERT INTO settings (key, value) VALUES ('maps_choice', '1') ON CONFLICT DO NOTHING", []);
  }
  if ((await run("SELECT 1 FROM settings WHERE key = 'houses_v2'", [])).length) return;
  for (const r of await run("SELECT * FROM routes", [])) {
    const stops: { name: string; address: string; items: Record<string, number> }[] = r.stops ?? [];
    for (const [i, s] of stops.entries()) {
      const [h] = await run("INSERT INTO houses (name, address, items, active) VALUES ($1, $2, $3, $4) RETURNING id", [
        s.name ?? "", s.address ?? "", JSON.stringify(s.items ?? {}), r.active,
      ]);
      for (const wd of r.weekdays as number[])
        await run(
          "INSERT INTO house_slots (house_id, weekday, meal, driver_id, position) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING",
          [h.id, wd, r.meal, r.driver_id, i],
        );
    }
    if (r.driver_id)
      for (const wd of r.weekdays as number[])
        await run(
          "INSERT INTO route_settings (weekday, meal, driver_id, name, pay_cents) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING",
          [wd, r.meal, r.driver_id, r.name, r.pay_cents],
        );
  }
  // Upcoming untouched days regenerate from the houses; started or completed days are kept.
  await run(
    "DELETE FROM runs WHERE route_id IS NOT NULL AND status = 'pending' AND NOT customized AND run_date >= to_char(now() - interval '1 day', 'YYYY-MM-DD')",
    [],
  );
  await run("INSERT INTO settings (key, value) VALUES ('houses_v2', '1') ON CONFLICT DO NOTHING", []);
}

export async function sql<T = Row>(text: string, params: unknown[] = []): Promise<T[]> {
  if (!ready) ready = connect().catch((e) => { ready = null; throw e; });
  const run = await ready;
  return (await run(text, params)) as T[];
}

export async function one<T = Row>(text: string, params: unknown[] = []): Promise<T | undefined> {
  return (await sql<T>(text, params))[0];
}
