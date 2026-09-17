import { historyImportJobResponseSchema } from "@traffic-twin/contracts";

import { apiClient } from "@/shared/api/api-client";

export function getHistoryImportJob(coverageAreaId: string, jobId: string) {
  return apiClient.get(
    `/api/coverage-areas/${encodeURIComponent(coverageAreaId)}/history-import-jobs/${encodeURIComponent(jobId)}`,
    historyImportJobResponseSchema,
  );
}
