import { useQuery } from "@tanstack/react-query";

import { getFieldReports } from "../api/get-field-reports";
import { fieldReportsQueryKey } from "../model/field-reports-query-key";

export function useFieldReports(coverageAreaId: string) {
  return useQuery({
    queryKey: fieldReportsQueryKey(coverageAreaId),
    queryFn: () => getFieldReports(coverageAreaId),
  });
}
