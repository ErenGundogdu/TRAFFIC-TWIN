import type { HistoryQuery } from "@traffic-twin/contracts";

import {
  createInclusiveHistoryRange,
  type AnalyticsFilterValues,
} from "./analytics-filters";

export function createAnalyticsHistoryQuery({
  selectedStationId,
  filters,
  timeZone,
}: {
  selectedStationId: string;
  filters: AnalyticsFilterValues;
  timeZone: string;
}): HistoryQuery {
  const historyRange = createInclusiveHistoryRange(
    filters.fromDate,
    filters.toDate,
    timeZone,
  );

  return {
    assetIds: [selectedStationId, filters.compareAssetId].filter(Boolean),
    metric: filters.metric,
    direction: Number(filters.direction) as 1 | 2,
    resolution: filters.resolution,
    from: historyRange.from,
    to: historyRange.to,
  };
}
