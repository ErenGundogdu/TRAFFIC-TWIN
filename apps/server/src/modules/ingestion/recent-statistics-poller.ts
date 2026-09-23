import type { StatisticsBulkImportService } from "./statistics-bulk-import-service.js";
import { resolveRecentDailyStatisticsRanges } from "./recent-statistics-window.js";

type ImportInput = Parameters<StatisticsBulkImportService["importRange"]>[0];
type ImportResult = Awaited<
  ReturnType<StatisticsBulkImportService["importRange"]>
>;

interface StationLookup {
  findCoverageArea(id: string): Promise<{ timeZone: string } | null>;
  listStations(id: string): Promise<Array<{ tmsNumber: number }>>;
}

export class RecentStatisticsPoller {
  private timer: NodeJS.Timeout | undefined;
  private activeRun: Promise<ImportResult[]> | null = null;

  constructor(
    private readonly coverageAreaId: string,
    private readonly intervalMs: number,
    private readonly batchSize: number,
    private readonly stations: StationLookup,
    private readonly importer: {
      importRange(input: ImportInput): Promise<ImportResult>;
    },
    private readonly clock: () => Date = () => new Date(),
    private readonly onError: (error: unknown) => void = console.error,
    private readonly onComplete: (results: ImportResult[]) => void = () => {},
  ) {}

  runOnce(): Promise<ImportResult[]> {
    if (this.activeRun) return this.activeRun;
    this.activeRun = this.importRecentMonths()
      .then((results) => {
        this.onComplete(results);
        return results;
      })
      .finally(() => {
        this.activeRun = null;
      });
    return this.activeRun;
  }

  start() {
    if (this.timer) return;
    void this.runOnce().catch(this.onError);
    this.timer = setInterval(() => {
      void this.runOnce().catch(this.onError);
    }, this.intervalMs);
  }

  async stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    await this.activeRun?.catch(this.onError);
  }

  private async importRecentMonths(): Promise<ImportResult[]> {
    const area = await this.stations.findCoverageArea(this.coverageAreaId);
    if (!area) {
      throw new Error(`Coverage area '${this.coverageAreaId}' was not found.`);
    }
    const tmsNumbers = (await this.stations.listStations(this.coverageAreaId))
      .map((station) => station.tmsNumber)
      .sort((left, right) => left - right);
    if (tmsNumbers.length === 0) return [];

    const results: ImportResult[] = [];
    for (const range of resolveRecentDailyStatisticsRanges(
      area.timeZone,
      this.clock(),
    )) {
      try {
        const result = await this.importer.importRange({
          coverageAreaId: this.coverageAreaId,
          tmsNumbers,
          resolution: "day",
          batchSize: this.batchSize,
          ...range,
        });
        results.push(result);
        if (result.failures.length > 0) {
          this.onError(
            new Error(
              `Daily statistics ${range.from}..${range.to}: ${result.failures.length} source ranges failed.`,
            ),
          );
        }
      } catch (error) {
        // A failed closed month must not block the current month's usable data.
        this.onError(error);
      }
    }
    return results;
  }
}
