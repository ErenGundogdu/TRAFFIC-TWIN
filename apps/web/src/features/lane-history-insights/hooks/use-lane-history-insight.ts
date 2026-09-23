import { useQuery } from "@tanstack/react-query";

import { getLaneHistoryInsight } from "../api/get-lane-history-insight";

export function useLaneHistoryInsight(
  coverageAreaId: string,
  assetId: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: ["lane-history-insight", coverageAreaId, assetId],
    queryFn: () => getLaneHistoryInsight(coverageAreaId, assetId!),
    enabled: enabled && Boolean(assetId),
    refetchInterval: 30_000,
  });
}
