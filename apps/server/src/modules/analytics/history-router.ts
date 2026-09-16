import { historyQuerySchema } from "@traffic-twin/contracts";
import { Router } from "express";
import { z } from "zod";

import {
  coverageAreaParamsSchema,
  parseRequestParams,
  parseRequestQuery,
} from "../../common/http/request-validation.js";
import type { HistoryService } from "./history-service.js";

const historyHttpQuerySchema = z
  .object({
    assetIds: z.string(),
    metric: z.string(),
    direction: z.coerce.number(),
    from: z.string(),
    to: z.string(),
    resolution: z.string().default("auto"),
  })
  .transform((query) =>
    historyQuerySchema.parse({
      ...query,
      assetIds: query.assetIds.split(",").filter(Boolean),
    }),
  );

export function createHistoryRouter(
  service: HistoryService,
): ReturnType<typeof Router> {
  const router = Router();

  router.get(
    "/:coverageAreaId/availability",
    async (request, response, next) => {
      try {
        const { coverageAreaId } = parseRequestParams(
          request,
          coverageAreaParamsSchema,
        );
        response.json(await service.getAvailability(coverageAreaId));
      } catch (error) {
        next(error);
      }
    },
  );

  router.get("/:coverageAreaId/history", async (request, response, next) => {
    try {
      const { coverageAreaId } = parseRequestParams(
        request,
        coverageAreaParamsSchema,
      );
      const query = parseRequestQuery(request, historyHttpQuerySchema);
      response.json(await service.query(coverageAreaId, query));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
