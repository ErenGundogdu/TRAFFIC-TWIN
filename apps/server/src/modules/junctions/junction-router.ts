import { Router } from "express";
import type { Router as ExpressRouter } from "express";

import type { JunctionService } from "./junction-service.js";

export function createJunctionRouter(service: JunctionService): ExpressRouter {
  const router = Router();

  router.get("/:coverageAreaId/junctions", async (request, response, next) => {
    try {
      response.json(await service.getCatalog(request.params.coverageAreaId!));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
