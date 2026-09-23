import type { HistorySummary } from "@traffic-twin/contracts";
import type { TrafficCompositionSourceRow } from "./traffic-composition-summary.js";
import { summarizeTrafficComposition } from "./traffic-composition-summary.js";

export interface HistorySummaryRow extends TrafficCompositionSourceRow {
  assetId: string;
  direction: number;
  bucketStart: Date;
  averageSpeedKmh: number | null;
  vehicleCount: number;
  sampleCount: number;
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? round((sorted[middle - 1]! + sorted[middle]!) / 2)
    : round(sorted[middle]!);
}

export function summarizeHistory(input: {
  assetIds: string[];
  assetNames: Map<string, string>;
  direction: 1 | 2;
  rows: HistorySummaryRow[];
}): HistorySummary[] {
  return input.assetIds.map((assetId) => {
    const assetRows = input.rows.filter((row) => row.assetId === assetId);
    const selectedRows = assetRows.filter(
      (row) => row.direction === input.direction,
    );
    const speedRows = selectedRows.filter(
      (row): row is HistorySummaryRow & { averageSpeedKmh: number } =>
        row.averageSpeedKmh !== null,
    );
    const sampleCount = selectedRows.reduce(
      (total, row) => total + row.sampleCount,
      0,
    );
    const totalVehicleCount = selectedRows.reduce(
      (total, row) => total + row.vehicleCount,
      0,
    );
    const weightedSpeedTotal = speedRows.reduce(
      (total, row) => total + row.averageSpeedKmh * row.sampleCount,
      0,
    );
    const minimumSpeedRow = speedRows.reduce<(typeof speedRows)[number] | null>(
      (lowest, row) =>
        !lowest || row.averageSpeedKmh < lowest.averageSpeedKmh ? row : lowest,
      null,
    );
    const maximumSpeedRow = speedRows.reduce<(typeof speedRows)[number] | null>(
      (highest, row) =>
        !highest || row.averageSpeedKmh > highest.averageSpeedKmh
          ? row
          : highest,
      null,
    );
    const peakVehicleRow = selectedRows.reduce<HistorySummaryRow | null>(
      (peak, row) =>
        !peak || row.vehicleCount > peak.vehicleCount ? row : peak,
      null,
    );
    const directionOneVehicleCount = assetRows
      .filter((row) => row.direction === 1)
      .reduce((total, row) => total + row.vehicleCount, 0);
    const directionTwoVehicleCount = assetRows
      .filter((row) => row.direction === 2)
      .reduce((total, row) => total + row.vehicleCount, 0);
    const bothDirectionsTotal =
      directionOneVehicleCount + directionTwoVehicleCount;

    return {
      assetId,
      assetName: input.assetNames.get(assetId) ?? assetId,
      direction: input.direction,
      bucketCount: selectedRows.length,
      sampleCount,
      averageSpeedKmh:
        sampleCount > 0 ? round(weightedSpeedTotal / sampleCount) : null,
      medianSpeedKmh: median(speedRows.map((row) => row.averageSpeedKmh)),
      minimumSpeedKmh: minimumSpeedRow
        ? round(minimumSpeedRow.averageSpeedKmh)
        : null,
      minimumSpeedAt: minimumSpeedRow?.bucketStart.toISOString() ?? null,
      maximumSpeedKmh: maximumSpeedRow
        ? round(maximumSpeedRow.averageSpeedKmh)
        : null,
      maximumSpeedAt: maximumSpeedRow?.bucketStart.toISOString() ?? null,
      totalVehicleCount,
      averageVehicleCountPerBucket:
        selectedRows.length > 0
          ? round(totalVehicleCount / selectedRows.length)
          : null,
      peakVehicleCount: peakVehicleRow?.vehicleCount ?? null,
      peakVehicleAt: peakVehicleRow?.bucketStart.toISOString() ?? null,
      speedAtPeakVehicleCountKmh:
        peakVehicleRow?.averageSpeedKmh != null
          ? round(peakVehicleRow.averageSpeedKmh)
          : null,
      directionDistribution: {
        directionOneVehicleCount,
        directionTwoVehicleCount,
        directionOnePercent:
          bothDirectionsTotal > 0
            ? round((directionOneVehicleCount / bothDirectionsTotal) * 100)
            : null,
        directionTwoPercent:
          bothDirectionsTotal > 0
            ? round((directionTwoVehicleCount / bothDirectionsTotal) * 100)
            : null,
      },
      composition: summarizeTrafficComposition(selectedRows, totalVehicleCount),
    };
  });
}
