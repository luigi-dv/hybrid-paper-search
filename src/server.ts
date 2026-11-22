import { buildServer } from "@/app";
import { API_HOST, API_PORT } from "@/constants";

/** Entry point: `npm run dev` runs this file. The app itself is built in app.ts. */
async function start(): Promise<void> {
    const app = await buildServer();

    // Ctrl+C or `docker stop`: finish the open requests, close the pool, exit.
    for (const signal of ["SIGINT", "SIGTERM"] as const) {
        process.once(signal, () => {
            app.log.info(`${signal} received, shutting down`);
            void app.close();
        });
    }

    try {
        await app.listen({ host: API_HOST, port: API_PORT });
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
}

void start();
