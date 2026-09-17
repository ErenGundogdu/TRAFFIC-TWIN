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
import { JunctionService } from "./modules/junctions/junction-service.js";
import { PostgresJunctionCatalogRepository } from "./modules/junctions/junction-repository.js";
import { OpenStreetMapClient } from "./modules/providers/openstreetmap/client.js";
import { AnomalyService } from "./modules/anomalies/anomaly-service.js";
import { PostgresAnomalyRepository } from "./modules/anomalies/anomaly-repository.js";
import { DEFAULT_ANOMALY_POLICY } from "./modules/anomalies/anomaly-engine.js";
import { RoadContextService } from "./modules/road-context/road-context-service.js";
import { PostgresRoadContextRepository } from "./modules/road-context/road-context-repository.js";
import { FintrafficTrafficMessageClient } from "./modules/providers/fintraffic/traffic-message-client.js";
import { PostgresTrafficEventRepository } from "./modules/traffic-events/traffic-event-repository.js";
import { TrafficEventService } from "./modules/traffic-events/traffic-event-service.js";
import { TrafficEventPoller } from "./modules/ingestion/traffic-event-poller.js";
import { PostgresTrafficEventContextRepository } from "./modules/traffic-events/traffic-event-context-repository.js";
import { TrafficEventContextService } from "./modules/traffic-events/traffic-event-context-service.js";
import { PostgresFieldReportRepository } from "./modules/field-reports/field-report-repository.js";
import { FieldReportService } from "./modules/field-reports/field-report-service.js";
import { HistoryImportRepository } from "./modules/ingestion/history-import-repository.js";
import { HistoryImportPlanningService } from "./modules/ingestion/history-import-planning-service.js";

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
const trafficMessageClient = new FintrafficTrafficMessageClient(
  env.FINTRAFFIC_TRAFFIC_MESSAGE_BASE_URL,
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
const fieldReportService = new FieldReportService(
  stationRepository,
  new PostgresFieldReportRepository(db),
);
const historyService = new HistoryService(
  stationRepository,
  new HistoryRepository(db),
);
const historyImportPlanningService = new HistoryImportPlanningService(
  stationRepository,
  new HistoryImportRepository(db),
);
const replayService = new ReplayService(
  stationRepository,
  new HistoryRepository(db),
);
const openStreetMapClient = new OpenStreetMapClient(
  env.OVERPASS_BASE_URL,
  env.FINTRAFFIC_USER,
);
const junctionService = new JunctionService(
  stationRepository,
  new PostgresJunctionCatalogRepository(db),
  openStreetMapClient,
);
const roadContextService = new RoadContextService(
  stationRepository,
  openStreetMapClient,
  new PostgresRoadContextRepository(db),
  undefined,
  (error) =>
    console.warn(
      "OpenStreetMap refresh failed; persisted road context is being served.",
      error,
    ),
);
const trafficEventService = new TrafficEventService(
  stationRepository,
  new PostgresTrafficEventRepository(db),
  trafficMessageClient,
  undefined,
  env.TRAFFIC_EVENT_POLL_INTERVAL_MS * 2,
);
const trafficEventContextService = new TrafficEventContextService(
  stationRepository,
  new PostgresTrafficEventContextRepository(db),
);
const anomalyService = new AnomalyService(
  stationRepository,
  observationRepository,
  new PostgresAnomalyRepository(db),
  {
    ...DEFAULT_ANOMALY_POLICY,
    windowWeeks: env.ANOMALY_BASELINE_WEEKS,
    minimumSamples: env.ANOMALY_MINIMUM_SAMPLES,
    persistenceCount: env.ANOMALY_PERSISTENCE_COUNT,
  },
);
const httpServer = createServer(
  createApp(env, {
    stationCatalogService,
    operatorNoteService,
    historyService,
    junctionService,
    anomalyService,
    roadContextService,
    trafficEventService,
    trafficEventContextService,
    fieldReportService,
    historyImportPlanningService,
  }),
);
const realtimeServer = createRealtimeServer(
  httpServer,
  env.CLIENT_ORIGIN,
  operatorNoteService,
  replayService,
  fieldReportService,
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
  async () => {
    await anomalyService.evaluateCoverage("helsinki");
  },
);
const trafficEventPoller = new TrafficEventPoller(
  "helsinki",
  env.TRAFFIC_EVENT_POLL_INTERVAL_MS,
  trafficEventService,
  (error) => console.error("Traffic event sync failed.", error),
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

try {
  const result = await trafficEventPoller.runOnce();
  console.log(`Initial traffic event sync: ${result?.eventCount ?? 0} events.`);
} catch (error) {
  console.error(
    "Initial traffic event sync failed; persisted events remain available.",
    error,
  );
}

liveTrafficPoller.start();
trafficEventPoller.start();

httpServer.listen(env.PORT, () => {
  console.log(`Traffic Twin server listening on http://localhost:${env.PORT}`);
});

let shuttingDown = false;

async function shutdown(signal: NodeJS.Signals) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`Received ${signal}; closing HTTP server.`);
  liveTrafficPoller.stop();
  trafficEventPoller.stop();
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
