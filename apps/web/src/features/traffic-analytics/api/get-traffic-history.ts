import {
  historyResponseSchema,
  type HistoryQuery,
} from "@traffic-twin/contracts";

import { apiClient } from "@/shared/api/api-client";

export async function getTrafficHistory(
  coverageAreaId: string,
  query: HistoryQuery,
) {
  return apiClient.get(
    `/api/analytics/${encodeURIComponent(coverageAreaId)}/history`,
    historyResponseSchema,
    {
      params: {
        ...query,
        assetIds: query.assetIds.join(","),
      },
    },
  );
}
