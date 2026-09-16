import { Router } from "express";
import type { Router as ExpressRouter } from "express";

import {
  coverageAreaParamsSchema,
  parseRequestParams,
} from "../../common/http/request-validation.js";
import type { AnomalyService } from "./anomaly-service.js";

export function createAnomalyRouter(service: AnomalyService): ExpressRouter {
  const router = Router();

  router.get("/:coverageAreaId/anomalies", async (request, response, next) => {
    try {
      const { coverageAreaId } = parseRequestParams(
        request,
        coverageAreaParamsSchema,
      );
      response.json(await service.getCoverageCatalog(coverageAreaId));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
