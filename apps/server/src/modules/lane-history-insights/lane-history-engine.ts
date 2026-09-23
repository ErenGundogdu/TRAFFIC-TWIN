import type {
  LaneHistoryEvaluation,
  LaneMetricBaseline,
  TrafficLane,
} from "@traffic-twin/contracts";

import type { HourlyLaneHistoryRow } from "./lane-history-repository.js";

export interface LaneHistoryPolicy {
  version: "lane-hourly-median-mad-v1";
  windowWeeks: number;
  minimumSamples: number;
  madMultiplier: number;
  minimumSpeedDeviationKmh: number;
  minimumFlowDeviationVehiclesPerHour: number;
}

export const DEFAULT_LANE_HISTORY_POLICY: LaneHistoryPolicy = {
  version: "lane-hourly-median-mad-v1",
  windowWeeks: 12,
  minimumSamples: 6,
  madMultiplier: 3 * 1.4826,
  minimumSpeedDeviationKmh: 5,
  minimumFlowDeviationVehiclesPerHour: 60,
};

export function evaluateLaneHistory(
  lanes: TrafficLane[],
  rows: HourlyLaneHistoryRow[],
  policy: LaneHistoryPolicy = DEFAULT_LANE_HISTORY_POLICY,
): LaneHistoryEvaluation[] {
  return lanes.flatMap((lane) => {
    if (
      lane.direction === null ||
      lane.measuredAt === null ||
      lane.averageSpeedKmh === null
    ) {
      return [];
    }
    const samples = rows.flatMap((row) => {
      if (row.direction !== lane.direction) return [];
      const value = row.laneBreakdown[String(lane.lane)];
      if (!value || value.vehicleCount <= 0) return [];
      return [
        {
          speed: value.speedTotalKmh / value.vehicleCount,
          flow: value.vehicleCount,
        },
      ];
    });

    return [
      {
        lane: lane.lane,
        direction: lane.direction,
        measuredAt: lane.measuredAt,
        speed: evaluateMetric(
          lane.averageSpeedKmh,
          samples.map((sample) => sample.speed),
          policy.minimumSpeedDeviationKmh,
          policy,
        ),
        flow: evaluateMetric(
          lane.flowVehiclesPerHour,
          samples.map((sample) => sample.flow),
          policy.minimumFlowDeviationVehiclesPerHour,
          policy,
        ),
      },
    ];
  });
}

function evaluateMetric(
  currentValue: number | null,
  samples: number[],
  minimumDeviation: number,
  policy: LaneHistoryPolicy,
): LaneMetricBaseline {
  if (currentValue === null || samples.length < policy.minimumSamples) {
    return {
      currentValue,
      expectedMedian: null,
      expectedLowerBound: null,
      expectedUpperBound: null,
      state: "INSUFFICIENT_DATA",
      sampleCount: samples.length,
    };
  }
  const expectedMedian = median(samples);
  const mad = median(samples.map((value) => Math.abs(value - expectedMedian)));
  const allowedDeviation = Math.max(
    mad * policy.madMultiplier,
    minimumDeviation,
  );
  const expectedLowerBound = Math.max(0, expectedMedian - allowedDeviation);
  const expectedUpperBound = expectedMedian + allowedDeviation;
  return {
    currentValue,
    expectedMedian,
    expectedLowerBound,
    expectedUpperBound,
    state:
      currentValue < expectedLowerBound
        ? "LOW"
        : currentValue > expectedUpperBound
          ? "HIGH"
          : "EXPECTED",
    sampleCount: samples.length,
  };
}

function median(values: number[]) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1]! + sorted[middle]!) / 2
    : sorted[middle]!;
}
