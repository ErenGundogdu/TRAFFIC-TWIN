import { stationCatalogResponseSchema } from "@traffic-twin/contracts";

import { httpClient } from "@/shared/api/http-client";

export async function getStationCatalog(coverageAreaId: string) {
  const response = await httpClient.get(
    `/api/coverage-areas/${encodeURIComponent(coverageAreaId)}/stations`,
  );

  return stationCatalogResponseSchema.parse(response.data);
}
