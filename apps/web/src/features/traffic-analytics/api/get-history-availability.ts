import { historyAvailabilityResponseSchema } from "@traffic-twin/contracts";

import { apiClient } from "@/shared/api/api-client";

export async function getHistoryAvailability(coverageAreaId: string) {
  return apiClient.get(
    `/api/analytics/${encodeURIComponent(coverageAreaId)}/availability`,
    historyAvailabilityResponseSchema,
  );
}
