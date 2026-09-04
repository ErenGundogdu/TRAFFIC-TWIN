import { useQuery } from "@tanstack/react-query";

import { getStationCatalog } from "../api/get-station-catalog";

export function useStationCatalog(coverageAreaId: string) {
  return useQuery({
    queryKey: ["station-catalog", coverageAreaId],
    queryFn: () => getStationCatalog(coverageAreaId),
  });
}
