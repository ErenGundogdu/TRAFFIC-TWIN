import { Router } from "express";
import type { Router as ExpressRouter } from "express";
import { z } from "zod";

import {
  identifierSchema,
  parseRequestParams,
} from "../../common/http/request-validation.js";
import type { RoadContextService } from "./road-context-service.js";

const roadContextParamsSchema = z.object({
  coverageAreaId: identifierSchema,
  assetId: identifierSchema,
});

export function createRoadContextRouter(
  service: RoadContextService,
): ExpressRouter {
  const router = Router();

  router.get(
    "/:coverageAreaId/stations/:assetId/road-context",
    async (request, response, next) => {
      try {
        const { coverageAreaId, assetId } = parseRequestParams(
          request,
          roadContextParamsSchema,
        );
        response.json(
          await service.getStationRoadContext(coverageAreaId, assetId),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
