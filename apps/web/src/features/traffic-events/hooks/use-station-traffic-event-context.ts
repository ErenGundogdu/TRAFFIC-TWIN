import { useQuery } from "@tanstack/react-query";

import { getStationTrafficEventContext } from "../api/get-station-traffic-event-context";

export function useStationTrafficEventContext(
  coverageAreaId: string,
  stationAssetId: string | null,
) {
  return useQuery({
    queryKey: ["traffic-event-context", coverageAreaId, stationAssetId],
    queryFn: () =>
      getStationTrafficEventContext(coverageAreaId, stationAssetId!),
    enabled: stationAssetId !== null,
    staleTime: 60_000,
  });
}
