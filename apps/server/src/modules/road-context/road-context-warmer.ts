import type { RoadContextRepository } from "./road-context-repository.js";
import type { RoadContextService } from "./road-context-service.js";

interface StationLookup {
  listStations(coverageAreaId: string): Promise<Array<{ id: string }>>;
}

export interface RoadContextWarmerOptions {
  intervalMs: number;
  requestDelayMs: number;
  retryDelayMs: number;
  maxAttempts: number;
}

export interface RoadContextWarmResult {
  missingCount: number;
  warmedCount: number;
  failedAssetIds: string[];
}

const defaultOptions: RoadContextWarmerOptions = {
  intervalMs: 30 * 60_000,
  requestDelayMs: 1_000,
  retryDelayMs: 15_000,
  maxAttempts: 4,
};

/**
 * Road context is otherwise fetched only when someone opens a station, and the
 * corridor catalog reads persisted rows only — so corridors would depend on
 * which stations had been clicked. This fills the gaps in the background,
 * sequentially and politely, because the public Overpass server answers 504
 * under load and would reject a burst of requests.
 */
export class RoadContextWarmer {
  private timer: NodeJS.Timeout | undefined;
  private activeRun: Promise<RoadContextWarmResult> | null = null;
  private stopped = false;
  private wakeSleep: (() => void) | undefined;
  private readonly options: RoadContextWarmerOptions;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(
    private readonly coverageAreaId: string,
    private readonly stations: StationLookup,
    private readonly repository: Pick<RoadContextRepository, "findByAssetIds">,
    private readonly roadContexts: Pick<
      RoadContextService,
      "getStationRoadContext"
    >,
    options: Partial<RoadContextWarmerOptions> = {},
    sleep?: (ms: number) => Promise<void>,
    private readonly onError: (error: unknown) => void = console.error,
    private readonly onComplete: (
      result: RoadContextWarmResult,
    ) => void = () => {},
  ) {
    this.options = { ...defaultOptions, ...options };
    this.sleep = sleep ?? ((ms) => this.cancellableSleep(ms));
  }

  runOnce(): Promise<RoadContextWarmResult> {
    if (this.activeRun) return this.activeRun;
    this.stopped = false;
    this.activeRun = this.warmMissing()
      .then((result) => {
        this.onComplete(result);
        return result;
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
    }, this.options.intervalMs);
  }

  async stop() {
    this.stopped = true;
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    this.wakeSleep?.();
    await this.activeRun?.catch(this.onError);
  }

  private async warmMissing(): Promise<RoadContextWarmResult> {
    const assetIds = (
      await this.stations.listStations(this.coverageAreaId)
    ).map((station) => station.id);
    const existing = new Set(
      (await this.repository.findByAssetIds(assetIds)).map(
        (context) => context.assetId,
      ),
    );
    const missing = assetIds.filter((assetId) => !existing.has(assetId));
    const failedAssetIds: string[] = [];
    let warmedCount = 0;

    for (const assetId of missing) {
      if (this.stopped) break;
      const warmed = await this.warmWithRetry(assetId);
      if (this.stopped && !warmed) break;
      if (warmed) {
        warmedCount += 1;
      } else {
        failedAssetIds.push(assetId);
      }
      if (!this.stopped) await this.sleep(this.options.requestDelayMs);
    }

    return { missingCount: missing.length, warmedCount, failedAssetIds };
  }

  private async warmWithRetry(assetId: string) {
    for (let attempt = 1; attempt <= this.options.maxAttempts; attempt += 1) {
      if (this.stopped) return false;
      try {
        await this.roadContexts.getStationRoadContext(
          this.coverageAreaId,
          assetId,
        );
        return true;
      } catch (error) {
        if (attempt === this.options.maxAttempts) {
          this.onError(error);
          return false;
        }
        await this.sleep(this.options.retryDelayMs * attempt);
      }
    }
    return false;
  }

  private cancellableSleep(ms: number) {
    return new Promise<void>((resolve) => {
      const timer = setTimeout(done, ms);
      this.wakeSleep = done;
      function done() {
        clearTimeout(timer);
        resolve();
      }
    });
  }
}
