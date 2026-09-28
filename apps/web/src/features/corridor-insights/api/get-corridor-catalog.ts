import { corridorCatalogResponseSchema } from "@traffic-twin/contracts";

import { apiClient } from "@/shared/api/api-client";

export function getCorridorCatalog(coverageAreaId: string) {
  return apiClient.get(
    `/api/coverage-areas/${encodeURIComponent(coverageAreaId)}/corridors`,
    corridorCatalogResponseSchema,
  );
}
