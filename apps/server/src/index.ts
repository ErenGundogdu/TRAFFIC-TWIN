import { existsSync } from "node:fs";
import { createServer } from "node:http";
import { resolve } from "node:path";

import { createApp } from "./app/create-app.js";
import { parseEnv } from "./config/env.js";
import { createDatabase } from "./infrastructure/database/client.js";
import { PostgresStationCatalogRepository } from "./modules/asset-catalog/station-catalog-repository.js";
import { HistoryRepository } from "./modules/analytics/history-repository.js";
import { HistoryService } from "./modules/analytics/history-service.js";
import { StationCatalogService } from "./modules/asset-catalog/station-catalog-service.js";
import { FintrafficClient } from "./modules/providers/fintraffic/client.js";
import { ReplayService } from "./modules/replay/replay-service.js";
import { PostgresTrafficObservationRepository } from "./modules/telemetry/traffic-observation-repository.js";
import { LiveTrafficPoller } from "./modules/ingestion/live-traffic-poller.js";
import { PostgresOperatorNoteRepository } from "./modules/operator-notes/operator-note-repository.js";
import { OperatorNoteService } from "./modules/operator-notes/operator-note-service.js";
import { createRealtimeServer } from "./realtime/create-realtime-server.js";

const rootEnvPath = resolve(import.meta.dirname, "../../../.env");

if (existsSync(rootEnvPath)) {
  process.loadEnvFile(rootEnvPath);
}

const env = parseEnv();
const { db, pool } = createDatabase(env.DATABASE_URL);
const stationRepository = new PostgresStationCatalogRepository(db);
const observationRepository = new PostgresTrafficObservationRepository(db);
const fintrafficClient = new FintrafficClient(
  env.FINTRAFFIC_BASE_URL,
  env.FINTRAFFIC_USER,
);
const stationCatalogService = new StationCatalogService(
  stationRepository,
  fintrafficClient,
  undefined,
  observationRepository,
);
const operatorNoteService = new OperatorNoteService(
  new PostgresOperatorNoteRepository(db),
);
const historyService = new HistoryService(
  stationRepository,
  new HistoryRepository(db),
);
const replayService = new ReplayService(
  stationRepository,
  new HistoryRepository(db),
);
const httpServer = createServer(
  createApp(env, {
    stationCatalogService,
    operatorNoteService,
    historyService,
  }),
);
const realtimeServer = createRealtimeServer(
  httpServer,
  env.CLIENT_ORIGIN,
  operatorNoteService,
  replayService,
);
const liveTrafficPoller = new LiveTrafficPoller(
  "helsinki",
  env.LIVE_POLL_INTERVAL_MS,
  stationRepository,
  observationRepository,
  fintrafficClient,
  (batch) => realtimeServer.publishTrafficBatch(batch),
  undefined,
  (error) => console.error("Live traffic poll failed.", error),
);

try {
  const result = await liveTrafficPoller.runOnce();
  console.log(`Initial live traffic sync: ${result.status}.`);
} catch (error) {
  console.error(
    "Initial live traffic sync failed; persisted data remains available.",
    error,
  );
}

liveTrafficPoller.start();

httpServer.listen(env.PORT, () => {
  console.log(`Traffic Twin server listening on http://localhost:${env.PORT}`);
});

let shuttingDown = false;

async function shutdown(signal: NodeJS.Signals) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`Received ${signal}; closing HTTP server.`);
  liveTrafficPoller.stop();
  try {
    await realtimeServer.close();
    await pool.end();
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}

process.on("SIGINT", (signal) => void shutdown(signal));
process.on("SIGTERM", (signal) => void shutdown(signal));
