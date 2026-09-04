import {
  historyResponseSchema,
  type HistoryQuery,
} from "@traffic-twin/contracts";

import { httpClient } from "@/shared/api/http-client";

export async function getTrafficHistory(
  coverageAreaId: string,
  query: HistoryQuery,
) {
  const response = await httpClient.get(
    `/api/analytics/${encodeURIComponent(coverageAreaId)}/history`,
    {
      params: {
        ...query,
        assetIds: query.assetIds.join(","),
      },
    },
  );

  return historyResponseSchema.parse(response.data);
}
