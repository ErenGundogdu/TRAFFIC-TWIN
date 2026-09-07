import { historyQuerySchema } from "@traffic-twin/contracts";
import { Router } from "express";

import type { HistoryService } from "./history-service.js";

export function createHistoryRouter(
  service: HistoryService,
): ReturnType<typeof Router> {
  const router = Router();

  router.get(
    "/:coverageAreaId/availability",
    async (request, response, next) => {
      try {
        response.json(
          await service.getAvailability(request.params.coverageAreaId!),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.get("/:coverageAreaId/history", async (request, response, next) => {
    try {
      const query = historyQuerySchema.parse({
        assetIds:
          typeof request.query.assetIds === "string"
            ? request.query.assetIds.split(",").filter(Boolean)
            : [],
        metric: request.query.metric,
        direction: Number(request.query.direction),
        from: request.query.from,
        to: request.query.to,
        resolution: request.query.resolution ?? "auto",
      });
      response.json(await service.query(request.params.coverageAreaId!, query));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
