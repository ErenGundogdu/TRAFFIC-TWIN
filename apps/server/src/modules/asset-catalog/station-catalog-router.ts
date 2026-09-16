import { Router } from "express";
import type { Router as ExpressRouter } from "express";

import {
  coverageAreaParamsSchema,
  parseRequestParams,
} from "../../common/http/request-validation.js";
import type { StationCatalogService } from "./station-catalog-service.js";

export function createStationCatalogRouter(
  service: StationCatalogService,
): ExpressRouter {
  const router = Router();

  router.get("/:coverageAreaId/stations", async (request, response, next) => {
    try {
      const { coverageAreaId } = parseRequestParams(
        request,
        coverageAreaParamsSchema,
      );
      response.json(await service.getCoverageStations(coverageAreaId));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
