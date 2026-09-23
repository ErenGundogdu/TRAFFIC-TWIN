import { corridorInsightResponseSchema } from "@traffic-twin/contracts";

import { apiClient } from "@/shared/api/api-client";

export function getCorridorInsight(coverageAreaId: string, assetId: string) {
  return apiClient.get(
    `/api/coverage-areas/${encodeURIComponent(coverageAreaId)}/stations/${encodeURIComponent(assetId)}/corridor-insight`,
    corridorInsightResponseSchema,
  );
}
