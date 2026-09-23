import {
  parseSpeedStatistics,
  parseVolumeStatistics,
  partitionStatisticsReport,
  type StatisticsResolution,
} from "../providers/fintraffic/parse-statistics-report.js";
import {
  FintrafficStatisticsRangeError,
  type FintrafficStatisticsClient,
  type StatisticsMetric,
} from "../providers/fintraffic/statistics-client.js";
import type { StatisticsImportRepository } from "./statistics-import-repository.js";
import {
  assertChunkRows,
  splitStatisticsRange,
} from "./statistics-import-service.js";

interface Station {
  id: string;
  tmsNumber: number;
}

interface DateRange {
  from: string;
  to: string;
}

export interface StatisticsBulkImportFailure extends DateRange {
  tmsNumber: number;
  direction: 1 | 2;
  metric: StatisticsMetric;
  message: string;
}

export class StatisticsBulkImportService {
  private completedChunkCount = 0;
  private skippedChunkCount = 0;
  private readonly failures: StatisticsBulkImportFailure[] = [];

  constructor(
    private readonly stations: {
      listStations(coverageAreaId: string): Promise<Station[]>;
    },
    private readonly repository: Pick<
      StatisticsImportRepository,
      | "isChunkComplete"
      | "upsertVolumes"
      | "upsertSpeeds"
      | "markChunkComplete"
      | "recordFailure"
      | "clearFailures"
    >,
    private readonly client: Pick<FintrafficStatisticsClient, "getBulkReport">,
  ) {}

  async importRange(input: {
    coverageAreaId: string;
    tmsNumbers: number[];
    resolution: StatisticsResolution;
    from: string;
    to: string;
    batchSize: number;
    recordCheckpoint?: boolean;
    onProgress?: (message: string) => void;
  }) {
    this.completedChunkCount = 0;
    this.skippedChunkCount = 0;
    this.failures.length = 0;
    const catalog = await this.stations.listStations(input.coverageAreaId);
    const byNumber = new Map(
      catalog.map((station) => [station.tmsNumber, station]),
    );
    const selected = input.tmsNumbers.map((number) => {
      const station = byNumber.get(number);
      if (!station) throw new Error(`TMS station '${number}' was not found.`);
      return { id: station.id, tmsNumber: number };
    });

    for (const range of splitStatisticsRange(
      input.from,
      input.to,
      input.resolution,
    )) {
      for (const direction of [1, 2] as const) {
        for (let index = 0; index < selected.length; index += input.batchSize) {
          await this.importGroup(
            selected.slice(index, index + input.batchSize),
            range,
            direction,
            input.resolution,
            input.recordCheckpoint ?? true,
            { remaining: 16 },
            input.onProgress,
          );
        }
      }
    }

    return {
      stationCount: selected.length,
      completedChunkCount: this.completedChunkCount,
      skippedChunkCount: this.skippedChunkCount,
      failures: this.failures,
    };
  }

