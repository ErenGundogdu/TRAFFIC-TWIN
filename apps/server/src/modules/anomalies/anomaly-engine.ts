import type {
  AnomalyConfidence,
  AnomalyMetric,
  AnomalyStatus,
} from "@traffic-twin/contracts";

export interface AnomalyPolicy {
  version: string;
  windowWeeks: number;
  minimumSamples: number;
  persistenceCount: number;
  maximumPersistenceGapMinutes: number;
  madMultiplier: number;
  minimumAbsoluteDeviation: Record<AnomalyMetric, number>;
}

export interface BaselineSample {
  timestamp: string;
  value: number;
}

export interface AnomalyResult {
  status: AnomalyStatus;
  confidence: AnomalyConfidence;
  expectedMedian: number | null;
  medianAbsoluteDeviation: number | null;
  expectedLowerBound: number | null;
  expectedUpperBound: number | null;
  absoluteDeviation: number | null;
  sampleCount: number;
  consecutiveDeviations: number;
}

export const DEFAULT_ANOMALY_POLICY: AnomalyPolicy = {
  version: "rolling-weekly-median-mad-v1",
  windowWeeks: 12,
  minimumSamples: 6,
  persistenceCount: 2,
  maximumPersistenceGapMinutes: 15,
  madMultiplier: 3 * 1.4826,
  minimumAbsoluteDeviation: {
    "average-speed-kmh": 5,
    "flow-vehicles-per-hour": 50,
  },
};

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? (sorted[middle - 1]! + sorted[middle]!) / 2
    : sorted[middle]!;
}

function confidenceFor(
  sampleCount: number,
  policy: AnomalyPolicy,
): AnomalyConfidence {
  if (sampleCount < policy.minimumSamples) return "INSUFFICIENT";

  const coverageRatio = sampleCount / policy.windowWeeks;
  if (coverageRatio >= 0.8) return "HIGH";
  if (coverageRatio >= 0.67) return "MEDIUM";
  return "LOW";
}

export function evaluateAnomaly(input: {
  metric: AnomalyMetric;
  currentValue: number;
  baselineSamples: BaselineSample[];
  previousConsecutiveDeviations: number;
  policy?: AnomalyPolicy;
}): AnomalyResult {
  const policy = input.policy ?? DEFAULT_ANOMALY_POLICY;
  const sampleCount = input.baselineSamples.length;
  const confidence = confidenceFor(sampleCount, policy);

  if (sampleCount < policy.minimumSamples) {
    return {
      status: "INSUFFICIENT_DATA",
      confidence,
      expectedMedian: null,
      medianAbsoluteDeviation: null,
      expectedLowerBound: null,
      expectedUpperBound: null,
      absoluteDeviation: null,
      sampleCount,
      consecutiveDeviations: 0,
    };
  }

  const expectedMedian = median(
    input.baselineSamples.map(({ value }) => value),
  );
  const medianAbsoluteDeviation = median(
    input.baselineSamples.map(({ value }) => Math.abs(value - expectedMedian)),
  );
  const allowedDeviation = Math.max(
    medianAbsoluteDeviation * policy.madMultiplier,
    policy.minimumAbsoluteDeviation[input.metric],
  );
  const expectedLowerBound = Math.max(0, expectedMedian - allowedDeviation);
  const expectedUpperBound = expectedMedian + allowedDeviation;
  const absoluteDeviation = Math.abs(input.currentValue - expectedMedian);
  const deviates =
    input.currentValue < expectedLowerBound ||
    input.currentValue > expectedUpperBound;
  const consecutiveDeviations = deviates
    ? input.previousConsecutiveDeviations + 1
    : 0;

  return {
    status: deviates
      ? consecutiveDeviations >= policy.persistenceCount
        ? "ACTIVE"
        : "CANDIDATE"
      : "NORMAL",
    confidence,
    expectedMedian,
    medianAbsoluteDeviation,
    expectedLowerBound,
    expectedUpperBound,
    absoluteDeviation,
    sampleCount,
    consecutiveDeviations,
  };
}
