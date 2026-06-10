import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { SupabaseService } from "./services/supabase-service.js";

const config = loadConfig();
const service = new SupabaseService(config);
const app = await buildApp({ config, service });

// Railway sends SIGTERM during deployments; close active connections cleanly.
const shutdown = async (signal) => {
  app.log.info({ signal }, "Shutting down");
  await app.close();
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

try {
  await app.listen({ port: config.port, host: config.host });
} catch (error) {
  app.log.fatal({ err: error }, "Failed to start server");
  process.exit(1);
}
