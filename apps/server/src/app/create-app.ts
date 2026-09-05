import cors from "cors";
import express from "express";
import type { Express } from "express";

import type { AppEnv } from "../config/env.js";
import { createStationCatalogRouter } from "../modules/asset-catalog/station-catalog-router.js";
import { createHistoryRouter } from "../modules/analytics/history-router.js";
import type { HistoryService } from "../modules/analytics/history-service.js";
import {
  HistoryAssetNotFoundError,
  HistoryCoverageAreaNotFoundError,
} from "../modules/analytics/history-service.js";
import {
  CoverageAreaNotFoundError,
  type StationCatalogService,
} from "../modules/asset-catalog/station-catalog-service.js";
import { FintrafficResponseError } from "../modules/providers/fintraffic/client.js";
import { createOperatorNoteRouter } from "../modules/operator-notes/operator-note-router.js";
import { AssetNotFoundError } from "../modules/operator-notes/operator-note-repository.js";
import type { OperatorNoteService } from "../modules/operator-notes/operator-note-service.js";
import { createJunctionRouter } from "../modules/junctions/junction-router.js";
import type { JunctionService } from "../modules/junctions/junction-service.js";
import { ZodError } from "zod";

interface AppDependencies {
  stationCatalogService?: StationCatalogService;
  operatorNoteService?: OperatorNoteService;
  historyService?: HistoryService;
  junctionService?: JunctionService;
}

export function createApp(
  env: AppEnv,
  dependencies: AppDependencies = {},
): Express {
  const app = express();

  app.disable("x-powered-by");
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

  if (dependencies.junctionService) {
    app.use(
      "/api/coverage-areas",
      createJunctionRouter(dependencies.junctionService),
    );
  }

  app.use(
    (
      error: unknown,
      _request: express.Request,
      response: express.Response,
      _next: express.NextFunction,
    ) => {
      void _next;

      if (error instanceof CoverageAreaNotFoundError) {
        response.status(404).json({
          error: { code: "COVERAGE_AREA_NOT_FOUND", message: error.message },
        });
        return;
      }

      if (
        error instanceof HistoryCoverageAreaNotFoundError ||
        error instanceof HistoryAssetNotFoundError
      ) {
        response.status(404).json({
          error: { code: "HISTORY_SCOPE_NOT_FOUND", message: error.message },
        });
        return;
      }

      if (error instanceof FintrafficResponseError) {
        response.status(502).json({
          error: {
            code: "FINTRAFFIC_UNAVAILABLE",
            message: "Fintraffic verisi şu anda alınamıyor.",
          },
        });
        return;
      }

      if (error instanceof AssetNotFoundError) {
        response.status(404).json({
          error: { code: "TRAFFIC_ASSET_NOT_FOUND", message: error.message },
        });
        return;
      }

      if (error instanceof ZodError) {
        response.status(400).json({
          error: { code: "INVALID_REQUEST", message: "İstek doğrulanamadı." },
        });
        return;
      }

      console.error(error);
      response.status(500).json({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Beklenmeyen bir sunucu hatası oluştu.",
        },
      });
    },
  );

  return app;
}
