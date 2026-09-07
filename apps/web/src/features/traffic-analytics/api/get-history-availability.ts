import { historyAvailabilityResponseSchema } from "@traffic-twin/contracts";

import { httpClient } from "@/shared/api/http-client";

export async function getHistoryAvailability(coverageAreaId: string) {
  const response = await httpClient.get(
    `/api/analytics/${encodeURIComponent(coverageAreaId)}/availability`,
  );

  return historyAvailabilityResponseSchema.parse(response.data);
}
