import { fieldReportListSchema } from "@traffic-twin/contracts";

import { apiClient } from "@/shared/api/api-client";

export async function getFieldReports(coverageAreaId: string) {
  const response = await apiClient.get(
    `/api/coverage-areas/${encodeURIComponent(coverageAreaId)}/field-reports`,
    fieldReportListSchema,
  );
  return response.reports;
}
