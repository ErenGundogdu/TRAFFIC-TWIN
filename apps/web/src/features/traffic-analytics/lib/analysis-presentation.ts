import type { HistoryResponse, HistorySummary } from "@traffic-twin/contracts";

export interface AnalysisPresentation {
  primary: HistorySummary | null;
  comparison: HistorySummary | null;
  averageSpeedDifferenceKmh: number | null;
  averageSpeedDifferencePercent: number | null;
  vehicleCountDifference: number | null;
  vehicleCountDifferencePercent: number | null;
  coveragePercent: number;
}

export function createAnalysisPresentation(
  history: HistoryResponse,
): AnalysisPresentation {
  const primary = history.summaries[0] ?? null;
  const comparison = history.summaries[1] ?? null;

  return {
    primary,
    comparison,
    averageSpeedDifferenceKmh: calculateDifference(
      primary?.averageSpeedKmh ?? null,
      comparison?.averageSpeedKmh ?? null,
    ),
    averageSpeedDifferencePercent: calculatePercentDifference(
      primary?.averageSpeedKmh ?? null,
      comparison?.averageSpeedKmh ?? null,
    ),
    vehicleCountDifference:
      primary && comparison
        ? primary.totalVehicleCount - comparison.totalVehicleCount
        : null,
    vehicleCountDifferencePercent: calculatePercentDifference(
      primary?.totalVehicleCount ?? null,
      comparison?.totalVehicleCount ?? null,
    ),
    coveragePercent: Math.round(
      (history.coverage.availableDays / history.coverage.requestedDays) * 100,
    ),
  };
}

function calculatePercentDifference(
  primary: number | null,
  comparison: number | null,
) {
  if (primary === null || comparison === null || comparison === 0) return null;
  return ((primary - comparison) / comparison) * 100;
}

function calculateDifference(
  primary: number | null,
  comparison: number | null,
) {
  if (primary === null || comparison === null) return null;
  return primary - comparison;
}
