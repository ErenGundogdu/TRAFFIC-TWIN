import cors from "cors";
import express from "express";
import type { Express } from "express";

import type { AppEnv } from "../config/env.js";
import { attachRequestId } from "../common/http/request-id.js";
import { createStationCatalogRouter } from "../modules/asset-catalog/station-catalog-router.js";
import { createHistoryRouter } from "../modules/analytics/history-router.js";
import type { HistoryService } from "../modules/analytics/history-service.js";
import type { StationCatalogService } from "../modules/asset-catalog/station-catalog-service.js";
import { createRoadContextRouter } from "../modules/road-context/road-context-router.js";
import type { RoadContextService } from "../modules/road-context/road-context-service.js";
import { createOperatorNoteRouter } from "../modules/operator-notes/operator-note-router.js";
import type { OperatorNoteService } from "../modules/operator-notes/operator-note-service.js";
import { createJunctionRouter } from "../modules/junctions/junction-router.js";
import type { JunctionService } from "../modules/junctions/junction-service.js";
import { createAnomalyRouter } from "../modules/anomalies/anomaly-router.js";
import type { AnomalyService } from "../modules/anomalies/anomaly-service.js";
import { createTrafficEventRouter } from "../modules/traffic-events/traffic-event-router.js";
import type { TrafficEventService } from "../modules/traffic-events/traffic-event-service.js";
import { createTrafficEventContextRouter } from "../modules/traffic-events/traffic-event-context-router.js";
import type { TrafficEventContextService } from "../modules/traffic-events/traffic-event-context-service.js";
import { createFieldReportRouter } from "../modules/field-reports/field-report-router.js";
import type { FieldReportService } from "../modules/field-reports/field-report-service.js";
import { createHistoryImportRouter } from "../modules/ingestion/history-import-router.js";
import type { HistoryImportJobService } from "../modules/ingestion/history-import-job-service.js";
import type { HistoryImportPlanningService } from "../modules/ingestion/history-import-planning-service.js";
import { createCorridorInsightRouter } from "../modules/corridor-insights/corridor-insight-router.js";
import type { CorridorInsightService } from "../modules/corridor-insights/corridor-insight-service.js";
import { createLaneHistoryRouter } from "../modules/lane-history-insights/lane-history-router.js";
import type { LaneHistoryService } from "../modules/lane-history-insights/lane-history-service.js";
import { errorHandler } from "./error-handler.js";

interface AppDependencies {
  stationCatalogService?: StationCatalogService;
  operatorNoteService?: OperatorNoteService;
  historyService?: HistoryService;
  junctionService?: JunctionService;
  anomalyService?: AnomalyService;
  roadContextService?: RoadContextService;
  trafficEventService?: TrafficEventService;
  trafficEventContextService?: TrafficEventContextService;
  fieldReportService?: FieldReportService;
  historyImportPlanningService?: HistoryImportPlanningService;
  historyImportJobService?: HistoryImportJobService;
  corridorInsightService?: CorridorInsightService;
  laneHistoryService?: LaneHistoryService;
}

export function createApp(
  env: AppEnv,
  dependencies: AppDependencies = {},
): Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(attachRequestId);
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
    }),
  );
  app.use(express.json({ limit: "100kb" }));

  app.get("/health", (_request, response) => {
    response.status(200).json({ status: "ok" });
  });

  if (dependencies.stationCatalogService) {
    app.use(
      "/api/coverage-areas",
      createStationCatalogRouter(dependencies.stationCatalogService),
    );
  }

  if (dependencies.operatorNoteService) {
    app.use(
      "/api/operator-notes",
      createOperatorNoteRouter(dependencies.operatorNoteService),
    );
  }

  if (dependencies.historyService) {
    app.use("/api/analytics", createHistoryRouter(dependencies.historyService));
  }

  if (dependencies.historyImportPlanningService) {
    app.use(
      "/api/coverage-areas",
      createHistoryImportRouter(
        dependencies.historyImportPlanningService,
        dependencies.historyImportJobService,
      ),
    );
  }

  if (dependencies.junctionService) {
    app.use(
      "/api/coverage-areas",
      createJunctionRouter(dependencies.junctionService),
    );
  }

  if (dependencies.anomalyService) {
    app.use(
      "/api/coverage-areas",
      createAnomalyRouter(dependencies.anomalyService),
    );
  }

  if (dependencies.roadContextService) {
    app.use(
      "/api/coverage-areas",
      createRoadContextRouter(dependencies.roadContextService),
    );
  }

  if (dependencies.corridorInsightService) {
    app.use(
      "/api/coverage-areas",
      createCorridorInsightRouter(dependencies.corridorInsightService),
    );
  }

  if (dependencies.laneHistoryService) {
    app.use(
      "/api/coverage-areas",
      createLaneHistoryRouter(dependencies.laneHistoryService),
    );
  }

  if (dependencies.trafficEventService) {
    app.use(
      "/api/coverage-areas",
      createTrafficEventRouter(dependencies.trafficEventService),
    );
  }

  if (dependencies.trafficEventContextService) {
    app.use(
      "/api/coverage-areas",
      createTrafficEventContextRouter(dependencies.trafficEventContextService),
    );
  }

  if (dependencies.fieldReportService) {
    app.use(
      "/api/coverage-areas",
      createFieldReportRouter(dependencies.fieldReportService),
    );
  }

  app.use(errorHandler);

  return app;
}
