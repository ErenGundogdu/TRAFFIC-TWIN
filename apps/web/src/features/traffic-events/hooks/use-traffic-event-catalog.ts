import { useQuery } from "@tanstack/react-query";

import { getTrafficEventCatalog } from "../api/get-traffic-event-catalog";

export function useTrafficEventCatalog(coverageAreaId: string) {
  return useQuery({
    queryKey: ["traffic-events", coverageAreaId],
    queryFn: () => getTrafficEventCatalog(coverageAreaId),
    refetchInterval: 60_000,
  });
}
