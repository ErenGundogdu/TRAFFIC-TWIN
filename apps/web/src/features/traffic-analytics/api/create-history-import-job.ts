import {
  historyImportJobResponseSchema,
  type CreateHistoryImportJob,
} from "@traffic-twin/contracts";

import { apiClient } from "@/shared/api/api-client";

export function createHistoryImportJob(
  coverageAreaId: string,
  command: CreateHistoryImportJob,
) {
  return apiClient.post(
    `/api/coverage-areas/${encodeURIComponent(coverageAreaId)}/history-import-jobs`,
    command,
    historyImportJobResponseSchema,
  );
}
