import cors from "cors";
import express from "express";
import type { Express } from "express";

import type { AppEnv } from "../config/env.js";
import { createStationCatalogRouter } from "../modules/asset-catalog/station-catalog-router.js";
import {
  CoverageAreaNotFoundError,
  type StationCatalogService,
} from "../modules/asset-catalog/station-catalog-service.js";
import { FintrafficResponseError } from "../modules/providers/fintraffic/client.js";

interface AppDependencies {
  stationCatalogService?: StationCatalogService;
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

      if (error instanceof FintrafficResponseError) {
        response.status(502).json({
          error: {
            code: "FINTRAFFIC_UNAVAILABLE",
            message: "Fintraffic verisi şu anda alınamıyor.",
          },
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
