import { useQuery } from "@tanstack/react-query";

import { getAnomalyCatalog } from "../api/get-anomaly-catalog";

export function useAnomalyCatalog(coverageAreaId: string) {
  return useQuery({
    queryKey: ["anomalies", coverageAreaId],
    queryFn: () => getAnomalyCatalog(coverageAreaId),
    refetchInterval: 60_000,
  });
}
