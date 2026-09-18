import { randomUUID } from "node:crypto";

import {
  createHistoryImportJobSchema,
  type CreateHistoryImportJob,
  type HistoryImportJob,
  type HistoryImportJobResponse,
} from "@traffic-twin/contracts";

import { ApplicationError } from "../../common/errors/application-error.js";
import type { HistoryImportJobRepository } from "./history-import-job-repository.js";
import type { HistoryImportPlanningService } from "./history-import-planning-service.js";

const IMPORTABLE_DAY_STATUSES = new Set([
  "MISSING",
  "FAILED",
  "PENDING_PROCESSING",
]);

type PersistedJob = NonNullable<
  Awaited<ReturnType<HistoryImportJobRepository["findById"]>>
>;

export class HistoryImportJobNotFoundError extends ApplicationError {
  constructor(message: string) {
    super(message, {
      code: "HISTORY_IMPORT_JOB_NOT_FOUND",
      kind: "NOT_FOUND",
      publicMessage: message,
    });
  }
}

export class HistoryImportJobConflictError extends ApplicationError {
  constructor(message: string) {
    super(message, {
      code: "HISTORY_IMPORT_JOB_CONFLICT",
      kind: "CONFLICT",
      publicMessage: message,
    });
  }
}

export class HistoryImportNothingToDoError extends ApplicationError {
  constructor(message: string) {
    super(message, {
      code: "HISTORY_IMPORT_NOTHING_TO_DO",
      kind: "CONFLICT",
      publicMessage: message,
    });
  }
}

function toHistoryImportJob(row: PersistedJob): HistoryImportJob {
  return {
    id: row.id,
    coverageAreaId: row.coverageAreaId,
    asset: {
      id: row.assetId,
      name: row.assetName,
      tmsNumber: row.tmsNumber,
    },
    range: {
      from: row.fromDate,
      to: row.toDate,
      requestedDayCount: row.requestedDayCount,
      targetDayCount: row.targetDayCount,
    },
    progress: {
      completedDayCount: row.completedDayCount,
      successfulDayCount: row.successfulDayCount,
      failedDayCount: row.failedDayCount,
      skippedDayCount: row.skippedDayCount,
      currentSourceDate: row.currentSourceDate,
    },
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    startedAt: row.startedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class HistoryImportJobService {
  constructor(
    private readonly planningService: Pick<
      HistoryImportPlanningService,
      "createPlan"
    >,
    private readonly jobRepository: Pick<
      HistoryImportJobRepository,
      "create" | "findById"
    >,
    private readonly onJobQueued: () => void = () => undefined,
    private readonly createId: () => string = randomUUID,
  ) {}

  async createJob(
    coverageAreaId: string,
    input: CreateHistoryImportJob,
  ): Promise<HistoryImportJobResponse> {
    const command = createHistoryImportJobSchema.parse(input);
    const plan = await this.planningService.createPlan(coverageAreaId, command);
    const sourceDates = plan.days
      .filter((day) => IMPORTABLE_DAY_STATUSES.has(day.status))
      .map((day) => day.sourceDate);
    if (sourceDates.length === 0) {
      throw new HistoryImportNothingToDoError(
        "Seçilen aralıkta içeri alınabilecek eksik veya başarısız gün bulunmuyor.",
      );
    }

    const created = await this.jobRepository.create({
      id: this.createId(),
      coverageAreaId,
      assetId: plan.asset.id,
      fromDate: command.from,
      toDate: command.to,
      requestedDayCount: plan.range.requestedDayCount,
      sourceDates,
    });
    if (!created) {
      throw new HistoryImportJobConflictError(
        "Aynı istasyon ve tarih aralığı için zaten etkin bir import işi var.",
      );
    }

    this.onJobQueued();
    return { job: toHistoryImportJob(created) };
  }

  async getJob(
    coverageAreaId: string,
    jobId: string,
  ): Promise<HistoryImportJobResponse> {
    const job = await this.jobRepository.findById(coverageAreaId, jobId);
    if (!job) {
      throw new HistoryImportJobNotFoundError(
        `History import job '${jobId}' was not found.`,
      );
    }

    return { job: toHistoryImportJob(job) };
  }
}
