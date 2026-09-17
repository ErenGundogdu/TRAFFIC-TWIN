import type { HistoryImportJobRepository } from "./history-import-job-repository.js";
import type { HistoryImportPlanningService } from "./history-import-planning-service.js";
import type { HistoryImportService } from "./history-import-service.js";

const SKIPPABLE_STATUSES = new Set(["AVAILABLE", "NO_VALID_DATA"]);

export class HistoryImportWorker {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private activeRun: Promise<boolean> | undefined;
  private started = false;
  private stopping = false;

  constructor(
    private readonly jobRepository: Pick<
      HistoryImportJobRepository,
      | "requeueInterrupted"
      | "claimNext"
      | "setCurrentSourceDate"
      | "recordDayOutcome"
      | "complete"
      | "fail"
    >,
    private readonly planningService: Pick<
      HistoryImportPlanningService,
      "createPlan"
    >,
    private readonly importService: Pick<HistoryImportService, "importDay">,
    private readonly pollIntervalMs = 1_000,
    private readonly onError: (error: unknown) => void = (error) =>
      console.error("History import worker failed.", error),
  ) {}

  async start() {
    if (this.started) return;
    this.started = true;
    this.stopping = false;
    await this.jobRepository.requeueInterrupted();
    this.schedule(0);
  }

  wake() {
    if (!this.started || this.activeRun) return;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    this.schedule(0);
  }

  async stop() {
    this.started = false;
    this.stopping = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
    await this.activeRun;
  }

  async runOnce(): Promise<boolean> {
    let job: Awaited<ReturnType<HistoryImportJobRepository["claimNext"]>>;
    try {
      job = await this.jobRepository.claimNext();
    } catch (error) {
      this.onError(error);
      return false;
    }
    if (!job) return false;

    try {
      const plan = await this.planningService.createPlan(job.coverageAreaId, {
        assetId: job.assetId,
        from: job.fromDate,
        to: job.toDate,
      });
      const statusByDate = new Map(
        plan.days.map((day) => [day.sourceDate, day.status]),
      );

      for (const sourceDate of job.sourceDates) {
        if (this.stopping) return true;
        await this.jobRepository.setCurrentSourceDate(job.id, sourceDate);

        if (SKIPPABLE_STATUSES.has(statusByDate.get(sourceDate) ?? "MISSING")) {
          await this.jobRepository.recordDayOutcome(job.id, "SKIPPED");
          continue;
        }

        try {
          await this.importService.importDay({
            coverageAreaId: job.coverageAreaId,
            tmsNumber: plan.asset.tmsNumber,
            sourceDate,
          });
          await this.jobRepository.recordDayOutcome(job.id, "SUCCESS");
        } catch (error) {
          this.onError(error);
          await this.jobRepository.recordDayOutcome(job.id, "FAILED");
        }
      }

      await this.jobRepository.complete(job.id);
      return true;
    } catch (error) {
      this.onError(error);
      await this.jobRepository.fail(job.id);
      return true;
    }
  }

  private schedule(delayMs: number) {
    if (!this.started || this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.activeRun = this.runOnce();
      void this.activeRun.finally(() => {
        this.activeRun = undefined;
        this.schedule(this.pollIntervalMs);
      });
    }, delayMs);
  }
}
