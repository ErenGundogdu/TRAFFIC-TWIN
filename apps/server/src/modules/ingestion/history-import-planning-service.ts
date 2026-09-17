import {
  historyImportPlanQuerySchema,
  type HistoryImportDayStatus,
  type HistoryImportPlanQuery,
  type HistoryImportPlanResponse,
} from "@traffic-twin/contracts";

import type { StationCatalogRepository } from "../asset-catalog/station-catalog-repository.js";
import type { HistoryImportRepository } from "./history-import-repository.js";

const DAY_MS = 86_400_000;

type ManifestRow = Awaited<
  ReturnType<HistoryImportRepository["listArtifactsForAssetDateRange"]>
>[number];

export class HistoryImportCoverageNotFoundError extends Error {}
export class HistoryImportAssetNotFoundError extends Error {}

function enumerateInclusiveDates(from: string, to: string): string[] {
  const dates: string[] = [];
  let cursor = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);

  while (cursor <= end) {
    dates.push(new Date(cursor).toISOString().slice(0, 10));
    cursor += DAY_MS;
  }

  return dates;
}

function resolveDayStatus(
  sourceDate: string,
  currentLocalDate: string,
  row: ManifestRow | undefined,
): HistoryImportDayStatus {
  if (row?.status === "PROCESSED" && row.validRecordCount > 0) {
    return "AVAILABLE";
  }
  if (sourceDate >= currentLocalDate) return "NOT_YET_AVAILABLE";
  if (!row) return "MISSING";
  if (row.status === "FAILED") return "FAILED";
  if (row.status === "DOWNLOADED") return "PENDING_PROCESSING";
  return "NO_VALID_DATA";
}

function formatLocalDate(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;

  return `${value("year")}-${value("month")}-${value("day")}`;
}

export class HistoryImportPlanningService {
  constructor(
    private readonly stationRepository: Pick<
      StationCatalogRepository,
      "findCoverageArea" | "listStations"
    >,
    private readonly importRepository: Pick<
      HistoryImportRepository,
      "listArtifactsForAssetDateRange"
    >,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async createPlan(
    coverageAreaId: string,
    input: HistoryImportPlanQuery,
  ): Promise<HistoryImportPlanResponse> {
    const query = historyImportPlanQuerySchema.parse(input);
    const coverageArea =
      await this.stationRepository.findCoverageArea(coverageAreaId);
    if (!coverageArea) {
      throw new HistoryImportCoverageNotFoundError(
        `Coverage area '${coverageAreaId}' was not found.`,
      );
    }

    const station = (
      await this.stationRepository.listStations(coverageAreaId)
    ).find((candidate) => candidate.id === query.assetId);
    if (!station) {
      throw new HistoryImportAssetNotFoundError(
        `Traffic asset '${query.assetId}' is outside coverage area '${coverageAreaId}'.`,
      );
    }

    const sourceDates = enumerateInclusiveDates(query.from, query.to);
    const manifestRows =
      await this.importRepository.listArtifactsForAssetDateRange(
        station.id,
        query.from,
        query.to,
      );
    const manifestByDate = new Map(
      manifestRows.map((row) => [row.sourceDate, row]),
    );
    const currentLocalDate = formatLocalDate(this.now(), coverageArea.timeZone);
    const days = sourceDates.map((sourceDate) => {
      const row = manifestByDate.get(sourceDate);
      const status = resolveDayStatus(sourceDate, currentLocalDate, row);

      return {
        sourceDate,
        status,
        artifactId: row?.id ?? null,
        recordCount: row?.recordCount ?? null,
        validRecordCount: row?.validRecordCount ?? null,
        updatedAt: row?.updatedAt.toISOString() ?? null,
        errorMessage:
          status === "FAILED" ? (row?.errorMessage ?? "Unknown error") : null,
      };
    });
    const count = (status: HistoryImportDayStatus) =>
      days.filter((day) => day.status === status).length;

    return {
      coverageAreaId,
      timeZone: coverageArea.timeZone,
      asset: {
        id: station.id,
        name: station.name,
        tmsNumber: station.tmsNumber,
      },
      range: {
        from: query.from,
        to: query.to,
        requestedDayCount: days.length,
      },
      summary: {
        availableDayCount: count("AVAILABLE"),
        missingDayCount: count("MISSING"),
        failedDayCount: count("FAILED"),
        pendingProcessingDayCount: count("PENDING_PROCESSING"),
        noValidDataDayCount: count("NO_VALID_DATA"),
        notYetAvailableDayCount: count("NOT_YET_AVAILABLE"),
      },
      days,
    };
  }
}
