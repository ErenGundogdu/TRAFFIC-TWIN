import type { CreateHistoryImportJob } from "@traffic-twin/contracts";
import { useMutation } from "@tanstack/react-query";

import { createHistoryImportJob } from "../api/create-history-import-job";

export function useCreateHistoryImportJob(coverageAreaId: string) {
  return useMutation({
    mutationFn: (command: CreateHistoryImportJob) =>
      createHistoryImportJob(coverageAreaId, command),
  });
}
