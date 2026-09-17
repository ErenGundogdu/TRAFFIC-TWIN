import { useQuery } from "@tanstack/react-query";

import { getHistoryImportJob } from "../api/get-history-import-job";
import { historyImportQueryKeys } from "../model/history-import-query-keys";

export function useHistoryImportJob(
  coverageAreaId: string,
  jobId: string | null,
) {
  return useQuery({
    queryKey: historyImportQueryKeys.job(coverageAreaId, jobId ?? "none"),
    queryFn: () => getHistoryImportJob(coverageAreaId, jobId!),
    enabled: jobId !== null,
    refetchInterval: (query) => {
      const status = query.state.data?.job.status;
      return status === "QUEUED" || status === "RUNNING" ? 1_000 : false;
    },
    staleTime: 0,
  });
}
