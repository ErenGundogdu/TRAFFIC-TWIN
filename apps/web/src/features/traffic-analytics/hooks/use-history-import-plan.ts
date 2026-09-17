import type { HistoryImportPlanQuery } from "@traffic-twin/contracts";
import { useQuery } from "@tanstack/react-query";

import { getHistoryImportPlan } from "../api/get-history-import-plan";
import { historyImportQueryKeys } from "../model/history-import-query-keys";

export function useHistoryImportPlan(
  coverageAreaId: string,
  query: HistoryImportPlanQuery,
) {
  return useQuery({
    queryKey: historyImportQueryKeys.plan(
      coverageAreaId,
      query.assetId,
      query.from,
      query.to,
    ),
    queryFn: () => getHistoryImportPlan(coverageAreaId, query),
    staleTime: 5_000,
  });
}
