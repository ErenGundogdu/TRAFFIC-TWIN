import { anomalyCatalogResponseSchema } from "@traffic-twin/contracts";

import { apiClient } from "@/shared/api/api-client";

export async function getAnomalyCatalog(coverageAreaId: string) {
  return apiClient.get(
    `/api/coverage-areas/${encodeURIComponent(coverageAreaId)}/anomalies`,
    anomalyCatalogResponseSchema,
  );
}
