import type {
  TrafficCompositionBreakdown,
  TrafficCompositionSummary,
} from "@traffic-twin/contracts";

const FREIGHT_VEHICLE_CLASSES = new Set([2, 4, 5, 9]);

export interface TrafficCompositionSourceRow {
  vehicleClassBreakdown: TrafficCompositionBreakdown;
  laneBreakdown: TrafficCompositionBreakdown;
  laneVehicleClassBreakdown: TrafficCompositionBreakdown;
}

export function summarizeTrafficComposition(
  rows: TrafficCompositionSourceRow[],
  totalVehicleCount: number,
): TrafficCompositionSummary {
  const vehicleClasses = mergeBreakdowns(
    rows.map((row) => row.vehicleClassBreakdown),
  );
  const lanes = mergeBreakdowns(rows.map((row) => row.laneBreakdown));
  const laneVehicleClasses = mergeBreakdowns(
    rows.map((row) => row.laneVehicleClassBreakdown),
  );
  const classifiedVehicleCount = totalCount(vehicleClasses);
  const laneVehicleClassCount = totalCount(laneVehicleClasses);
  const freightVehicleCount = [...vehicleClasses.entries()].reduce(
    (total, [key, value]) =>
      FREIGHT_VEHICLE_CLASSES.has(Number(key))
        ? total + value.vehicleCount
        : total,
    0,
  );

  return {
    classifiedVehicleCount,
    classificationCoveragePercent:
      totalVehicleCount > 0
        ? percentage(classifiedVehicleCount, totalVehicleCount)
        : null,
    vehicleClasses: toDimensionSummaries(
      vehicleClasses,
      classifiedVehicleCount,
    ),
    lanes: toDimensionSummaries(lanes, totalCount(lanes)),
    laneVehicleClasses: [...laneVehicleClasses.entries()]
      .flatMap(([key, value]) => {
        const [lane, vehicleClass] = key.split(":").map(Number);
        if (!lane || !vehicleClass) return [];
        return [
          {
            lane,
            vehicleClass,
            vehicleCount: value.vehicleCount,
            sharePercent: percentage(value.vehicleCount, laneVehicleClassCount),
            averageSpeedKmh: averageSpeed(value),
          },
        ];
      })
      .sort(
        (left, right) =>
          left.lane - right.lane || left.vehicleClass - right.vehicleClass,
      ),
    freightProxy: {
      vehicleCount: freightVehicleCount,
      sharePercent: percentage(freightVehicleCount, classifiedVehicleCount),
      policyVersion: "fintraffic-freight-proxy-v1",
    },
  };
}

function mergeBreakdowns(breakdowns: TrafficCompositionBreakdown[]) {
  const merged = new Map<
    string,
    { vehicleCount: number; speedTotalKmh: number }
  >();
  for (const breakdown of breakdowns) {
    for (const [key, value] of Object.entries(breakdown)) {
      const current = merged.get(key) ?? {
        vehicleCount: 0,
        speedTotalKmh: 0,
      };
      current.vehicleCount += value.vehicleCount;
      current.speedTotalKmh += value.speedTotalKmh;
      merged.set(key, current);
    }
  }
  return merged;
}

function toDimensionSummaries(
  breakdown: ReturnType<typeof mergeBreakdowns>,
  denominator: number,
) {
  return [...breakdown.entries()]
    .flatMap(([key, value]) => {
      const numericKey = Number(key);
      if (!Number.isInteger(numericKey) || numericKey < 1) return [];
      return [
        {
          key: numericKey,
          vehicleCount: value.vehicleCount,
          sharePercent: percentage(value.vehicleCount, denominator),
          averageSpeedKmh: averageSpeed(value),
        },
      ];
    })
    .sort((left, right) => left.key - right.key);
}

function totalCount(
  breakdown: Map<string, { vehicleCount: number; speedTotalKmh: number }>,
) {
  return [...breakdown.values()].reduce(
    (total, value) => total + value.vehicleCount,
    0,
  );
}

function averageSpeed(value: { vehicleCount: number; speedTotalKmh: number }) {
  return value.vehicleCount > 0
    ? round(value.speedTotalKmh / value.vehicleCount)
    : null;
}

function percentage(value: number, total: number) {
  return total > 0 ? round((value / total) * 100) : null;
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}
