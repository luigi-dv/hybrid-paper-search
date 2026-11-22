import Fastify, { type FastifyInstance } from "fastify";

import { databasePlugin } from "@/plugins/database";
import { searchRoutes } from "@/routes/search";

/**
 * Builds the server without starting it. Nothing in this file runs on import,
 * so a test can build the app and send requests with `app.inject()`.
 */
export async function buildServer(): Promise<FastifyInstance> {
    const app = Fastify({ logger: true });

    await app.register(databasePlugin);

    app.get("/health", async () => ({ status: "ok" }));
    await app.register(searchRoutes, { prefix: "/search" });

    return app;
}
