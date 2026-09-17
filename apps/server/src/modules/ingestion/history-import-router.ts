import { historyImportPlanQuerySchema } from "@traffic-twin/contracts";
import { Router } from "express";

import {
  coverageAreaParamsSchema,
  parseRequestParams,
  parseRequestQuery,
} from "../../common/http/request-validation.js";
import type { HistoryImportPlanningService } from "./history-import-planning-service.js";

export function createHistoryImportRouter(
  service: HistoryImportPlanningService,
): ReturnType<typeof Router> {
  const router = Router();

  router.get(
    "/:coverageAreaId/history-import-plan",
    async (request, response, next) => {
      try {
        const { coverageAreaId } = parseRequestParams(
          request,
          coverageAreaParamsSchema,
        );
        const query = parseRequestQuery(request, historyImportPlanQuerySchema);
        response.json(await service.createPlan(coverageAreaId, query));
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
