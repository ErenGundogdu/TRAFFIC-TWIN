import { Router } from "express";
import type { Router as ExpressRouter } from "express";

import type { RoadContextService } from "./road-context-service.js";

export function createRoadContextRouter(
  service: RoadContextService,
): ExpressRouter {
  const router = Router();

  router.get(
    "/:coverageAreaId/stations/:assetId/road-context",
    async (request, response, next) => {
      try {
        response.json(
          await service.getStationRoadContext(
            request.params.coverageAreaId!,
            request.params.assetId!,
          ),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
