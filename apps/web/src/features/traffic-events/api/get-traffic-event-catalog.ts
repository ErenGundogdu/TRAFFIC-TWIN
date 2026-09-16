import { trafficEventCatalogResponseSchema } from "@traffic-twin/contracts";

import { apiClient } from "@/shared/api/api-client";

export async function getTrafficEventCatalog(coverageAreaId: string) {
  return apiClient.get(
    `/api/coverage-areas/${encodeURIComponent(coverageAreaId)}/traffic-events`,
    trafficEventCatalogResponseSchema,
  );
}
