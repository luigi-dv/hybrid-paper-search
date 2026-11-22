import fp from "fastify-plugin";
import type pg from "pg";

import { pool } from "@/services/database";

// Tells TypeScript that every Fastify instance has a `db` property.
declare module "fastify" {
    interface FastifyInstance {
        db: pg.Pool;
    }
}

/**
 * Makes the pg pool available as `app.db` in every route, and closes it when
 * the server stops.
 */
export const databasePlugin = fp(async (app) => {
    app.decorate("db", pool);

    app.addHook("onClose", async () => {
        await pool.end();
    });
});
