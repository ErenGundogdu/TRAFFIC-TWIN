import { laneHistoryInsightResponseSchema } from "@traffic-twin/contracts";

import { apiClient } from "@/shared/api/api-client";

export function getLaneHistoryInsight(coverageAreaId: string, assetId: string) {
  return apiClient.get(
    `/api/coverage-areas/${encodeURIComponent(coverageAreaId)}/stations/${encodeURIComponent(assetId)}/lane-history-insight`,
    laneHistoryInsightResponseSchema,
  );
}
