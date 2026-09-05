import type {
  AnomalyCatalogResponse,
  AnomalyMetric,
} from "@traffic-twin/contracts";

import type { StationCatalogRepository } from "../asset-catalog/station-catalog-repository.js";
import { CoverageAreaNotFoundError } from "../asset-catalog/station-catalog-service.js";
import type { TrafficObservationRepository } from "../telemetry/traffic-observation-repository.js";
import {
  DEFAULT_ANOMALY_POLICY,
  evaluateAnomaly,
  type AnomalyPolicy,
  type BaselineSample,
} from "./anomaly-engine.js";
import type {
  AnomalyRepository,
  HourlyBaselineRow,
  PersistedAnomalyEvaluation,
  PreviousAnomalyState,
} from "./anomaly-repository.js";
import { getLocalTimeSlot } from "./local-time-slot.js";

interface EvaluationTarget {
  assetId: string;
  direction: 1 | 2;
  metric: AnomalyMetric;
  currentValue: number;
  observedAt: Date;
  localWeekday: number;
  localHour: number;
}

function evaluationKey(input: {
  assetId: string;
  direction: 1 | 2;
  metric: AnomalyMetric;
}) {
  return `${input.assetId}|${input.direction}|${input.metric}`;
}

function baselineFor(
  target: EvaluationTarget,
  rows: HourlyBaselineRow[],
  windowStart: Date,
): BaselineSample[] {
  return rows
    .filter(
      (row) =>
        row.assetId === target.assetId &&
        row.direction === target.direction &&
        new Date(row.timestamp) >= windowStart &&
        new Date(row.timestamp) < target.observedAt,
    )
    .map((row) => ({
      timestamp: row.timestamp,
      value:
        target.metric === "average-speed-kmh"
          ? row.averageSpeedKmh
          : row.flowVehiclesPerHour,
    }))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

function previousCount(
  target: EvaluationTarget,
  previous: PreviousAnomalyState | undefined,
  policy: AnomalyPolicy,
) {
  if (!previous || previous.policyVersion !== policy.version) return 0;

  const gap =
    target.observedAt.getTime() - new Date(previous.observedAt).getTime();
  if (gap <= 0 || gap > policy.maximumPersistenceGapMinutes * 60_000) return 0;

  return previous.status === "CANDIDATE" || previous.status === "ACTIVE"
    ? previous.consecutiveDeviations
    : 0;
}

function groupTargetsByLocalSlot(targets: EvaluationTarget[]) {
  const groups = new Map<string, EvaluationTarget[]>();
  for (const target of targets) {
    const key = `${target.localWeekday}|${target.localHour}`;
    groups.set(key, [...(groups.get(key) ?? []), target]);
  }
  return groups;
}

export class AnomalyService {
  constructor(
    private readonly stationRepository: StationCatalogRepository,
    private readonly observationRepository: TrafficObservationRepository,
    private readonly anomalyRepository: AnomalyRepository,
    private readonly policy: AnomalyPolicy = DEFAULT_ANOMALY_POLICY,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async evaluateCoverage(coverageAreaId: string) {
    const coverageArea =
      await this.stationRepository.findCoverageArea(coverageAreaId);
    if (!coverageArea) throw new CoverageAreaNotFoundError(coverageAreaId);

    const stations = await this.stationRepository.listStations(coverageAreaId);
    const directions = await this.observationRepository.listLatestDirections(
      stations.map((station) => station.id),
    );
    const targets = directions.flatMap((direction): EvaluationTarget[] => {
      const observedAt = new Date(direction.measuredAt);
      const localSlot = getLocalTimeSlot(observedAt, coverageArea.timeZone);
      const common = {
        assetId: direction.assetId,
        direction: direction.direction,
        observedAt,
        localWeekday: localSlot.weekday,
        localHour: localSlot.hour,
      };

      return [
        ...(direction.averageSpeedKmh === null
          ? []
          : [
              {
                ...common,
                metric: "average-speed-kmh" as const,
                currentValue: direction.averageSpeedKmh,
              },
            ]),
        ...(direction.flowVehiclesPerHour === null
          ? []
          : [
              {
                ...common,
                metric: "flow-vehicles-per-hour" as const,
                currentValue: direction.flowVehiclesPerHour,
              },
            ]),
      ];
    });
    const previous = await this.anomalyRepository.listPrevious(
      stations.map((station) => station.id),
    );
    const previousByKey = new Map(
      previous.map((item) => [evaluationKey(item), item]),
    );
    const pendingTargets = targets.filter((target) => {
      const item = previousByKey.get(evaluationKey(target));
      return !(
        item?.policyVersion === this.policy.version &&
        item.observedAt === target.observedAt.toISOString()
      );
    });
    const slotGroups = groupTargetsByLocalSlot(pendingTargets);
    const evaluations: PersistedAnomalyEvaluation[] = [];

    for (const group of slotGroups.values()) {
      const earliest = Math.min(
        ...group.map((target) => target.observedAt.getTime()),
      );
      const latest = Math.max(
        ...group.map((target) => target.observedAt.getTime()),
      );
      const baselineStart = new Date(
        earliest - this.policy.windowWeeks * 7 * 86_400_000,
      );
      const baselineEnd = new Date(latest + 1);
      const rows = await this.anomalyRepository.listHourlyBaseline({
        assetIds: [...new Set(group.map((target) => target.assetId))],
        from: baselineStart,
        to: baselineEnd,
        timeZone: coverageArea.timeZone,
        localWeekday: group[0]!.localWeekday,
        localHour: group[0]!.localHour,
      });

      for (const target of group) {
        const targetBaselineStart = new Date(
          target.observedAt.getTime() -
            this.policy.windowWeeks * 7 * 86_400_000,
        );
        const baselineSamples = baselineFor(target, rows, targetBaselineStart);
        const result = evaluateAnomaly({
          metric: target.metric,
          currentValue: target.currentValue,
          baselineSamples,
          previousConsecutiveDeviations: previousCount(
            target,
            previousByKey.get(evaluationKey(target)),
            this.policy,
          ),
          policy: this.policy,
        });
        const observedAt = target.observedAt.toISOString();

        evaluations.push({
          id: `anomaly:${target.assetId}:${target.direction}:${target.metric}:${this.policy.version}`,
          coverageAreaId,
          assetId: target.assetId,
          direction: target.direction,
          metric: target.metric,
          observedAt,
          currentValue: target.currentValue,
          ...result,
          minimumSamples: this.policy.minimumSamples,
          requiredConsecutiveDeviations: this.policy.persistenceCount,
          policyVersion: this.policy.version,
          baselineWindowWeeks: this.policy.windowWeeks,
          baselineStart: targetBaselineStart.toISOString(),
          baselineEnd: observedAt,
          baselineSamples,
          localTimeZone: coverageArea.timeZone,
          localWeekday: target.localWeekday,
          localHour: target.localHour,
          policy: this.policy,
        });
      }
    }

    await this.anomalyRepository.save(evaluations);
    return {
      evaluatedCount: evaluations.length,
      skippedCount: targets.length - evaluations.length,
    };
  }

  async getCoverageCatalog(
    coverageAreaId: string,
  ): Promise<AnomalyCatalogResponse> {
    const coverageArea =
      await this.stationRepository.findCoverageArea(coverageAreaId);
    if (!coverageArea) throw new CoverageAreaNotFoundError(coverageAreaId);

    return {
      coverageAreaId,
      generatedAt: this.clock().toISOString(),
      evaluations:
        await this.anomalyRepository.listLatestCoverage(coverageAreaId),
    };
  }
}
