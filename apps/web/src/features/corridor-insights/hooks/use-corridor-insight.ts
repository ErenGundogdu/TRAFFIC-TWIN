import { useQuery } from "@tanstack/react-query";

import { getCorridorInsight } from "../api/get-corridor-insight";

export function useCorridorInsight(
  coverageAreaId: string,
  assetId: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: ["corridor-insight", coverageAreaId, assetId],
    queryFn: () => getCorridorInsight(coverageAreaId, assetId!),
    enabled: enabled && Boolean(assetId),
    refetchInterval: 30_000,
  });
}
