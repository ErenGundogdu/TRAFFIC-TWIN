import { stationRoadContextSchema } from "@traffic-twin/contracts";

import { httpClient } from "@/shared/api/http-client";

export async function getStationRoadContext(
  coverageAreaId: string,
  assetId: string,
) {
  const response = await httpClient.get(
    `/api/coverage-areas/${encodeURIComponent(coverageAreaId)}/stations/${encodeURIComponent(assetId)}/road-context`,
  );
  return stationRoadContextSchema.parse(response.data);
}
