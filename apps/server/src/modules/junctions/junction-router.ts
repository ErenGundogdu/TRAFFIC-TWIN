import { Router } from "express";
import type { Router as ExpressRouter } from "express";

import {
  coverageAreaParamsSchema,
  parseRequestParams,
} from "../../common/http/request-validation.js";
import type { JunctionService } from "./junction-service.js";

export function createJunctionRouter(service: JunctionService): ExpressRouter {
  const router = Router();

  router.get("/:coverageAreaId/junctions", async (request, response, next) => {
    try {
      const { coverageAreaId } = parseRequestParams(
        request,
        coverageAreaParamsSchema,
      );
      response.json(await service.getCatalog(coverageAreaId));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
