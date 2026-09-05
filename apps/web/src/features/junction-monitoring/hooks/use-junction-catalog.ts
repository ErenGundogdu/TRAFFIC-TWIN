import { useQuery } from "@tanstack/react-query";

import { getJunctionCatalog } from "../api/get-junction-catalog";

export function useJunctionCatalog(coverageAreaId: string) {
  return useQuery({
    queryKey: ["junction-catalog", coverageAreaId],
    queryFn: () => getJunctionCatalog(coverageAreaId),
  });
}
