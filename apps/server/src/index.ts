import { existsSync } from "node:fs";
import { createServer } from "node:http";
import { resolve } from "node:path";

import { createApp } from "./app/create-app.js";
import { parseEnv } from "./config/env.js";
import { createDatabase } from "./infrastructure/database/client.js";
import { PostgresStationCatalogRepository } from "./modules/asset-catalog/station-catalog-repository.js";
import { StationCatalogService } from "./modules/asset-catalog/station-catalog-service.js";
import { FintrafficClient } from "./modules/providers/fintraffic/client.js";

const rootEnvPath = resolve(import.meta.dirname, "../../../.env");

if (existsSync(rootEnvPath)) {
  process.loadEnvFile(rootEnvPath);
}

const env = parseEnv();
const { db, pool } = createDatabase(env.DATABASE_URL);
const stationCatalogService = new StationCatalogService(
  new PostgresStationCatalogRepository(db),
  new FintrafficClient(env.FINTRAFFIC_BASE_URL, env.FINTRAFFIC_USER),
);
const httpServer = createServer(createApp(env, { stationCatalogService }));

httpServer.listen(env.PORT, () => {
  console.log(`Traffic Twin server listening on http://localhost:${env.PORT}`);
});

function shutdown(signal: NodeJS.Signals) {
  console.log(`Received ${signal}; closing HTTP server.`);
  httpServer.close(async (error) => {
    if (error) {
      console.error(error);
      process.exitCode = 1;
    }

    await pool.end();
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
