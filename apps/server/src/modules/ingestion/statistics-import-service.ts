import type { StationCatalogRepository } from "../asset-catalog/station-catalog-repository.js";
import {
  parseSpeedStatistics,
  parseVolumeStatistics,
  type StatisticsResolution,
} from "../providers/fintraffic/parse-statistics-report.js";
import type { FintrafficStatisticsClient } from "../providers/fintraffic/statistics-client.js";
import type { StatisticsImportRepository } from "./statistics-import-repository.js";

export interface StatisticsImportInput {
  coverageAreaId: string;
  tmsNumber: number;
  resolution: StatisticsResolution;
  from: string;
  to: string;
}

export interface StatisticsImportProgress {
  tmsNumber: number;
  resolution: StatisticsResolution;
  from: string;
  to: string;
  direction: 1 | 2;
  status: "COMPLETED" | "SKIPPED";
}

export class StatisticsImportService {
  constructor(
    private readonly stationRepository: Pick<
      StationCatalogRepository,
      "listStations"
    >,
    private readonly importRepository: Pick<
      StatisticsImportRepository,
      "isChunkComplete" | "upsertVolumes" | "upsertSpeeds" | "markChunkComplete"
    >,
    private readonly client: Pick<FintrafficStatisticsClient, "getReport">,
  ) {}

  async importRange(
    input: StatisticsImportInput,
    onProgress?: (progress: StatisticsImportProgress) => void,
  ) {
    const station = (
      await this.stationRepository.listStations(input.coverageAreaId)
    ).find((candidate) => candidate.tmsNumber === input.tmsNumber);
    if (!station) {
      throw new Error(`TMS station '${input.tmsNumber}' was not found.`);
    }

    let volumeRowCount = 0;
    let speedRowCount = 0;
    let completedChunkCount = 0;
    let skippedChunkCount = 0;
    const ranges = splitStatisticsRange(input.from, input.to, input.resolution);
    for (const range of ranges) {
      for (const direction of [1, 2] as const) {
        const chunk = {
          assetId: station.id,
          resolution: input.resolution,
          from: range.from,
          to: range.to,
          direction,
        };
        if (await this.importRepository.isChunkComplete(chunk)) {
          skippedChunkCount += 1;
          onProgress?.({
            tmsNumber: input.tmsNumber,
            resolution: input.resolution,
            ...range,
            direction,
            status: "SKIPPED",
          });
          continue;
        }
        const query = {
          tmsNumber: input.tmsNumber,
          resolution: input.resolution,
          from: range.from,
          to: range.to,
          direction,
        };
        const [volumeCsv, speedCsv] = await Promise.all([
          this.client.getReport({ ...query, metric: "volume" }),
          this.client.getReport({ ...query, metric: "speed" }),
        ]);
        const volumes = parseVolumeStatistics(volumeCsv, input.resolution);
        const speeds = parseSpeedStatistics(speedCsv, input.resolution);
        assertChunkRows(volumes, chunk);
        assertChunkRows(speeds, chunk);
        const writtenVolumes = await this.importRepository.upsertVolumes(
          station.id,
          volumes,
        );
        const writtenSpeeds = await this.importRepository.upsertSpeeds(
          station.id,
          speeds,
        );
        await this.importRepository.markChunkComplete({
          ...chunk,
          volumeRowCount: writtenVolumes,
          speedRowCount: writtenSpeeds,
        });
        volumeRowCount += writtenVolumes;
        speedRowCount += writtenSpeeds;
        completedChunkCount += 1;
        onProgress?.({
          tmsNumber: input.tmsNumber,
          resolution: input.resolution,
          ...range,
          direction,
          status: "COMPLETED",
        });
      }
    }

    return {
      assetId: station.id,
      resolution: input.resolution,
      from: input.from,
      to: input.to,
      volumeRowCount,
      speedRowCount,
      requestChunkCount: ranges.length,
      completedChunkCount,
      skippedChunkCount,
    };
  }
}

export function assertChunkRows(
  rows: Array<{ direction: 1 | 2; bucketStart: Date }>,
  chunk: { from: string; to: string; direction: 1 | 2 },
) {
  const dateFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Helsinki",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  for (const row of rows) {
    const localDate = dateFormatter.format(row.bucketStart);
    if (
      row.direction !== chunk.direction ||
      localDate < chunk.from ||
      localDate > chunk.to
    ) {
      throw new Error(
        "Fintraffic statistics report escaped its requested scope.",
      );
    }
  }
}

export function splitStatisticsRange(
  from: string,
  to: string,
  resolution: StatisticsResolution,
) {
  const end = new Date(`${to}T00:00:00Z`);
  const ranges: Array<{ from: string; to: string }> = [];
  let cursor = new Date(`${from}T00:00:00Z`);

  while (cursor <= end) {
    const chunkEnd =
      resolution === "hour"
        ? new Date(
            Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0),
          )
        : new Date(Date.UTC(cursor.getUTCFullYear(), 11, 31));
    if (chunkEnd > end) chunkEnd.setTime(end.getTime());
    ranges.push({ from: formatDate(cursor), to: formatDate(chunkEnd) });
    cursor = new Date(chunkEnd);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return ranges;
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}
