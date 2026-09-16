import { Router } from "express";
import type { Router as ExpressRouter } from "express";
import { z } from "zod";

import {
  identifierSchema,
  parseRequestParams,
} from "../../common/http/request-validation.js";
import type { TrafficEventContextService } from "./traffic-event-context-service.js";

const trafficEventContextParamsSchema = z.object({
  coverageAreaId: identifierSchema,
  stationAssetId: identifierSchema,
});

export function createTrafficEventContextRouter(
  service: TrafficEventContextService,
): ExpressRouter {
  const router = Router();

  router.get(
    "/:coverageAreaId/stations/:stationAssetId/traffic-event-context",
    async (request, response, next) => {
      try {
        const { coverageAreaId, stationAssetId } = parseRequestParams(
          request,
          trafficEventContextParamsSchema,
        );
        response.json(
          await service.getStationContext(coverageAreaId, stationAssetId),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
