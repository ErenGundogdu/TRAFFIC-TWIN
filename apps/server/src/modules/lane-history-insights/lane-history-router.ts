import { Router } from "express";
import type { Router as ExpressRouter } from "express";
import { z } from "zod";

import {
  identifierSchema,
  parseRequestParams,
} from "../../common/http/request-validation.js";
import type { LaneHistoryService } from "./lane-history-service.js";

const paramsSchema = z.object({
  coverageAreaId: identifierSchema,
  assetId: identifierSchema,
});

export function createLaneHistoryRouter(
  service: LaneHistoryService,
): ExpressRouter {
  const router = Router();
  router.get(
    "/:coverageAreaId/stations/:assetId/lane-history-insight",
    async (request, response, next) => {
      try {
        const { coverageAreaId, assetId } = parseRequestParams(
          request,
          paramsSchema,
        );
        response.json(
          await service.getStationLaneHistory(coverageAreaId, assetId),
        );
      } catch (error) {
        next(error);
      }
    },
  );
  return router;
}
