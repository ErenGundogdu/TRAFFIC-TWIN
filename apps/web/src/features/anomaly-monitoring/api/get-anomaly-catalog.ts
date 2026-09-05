import { anomalyCatalogResponseSchema } from "@traffic-twin/contracts";

import { httpClient } from "@/shared/api/http-client";

export async function getAnomalyCatalog(coverageAreaId: string) {
  const response = await httpClient.get(
    `/api/coverage-areas/${coverageAreaId}/anomalies`,
  );
  return anomalyCatalogResponseSchema.parse(response.data);
}
