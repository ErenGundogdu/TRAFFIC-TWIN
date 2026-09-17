import {
  createHistoryImportJobSchema,
  historyImportPlanQuerySchema,
} from "@traffic-twin/contracts";
import { Router } from "express";
import { z } from "zod";

import {
  coverageAreaParamsSchema,
  parseRequestBody,
  parseRequestParams,
  parseRequestQuery,
} from "../../common/http/request-validation.js";
import type { HistoryImportJobService } from "./history-import-job-service.js";
import type { HistoryImportPlanningService } from "./history-import-planning-service.js";

const historyImportJobParamsSchema = coverageAreaParamsSchema.extend({
  jobId: z.uuid(),
});

export function createHistoryImportRouter(
  planningService: HistoryImportPlanningService,
  jobService?: HistoryImportJobService,
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
        response.json(await planningService.createPlan(coverageAreaId, query));
      } catch (error) {
        next(error);
      }
    },
  );

  if (jobService) {
    router.post(
      "/:coverageAreaId/history-import-jobs",
      async (request, response, next) => {
        try {
          const { coverageAreaId } = parseRequestParams(
            request,
            coverageAreaParamsSchema,
          );
          const command = parseRequestBody(
            request,
            createHistoryImportJobSchema,
          );
          response
            .status(202)
            .json(await jobService.createJob(coverageAreaId, command));
        } catch (error) {
          next(error);
        }
      },
    );

    router.get(
      "/:coverageAreaId/history-import-jobs/:jobId",
      async (request, response, next) => {
        try {
          const { coverageAreaId, jobId } = parseRequestParams(
            request,
            historyImportJobParamsSchema,
          );
          response.json(await jobService.getJob(coverageAreaId, jobId));
        } catch (error) {
          next(error);
        }
      },
    );
  }

  return router;
}
