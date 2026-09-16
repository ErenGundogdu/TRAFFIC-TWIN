import { useQuery } from "@tanstack/react-query";

import { getStationRoadContext } from "../api/get-station-road-context";

export function useStationRoadContext(
  coverageAreaId: string,
  assetId: string | null,
) {
  return useQuery({
    queryKey: ["station-road-context", coverageAreaId, assetId],
    queryFn: () => getStationRoadContext(coverageAreaId, assetId!),
    enabled: Boolean(assetId),
    staleTime: (query) =>
      query.state.data?.freshness === "STALE"
        ? 5 * 60 * 1_000
        : 24 * 60 * 60 * 1_000,
    retry: 1,
  });
}
