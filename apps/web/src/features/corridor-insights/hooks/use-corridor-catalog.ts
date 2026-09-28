import { useQuery } from "@tanstack/react-query";

import { getCorridorCatalog } from "../api/get-corridor-catalog";

export function useCorridorCatalog(coverageAreaId: string) {
  return useQuery({
    queryKey: ["corridor-catalog", coverageAreaId],
    queryFn: () => getCorridorCatalog(coverageAreaId),
    staleTime: 5 * 60_000,
  });
}