  private async importGroup(
    stations: Station[],
    range: DateRange,
    direction: 1 | 2,
    resolution: StatisticsResolution,
    recordCheckpoint: boolean,
    sourceErrorBudget: { remaining: number },
    onProgress?: (message: string) => void,
  ): Promise<void> {
    const pending: Station[] = [];
    for (const station of stations) {
      if (
        recordCheckpoint &&
        (await this.repository.isChunkComplete({
          assetId: station.id,
          resolution,
          ...range,
          direction,
        }))
      ) {
        this.skippedChunkCount += 1;
      } else {
        pending.push(station);
      }
    }
    if (pending.length === 0) return;

    const query = {
      ...range,
      resolution,
      direction,
      tmsNumbers: pending.map((station) => station.tmsNumber),
    };
    const [volumeResult, speedResult] = await Promise.allSettled([
      this.client.getBulkReport({ ...query, metric: "volume" }),
      this.client.getBulkReport({ ...query, metric: "speed" }),
    ]);

    const sourceCalculationFailed =
      (volumeResult.status === "rejected" &&
        volumeResult.reason instanceof FintrafficStatisticsRangeError) ||
      (speedResult.status === "rejected" &&
        speedResult.reason instanceof FintrafficStatisticsRangeError);
    if (sourceCalculationFailed && sourceErrorBudget.remaining > 0) {
      sourceErrorBudget.remaining -= 1;
      if (pending.length > 1) {
        const middle = Math.floor(pending.length / 2);
        await this.importGroup(
          pending.slice(0, middle),
          range,
          direction,
          resolution,
          recordCheckpoint,
          sourceErrorBudget,
          onProgress,
        );
        await this.importGroup(
          pending.slice(middle),
          range,
          direction,
          resolution,
          recordCheckpoint,
          sourceErrorBudget,
          onProgress,
        );
        return;
      }
      if (range.from < range.to) {
        for (const child of splitRangeInHalf(range)) {
          await this.importGroup(
            pending,
            child,
            direction,
            resolution,
            recordCheckpoint,
            sourceErrorBudget,
            onProgress,
          );
        }
        return;
      }
    }

    const numbers = pending.map((station) => station.tmsNumber);
    const volumeCsv =
      volumeResult.status === "fulfilled"
        ? partitionStatisticsReport(volumeResult.value, numbers)
        : null;
    const speedCsv =
      speedResult.status === "fulfilled"
        ? partitionStatisticsReport(speedResult.value, numbers)
        : null;

    for (const station of pending) {
      const chunk = { assetId: station.id, resolution, ...range, direction };
      let volumeRowCount = 0;
      let speedRowCount = 0;
      if (volumeCsv) {
        const rows = parseVolumeStatistics(
          volumeCsv.get(station.tmsNumber)!,
          resolution,
        );
        assertChunkRows(rows, chunk);
        volumeRowCount = await this.repository.upsertVolumes(station.id, rows);
        await this.repository.clearFailures({ ...chunk, metric: "volume" });
      }
      if (speedCsv) {
        const rows = parseSpeedStatistics(
          speedCsv.get(station.tmsNumber)!,
          resolution,
        );
        assertChunkRows(rows, chunk);
        speedRowCount = await this.repository.upsertSpeeds(station.id, rows);
        await this.repository.clearFailures({ ...chunk, metric: "speed" });
      }
      if (volumeCsv && speedCsv) {
        if (recordCheckpoint) {
          await this.repository.markChunkComplete({
            ...chunk,
            volumeRowCount,
            speedRowCount,
          });
        }
        this.completedChunkCount += 1;
      } else {
        for (const [metric, result] of [
          ["volume", volumeResult],
          ["speed", speedResult],
        ] as const) {
          if (result.status === "fulfilled") continue;
          this.failures.push({
            tmsNumber: station.tmsNumber,
            ...range,
            direction,
            metric,
            message:
              result.reason instanceof FintrafficStatisticsRangeError
                ? "Fintraffic source calculation failed."
                : result.reason instanceof Error
                  ? result.reason.message
                  : "Fintraffic request failed.",
          });
          await this.repository.recordFailure({
            ...chunk,
            metric,
            errorCode:
              result.reason instanceof FintrafficStatisticsRangeError
                ? "SOURCE_CALCULATION"
                : "UPSTREAM_UNAVAILABLE",
          });
        }
      }
    }
    onProgress?.(
      `${resolution} ${range.from}..${range.to} direction ${direction}: TMS ${numbers.join(",")}, ${volumeCsv && speedCsv ? "COMPLETED" : "PARTIAL_FAILURE"}`,
    );
  }
}

function splitRangeInHalf(range: DateRange): DateRange[] {
  const first = Date.parse(`${range.from}T00:00:00Z`);
  const last = Date.parse(`${range.to}T00:00:00Z`);
  const middle = new Date(
    Math.floor((first + last) / (2 * 86_400_000)) * 86_400_000,
  );
  const next = new Date(middle.getTime() + 86_400_000);
  return [
    { from: range.from, to: middle.toISOString().slice(0, 10) },
    { from: next.toISOString().slice(0, 10), to: range.to },
  ];
}
