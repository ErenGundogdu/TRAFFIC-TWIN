import { Router } from "express";
import type { Router as ExpressRouter } from "express";
import { z } from "zod";

import {
  identifierSchema,
  parseRequestParams,
} from "../../common/http/request-validation.js";
import type { CorridorInsightService } from "./corridor-insight-service.js";

const paramsSchema = z.object({
  coverageAreaId: identifierSchema,
  assetId: identifierSchema,
});

export function createCorridorInsightRouter(
  service: CorridorInsightService,
): ExpressRouter {
  const router = Router();

  router.get(
    "/:coverageAreaId/stations/:assetId/corridor-insight",
    async (request, response, next) => {
      try {
        const { coverageAreaId, assetId } = parseRequestParams(
          request,
          paramsSchema,
        );
        response.json(
          await service.getStationCorridorInsight(coverageAreaId, assetId),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
