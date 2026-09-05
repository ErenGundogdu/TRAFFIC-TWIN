import { Router } from "express";
import type { Router as ExpressRouter } from "express";

import type { AnomalyService } from "./anomaly-service.js";

export function createAnomalyRouter(service: AnomalyService): ExpressRouter {
  const router = Router();

  router.get("/:coverageAreaId/anomalies", async (request, response, next) => {
    try {
      response.json(
        await service.getCoverageCatalog(request.params.coverageAreaId!),
      );
    } catch (error) {
      next(error);
    }
  });

  return router;
}
