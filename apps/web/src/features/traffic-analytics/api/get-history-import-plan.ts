import {
  historyImportPlanResponseSchema,
  type HistoryImportPlanQuery,
} from "@traffic-twin/contracts";

import { apiClient } from "@/shared/api/api-client";

export function getHistoryImportPlan(
  coverageAreaId: string,
  query: HistoryImportPlanQuery,
) {
  const parameters = new URLSearchParams({
    assetId: query.assetId,
    from: query.from,
    to: query.to,
  });

  return apiClient.get(
    `/api/coverage-areas/${encodeURIComponent(coverageAreaId)}/history-import-plan?${parameters.toString()}`,
    historyImportPlanResponseSchema,
  );
}
