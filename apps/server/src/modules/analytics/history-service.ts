import {
  historyQuerySchema,
  type HistoryQuery,
  type HistoryAvailabilityResponse,
  type HistoryResponse,
  type ResolvedHistoryResolution,
} from "@traffic-twin/contracts";

import { ApplicationError } from "../../common/errors/application-error.js";
import type { StationCatalogRepository } from "../asset-catalog/station-catalog-repository.js";
import type { HistoryRepository } from "./history-repository.js";
import { summarizeHistory } from "./history-summary.js";

const DAY_MS = 86_400_000;

class HistoryScopeNotFoundError extends ApplicationError {
  constructor(message: string) {
    super(message, {
      code: "HISTORY_SCOPE_NOT_FOUND",
      kind: "NOT_FOUND",
      publicMessage: message,
    });
  }
}

export class HistoryCoverageAreaNotFoundError extends HistoryScopeNotFoundError {}
export class HistoryAssetNotFoundError extends HistoryScopeNotFoundError {}

function resolveResolution(query: HistoryQuery): ResolvedHistoryResolution {
  if (query.resolution !== "auto") return query.resolution;
  const duration =
    new Date(query.to).getTime() - new Date(query.from).getTime();
  if (duration <= 2 * DAY_MS) return "minute";
  if (duration <= 90 * DAY_MS) return "hour";
  return "day";
}

function localDate(value: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function enumerateDates(from: Date, to: Date, timeZone: string) {
  const first = localDate(from, timeZone);
  const last = localDate(new Date(to.getTime() - 1), timeZone);
  const dates: string[] = [];
  let cursor = new Date(`${first}T00:00:00Z`);
  const end = new Date(`${last}T00:00:00Z`);

  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor = new Date(cursor.getTime() + DAY_MS);
  }

  return dates;
}

export class HistoryService {
  constructor(
    private readonly stationRepository: StationCatalogRepository,
    private readonly historyRepository: Pick<
      HistoryRepository,
      "getSeries" | "getSummaryRows" | "listAvailableDates" | "listAvailability"
    >,
  ) {}

  async getAvailability(
    coverageAreaId: string,
  ): Promise<HistoryAvailabilityResponse> {
    const coverageArea =
      await this.stationRepository.findCoverageArea(coverageAreaId);
    if (!coverageArea) {
      throw new HistoryCoverageAreaNotFoundError(
        `Coverage area '${coverageAreaId}' was not found.`,
      );
    }

    const rows = await this.historyRepository.listAvailability(coverageAreaId);
    const datesByAsset = new Map<string, string[]>();
    for (const row of rows) {
      const dates = datesByAsset.get(row.assetId) ?? [];
      if (!dates.includes(row.sourceDate)) dates.push(row.sourceDate);
      datesByAsset.set(row.assetId, dates);
    }

    return {
      coverageAreaId,
      timeZone: coverageArea.timeZone,
      assets: [...datesByAsset.entries()].map(([assetId, availableDates]) => ({
        assetId,
        firstDate: availableDates[0]!,
        lastDate: availableDates.at(-1)!,
        availableDayCount: availableDates.length,
        availableDates,
      })),
    };
  }

  async query(
    coverageAreaId: string,
    input: HistoryQuery,
  ): Promise<HistoryResponse> {
    const query = historyQuerySchema.parse(input);
    const coverageArea =
      await this.stationRepository.findCoverageArea(coverageAreaId);
    if (!coverageArea) {
      throw new HistoryCoverageAreaNotFoundError(
        `Coverage area '${coverageAreaId}' was not found.`,
      );
    }

    const stations = await this.stationRepository.listStations(coverageAreaId);
    const stationsById = new Map(
      stations.map((station) => [station.id, station.name]),
    );
    if (query.assetIds.some((assetId) => !stationsById.has(assetId))) {
      throw new HistoryAssetNotFoundError(
        "One or more traffic assets are outside the coverage area.",
      );
    }

    const from = new Date(query.from);
    const to = new Date(query.to);
    const requestedDates = enumerateDates(from, to, coverageArea.timeZone);
    const available = await this.historyRepository.listAvailableDates(
      query.assetIds,
      requestedDates[0]!,
      requestedDates.at(-1)!,
    );
    const datesAvailableForEveryAsset = requestedDates.filter((date) =>
      query.assetIds.every((assetId) =>
        available.some(
          (item) => item.assetId === assetId && item.sourceDate === date,
        ),
      ),
    );
    const missingDates = requestedDates.filter(
      (date) => !datesAvailableForEveryAsset.includes(date),
    );
    const resolution = resolveResolution(query);
    const [series, summaryRows] = await Promise.all([
      this.historyRepository.getSeries({
        assetIds: query.assetIds,
        direction: query.direction,
        metric: query.metric,
        resolution,
        from,
        to,
      }),
      this.historyRepository.getSummaryRows({
        assetIds: query.assetIds,
        resolution,
        from,
        to,
      }),
    ]);

    return {
      query,
      resolution,
      timeZone: coverageArea.timeZone,
      coverage: {
        status:
          datesAvailableForEveryAsset.length === 0
            ? "NO_DATA"
            : missingDates.length === 0
              ? "COMPLETE"
              : "PARTIAL",
        requestedDays: requestedDates.length,
        availableDays: datesAvailableForEveryAsset.length,
        missingDates: missingDates.slice(0, 31),
      },
      series,
      summaries: summarizeHistory({
        assetIds: query.assetIds,
        direction: query.direction,
        assetNames: stationsById,
        rows: summaryRows,
      }),
    };
  }
}
