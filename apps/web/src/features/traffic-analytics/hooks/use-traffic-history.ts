import type { HistoryQuery } from "@traffic-twin/contracts";
import { useQuery } from "@tanstack/react-query";

import { getTrafficHistory } from "../api/get-traffic-history";

export function useTrafficHistory(coverageAreaId: string, query: HistoryQuery) {
  return useQuery({
    queryKey: ["traffic-history", coverageAreaId, query],
    queryFn: () => getTrafficHistory(coverageAreaId, query),
  });
}
