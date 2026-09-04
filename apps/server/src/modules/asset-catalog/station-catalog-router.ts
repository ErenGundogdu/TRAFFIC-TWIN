import { Router } from "express";
import type { Router as ExpressRouter } from "express";

import type { StationCatalogService } from "./station-catalog-service.js";

export function createStationCatalogRouter(
  service: StationCatalogService,
): ExpressRouter {
  const router = Router();

  router.get("/:coverageAreaId/stations", async (request, response, next) => {
    try {
      response.json(
        await service.getCoverageStations(request.params.coverageAreaId),
      );
    } catch (error) {
      next(error);
    }
  });

  return router;
}
