import { stationCatalogResponseSchema } from "@traffic-twin/contracts";

import { apiClient } from "@/shared/api/api-client";

export async function getStationCatalog(coverageAreaId: string) {
  return apiClient.get(
    `/api/coverage-areas/${encodeURIComponent(coverageAreaId)}/stations`,
    stationCatalogResponseSchema,
  );
}
