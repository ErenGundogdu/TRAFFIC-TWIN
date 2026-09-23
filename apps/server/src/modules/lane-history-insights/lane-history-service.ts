import type { LaneHistoryInsightResponse } from "@traffic-twin/contracts";

import { ApplicationError } from "../../common/errors/application-error.js";
import type { StationCatalogService } from "../asset-catalog/station-catalog-service.js";
import { getLocalTimeSlot } from "../anomalies/local-time-slot.js";
import {
  DEFAULT_LANE_HISTORY_POLICY,
  evaluateLaneHistory,
  type LaneHistoryPolicy,
} from "./lane-history-engine.js";
import type { LaneHistoryRepository } from "./lane-history-repository.js";

export class LaneHistoryScopeNotFoundError extends ApplicationError {
  constructor() {
    super("The lane-history station or coverage area was not found.", {
      code: "LANE_HISTORY_SCOPE_NOT_FOUND",
      kind: "NOT_FOUND",
      publicMessage: "İstasyon veya kapsama alanı bulunamadı.",
    });
  }
}

export class LaneHistoryService {
  constructor(
    private readonly stationCatalogService: Pick<
      StationCatalogService,
      "getCoverageStations"
    >,
    private readonly repository: LaneHistoryRepository,
    private readonly policy: LaneHistoryPolicy = DEFAULT_LANE_HISTORY_POLICY,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async getStationLaneHistory(
    coverageAreaId: string,
    assetId: string,
  ): Promise<LaneHistoryInsightResponse> {
    const catalog =
      await this.stationCatalogService.getCoverageStations(coverageAreaId);
    const station = catalog.stations.find((item) => item.id === assetId);
    if (!station) throw new LaneHistoryScopeNotFoundError();

    const generatedAt = this.clock();
    const observedAt = station.lanes
      .map((lane) => lane.measuredAt)
      .filter((value): value is string => value !== null)
      .sort()
      .at(-1);
    const referenceTime = observedAt ? new Date(observedAt) : generatedAt;
    const localSlot = getLocalTimeSlot(
      referenceTime,
      catalog.coverageArea.timeZone,
    );
    const baselineEnd = referenceTime;
    const baselineStart = new Date(
      baselineEnd.getTime() - this.policy.windowWeeks * 7 * 86_400_000,
    );
    const rows = await this.repository.listHourlyBaseline({
      assetId,
      from: baselineStart,
      to: baselineEnd,
      timeZone: catalog.coverageArea.timeZone,
      localWeekday: localSlot.weekday,
      localHour: localSlot.hour,
    });

    return {
      assetId,
      generatedAt: generatedAt.toISOString(),
      timeZone: catalog.coverageArea.timeZone,
      localWeekday: localSlot.weekday,
      localHour: localSlot.hour,
      baselineStart: baselineStart.toISOString(),
      baselineEnd: baselineEnd.toISOString(),
      baselineWindowWeeks: this.policy.windowWeeks,
      minimumSamples: this.policy.minimumSamples,
      policyVersion: this.policy.version,
      evaluations: evaluateLaneHistory(station.lanes, rows, this.policy),
    };
  }
}
