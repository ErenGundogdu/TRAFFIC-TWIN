import { useQuery } from "@tanstack/react-query";

import { getHistoryAvailability } from "../api/get-history-availability";

export function useHistoryAvailability(coverageAreaId: string, enabled = true) {
  return useQuery({
    queryKey: ["traffic-history-availability", coverageAreaId],
    queryFn: () => getHistoryAvailability(coverageAreaId),
    enabled,
    staleTime: 60_000,
    refetchInterval: 300_000,
  });
}
