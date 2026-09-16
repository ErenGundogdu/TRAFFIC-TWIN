import { stationTrafficEventContextResponseSchema } from "@traffic-twin/contracts";

import { apiClient } from "@/shared/api/api-client";

export async function getStationTrafficEventContext(
  coverageAreaId: string,
  stationAssetId: string,
) {
  return apiClient.get(
    `/api/coverage-areas/${encodeURIComponent(coverageAreaId)}/stations/${encodeURIComponent(stationAssetId)}/traffic-event-context`,
    stationTrafficEventContextResponseSchema,
  );
}
