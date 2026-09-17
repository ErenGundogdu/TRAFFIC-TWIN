export const historyImportQueryKeys = {
  plan: (coverageAreaId: string, assetId: string, from: string, to: string) =>
    ["history-import-plan", coverageAreaId, assetId, from, to] as const,
  job: (coverageAreaId: string, jobId: string) =>
    ["history-import-job", coverageAreaId, jobId] as const,
};
