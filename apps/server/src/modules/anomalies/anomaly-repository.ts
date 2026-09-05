import type {
  AnomalyEvaluation,
  AnomalyMetric,
  AnomalyStatus,
} from "@traffic-twin/contracts";
import { and, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";

import type { Database } from "../../infrastructure/database/client.js";
import {
  anomalyEvaluations,
  trafficAggregates,
  trafficAssets,
} from "../../infrastructure/database/schema.js";
import type { AnomalyPolicy, BaselineSample } from "./anomaly-engine.js";

export interface HourlyBaselineRow {
  assetId: string;
  direction: 1 | 2;
  timestamp: string;
  averageSpeedKmh: number;
  flowVehiclesPerHour: number;
}

export interface PersistedAnomalyEvaluation extends AnomalyEvaluation {
  coverageAreaId: string;
  medianAbsoluteDeviation: number | null;
  baselineSamples: BaselineSample[];
  policy: AnomalyPolicy;
}

export interface PreviousAnomalyState {
  assetId: string;
  direction: 1 | 2;
  metric: AnomalyMetric;
  status: AnomalyStatus;
  observedAt: string;
  consecutiveDeviations: number;
  policyVersion: string;
}

export interface AnomalyRepository {
  listHourlyBaseline(input: {
    assetIds: string[];
    from: Date;
    to: Date;
    timeZone: string;
    localWeekday: number;
    localHour: number;
  }): Promise<HourlyBaselineRow[]>;
  listPrevious(assetIds: string[]): Promise<PreviousAnomalyState[]>;
  save(evaluations: PersistedAnomalyEvaluation[]): Promise<void>;
  listLatestCoverage(coverageAreaId: string): Promise<AnomalyEvaluation[]>;
}

export class PostgresAnomalyRepository implements AnomalyRepository {
  constructor(private readonly database: Database) {}

  async listHourlyBaseline(input: {
    assetIds: string[];
    from: Date;
    to: Date;
    timeZone: string;
    localWeekday: number;
    localHour: number;
  }): Promise<HourlyBaselineRow[]> {
    if (input.assetIds.length === 0) return [];

    const rows = await this.database
      .select({
        assetId: trafficAggregates.assetId,
        direction: trafficAggregates.direction,
        timestamp: trafficAggregates.bucketStart,
        averageSpeedKmh: trafficAggregates.averageSpeedKmh,
        vehicleCount: trafficAggregates.vehicleCount,
      })
      .from(trafficAggregates)
      .where(
        and(
          inArray(trafficAggregates.assetId, input.assetIds),
          eq(trafficAggregates.resolution, "hour"),
          gte(trafficAggregates.bucketStart, input.from),
          lt(trafficAggregates.bucketStart, input.to),
          sql`extract(isodow from timezone(${input.timeZone}, ${trafficAggregates.bucketStart})) = ${input.localWeekday}`,
          sql`extract(hour from timezone(${input.timeZone}, ${trafficAggregates.bucketStart})) = ${input.localHour}`,
        ),
      );

    return rows.flatMap((row) => {
      if (row.direction !== 1 && row.direction !== 2) return [];
      return [
        {
          assetId: row.assetId,
          direction: row.direction as 1 | 2,
          timestamp: row.timestamp.toISOString(),
          averageSpeedKmh: row.averageSpeedKmh,
          flowVehiclesPerHour: row.vehicleCount,
        },
      ];
    });
  }

  async listPrevious(assetIds: string[]): Promise<PreviousAnomalyState[]> {
    if (assetIds.length === 0) return [];

    const rows = await this.database
      .selectDistinctOn(
        [
          anomalyEvaluations.assetId,
          anomalyEvaluations.direction,
          anomalyEvaluations.metric,
        ],
        {
          assetId: anomalyEvaluations.assetId,
          direction: anomalyEvaluations.direction,
          metric: anomalyEvaluations.metric,
          status: anomalyEvaluations.status,
          observedAt: anomalyEvaluations.observedAt,
          consecutiveDeviations: anomalyEvaluations.consecutiveDeviations,
          policyVersion: anomalyEvaluations.policyVersion,
        },
      )
      .from(anomalyEvaluations)
      .where(inArray(anomalyEvaluations.assetId, assetIds))
      .orderBy(
        anomalyEvaluations.assetId,
        anomalyEvaluations.direction,
        anomalyEvaluations.metric,
        desc(anomalyEvaluations.observedAt),
      );

    return rows.flatMap((row) => {
      if (row.direction !== 1 && row.direction !== 2) return [];
      return [
        {
          ...row,
          direction: row.direction as 1 | 2,
          observedAt: row.observedAt.toISOString(),
        },
      ];
    });
  }

  async save(evaluations: PersistedAnomalyEvaluation[]): Promise<void> {
    if (evaluations.length === 0) return;

    await this.database
      .insert(anomalyEvaluations)
      .values(
        evaluations.map((evaluation) => ({
          id: evaluation.id,
          coverageAreaId: evaluation.coverageAreaId,
          assetId: evaluation.assetId,
          direction: evaluation.direction,
          metric: evaluation.metric,
          status: evaluation.status,
          confidence: evaluation.confidence,
          observedAt: new Date(evaluation.observedAt),
          currentValue: evaluation.currentValue,
          expectedMedian: evaluation.expectedMedian,
          medianAbsoluteDeviation: evaluation.medianAbsoluteDeviation,
          expectedLowerBound: evaluation.expectedLowerBound,
          expectedUpperBound: evaluation.expectedUpperBound,
          absoluteDeviation: evaluation.absoluteDeviation,
          sampleCount: evaluation.sampleCount,
          consecutiveDeviations: evaluation.consecutiveDeviations,
          policyVersion: evaluation.policyVersion,
          baselineWindowWeeks: evaluation.baselineWindowWeeks,
          baselineStart: new Date(evaluation.baselineStart),
          baselineEnd: new Date(evaluation.baselineEnd),
          baselineSamples: evaluation.baselineSamples,
          policySnapshot: evaluation.policy,
          localTimeZone: evaluation.localTimeZone,
          localWeekday: evaluation.localWeekday,
          localHour: evaluation.localHour,
        })),
      )
      .onConflictDoUpdate({
        target: [
          anomalyEvaluations.assetId,
          anomalyEvaluations.direction,
          anomalyEvaluations.metric,
          anomalyEvaluations.policyVersion,
        ],
        set: {
          status: sql`excluded.status`,
          confidence: sql`excluded.confidence`,
          observedAt: sql`excluded.observed_at`,
          currentValue: sql`excluded.current_value`,
          expectedMedian: sql`excluded.expected_median`,
          medianAbsoluteDeviation: sql`excluded.median_absolute_deviation`,
          expectedLowerBound: sql`excluded.expected_lower_bound`,
          expectedUpperBound: sql`excluded.expected_upper_bound`,
          absoluteDeviation: sql`excluded.absolute_deviation`,
          sampleCount: sql`excluded.sample_count`,
          consecutiveDeviations: sql`excluded.consecutive_deviations`,
          baselineWindowWeeks: sql`excluded.baseline_window_weeks`,
          baselineStart: sql`excluded.baseline_start`,
          baselineEnd: sql`excluded.baseline_end`,
          baselineSamples: sql`excluded.baseline_samples`,
          policySnapshot: sql`excluded.policy_snapshot`,
          localTimeZone: sql`excluded.local_time_zone`,
          localWeekday: sql`excluded.local_weekday`,
          localHour: sql`excluded.local_hour`,
          updatedAt: new Date(),
        },
      });
  }

  async listLatestCoverage(coverageAreaId: string) {
    const rows = await this.database
      .selectDistinctOn(
        [
          anomalyEvaluations.assetId,
          anomalyEvaluations.direction,
          anomalyEvaluations.metric,
        ],
        {
          id: anomalyEvaluations.id,
          assetId: anomalyEvaluations.assetId,
          direction: anomalyEvaluations.direction,
          metric: anomalyEvaluations.metric,
          status: anomalyEvaluations.status,
          confidence: anomalyEvaluations.confidence,
          observedAt: anomalyEvaluations.observedAt,
          currentValue: anomalyEvaluations.currentValue,
          expectedMedian: anomalyEvaluations.expectedMedian,
          expectedLowerBound: anomalyEvaluations.expectedLowerBound,
          expectedUpperBound: anomalyEvaluations.expectedUpperBound,
          absoluteDeviation: anomalyEvaluations.absoluteDeviation,
          sampleCount: anomalyEvaluations.sampleCount,
          consecutiveDeviations: anomalyEvaluations.consecutiveDeviations,
          policyVersion: anomalyEvaluations.policyVersion,
          baselineWindowWeeks: anomalyEvaluations.baselineWindowWeeks,
          baselineStart: anomalyEvaluations.baselineStart,
          baselineEnd: anomalyEvaluations.baselineEnd,
          localTimeZone: anomalyEvaluations.localTimeZone,
          localWeekday: anomalyEvaluations.localWeekday,
          localHour: anomalyEvaluations.localHour,
          policySnapshot: anomalyEvaluations.policySnapshot,
        },
      )
      .from(anomalyEvaluations)
      .innerJoin(
        trafficAssets,
        eq(trafficAssets.id, anomalyEvaluations.assetId),
      )
      .where(eq(trafficAssets.coverageAreaId, coverageAreaId))
      .orderBy(
        anomalyEvaluations.assetId,
        anomalyEvaluations.direction,
        anomalyEvaluations.metric,
        desc(anomalyEvaluations.observedAt),
      );

    return rows.flatMap((row) => {
      if (row.direction !== 1 && row.direction !== 2) return [];
      return [
        {
          ...row,
          direction: row.direction as 1 | 2,
          observedAt: row.observedAt.toISOString(),
          baselineStart: row.baselineStart.toISOString(),
          baselineEnd: row.baselineEnd.toISOString(),
          minimumSamples: row.policySnapshot.minimumSamples,
          requiredConsecutiveDeviations: row.policySnapshot.persistenceCount,
        },
      ];
    });
  }
}
