import { stationRoadContextSchema } from "@traffic-twin/contracts";

import { apiClient } from "@/shared/api/api-client";

export async function getStationRoadContext(
  coverageAreaId: string,
  assetId: string,
) {
  return apiClient.get(
    `/api/coverage-areas/${encodeURIComponent(coverageAreaId)}/stations/${encodeURIComponent(assetId)}/road-context`,
    stationRoadContextSchema,
  );
}
