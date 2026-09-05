import { junctionCatalogResponseSchema } from "@traffic-twin/contracts";

import { httpClient } from "@/shared/api/http-client";

export async function getJunctionCatalog(coverageAreaId: string) {
  const response = await httpClient.get(
    `/api/coverage-areas/${encodeURIComponent(coverageAreaId)}/junctions`,
  );
  return junctionCatalogResponseSchema.parse(response.data);
}
