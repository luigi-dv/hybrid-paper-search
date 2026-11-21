import pg from "pg";

import { requireEnv } from "@/helpers";

// One pool for the whole process. A pool keeps a few connections open and
// lends them out, because opening a new connection per query is slow.
export const pool = new pg.Pool({
    host: process.env.PGHOST ?? "localhost",
    port: Number(process.env.PGPORT ?? 5432),
    user: process.env.PGUSER ?? "app",
    database: process.env.PGDATABASE ?? "hps",
    password: requireEnv("POSTGRES_PASSWORD"),
    max: 10,
});

// A connection that sits idle in the pool can still fail (for example when the
// database restarts). Without this handler that error would crash the process.
pool.on("error", (err) => {
    console.error("Unexpected error on an idle database connection:", err.message);
});
