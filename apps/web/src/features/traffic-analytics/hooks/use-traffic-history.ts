import type { HistoryQuery } from "@traffic-twin/contracts";
import { useQuery } from "@tanstack/react-query";

import { getTrafficHistory } from "../api/get-traffic-history";

export function useTrafficHistory(
  coverageAreaId: string,
  query: HistoryQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: ["traffic-history", coverageAreaId, query],
    queryFn: () => getTrafficHistory(coverageAreaId, query),
    refetchInterval: 300_000,
    enabled,
  });
}
