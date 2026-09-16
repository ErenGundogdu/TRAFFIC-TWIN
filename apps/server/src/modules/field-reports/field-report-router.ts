import { Router } from "express";
import type { Router as ExpressRouter } from "express";

import {
  coverageAreaParamsSchema,
  parseRequestParams,
} from "../../common/http/request-validation.js";
import type { FieldReportService } from "./field-report-service.js";

export function createFieldReportRouter(
  service: FieldReportService,
): ExpressRouter {
  const router = Router();

  router.get(
    "/:coverageAreaId/field-reports",
    async (request, response, next) => {
      try {
        const { coverageAreaId } = parseRequestParams(
          request,
          coverageAreaParamsSchema,
        );
        response.json({
          reports: await service.listCoverage(coverageAreaId),
        });
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
