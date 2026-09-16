import { Router } from "express";
import type { Router as ExpressRouter } from "express";

import {
  coverageAreaParamsSchema,
  parseRequestParams,
} from "../../common/http/request-validation.js";
import type { TrafficEventService } from "./traffic-event-service.js";

export function createTrafficEventRouter(
  service: TrafficEventService,
): ExpressRouter {
  const router = Router();

  router.get(
    "/:coverageAreaId/traffic-events",
    async (request, response, next) => {
      try {
        const { coverageAreaId } = parseRequestParams(
          request,
          coverageAreaParamsSchema,
        );
        response.json(await service.getCatalog(coverageAreaId));
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
