import { and, asc, eq, inArray, sql } from "drizzle-orm";

import type { Database } from "../../infrastructure/database/client.js";
import {
  historyImportJobs,
  trafficAssets,
} from "../../infrastructure/database/schema.js";

export interface CreateHistoryImportJobRecord {
  id: string;
  coverageAreaId: string;
  assetId: string;
  fromDate: string;
  toDate: string;
  requestedDayCount: number;
  sourceDates: string[];
}

export type HistoryImportDayOutcome = "SUCCESS" | "FAILED" | "SKIPPED";

export class HistoryImportJobRepository {
  constructor(private readonly database: Database) {}

  async create(record: CreateHistoryImportJobRecord) {
    const [created] = await this.database
      .insert(historyImportJobs)
      .values({
        ...record,
        targetDayCount: record.sourceDates.length,
        status: "QUEUED",
      })
      .onConflictDoNothing()
      .returning({ id: historyImportJobs.id });

    return created ? this.findById(record.coverageAreaId, created.id) : null;
  }

  async findById(coverageAreaId: string, id: string) {
    const [row] = await this.database
      .select({
        id: historyImportJobs.id,
        coverageAreaId: historyImportJobs.coverageAreaId,
        assetId: historyImportJobs.assetId,
        assetName: trafficAssets.name,
        tmsNumber: trafficAssets.tmsNumber,
        fromDate: historyImportJobs.fromDate,
        toDate: historyImportJobs.toDate,
        requestedDayCount: historyImportJobs.requestedDayCount,
        targetDayCount: historyImportJobs.targetDayCount,
        sourceDates: historyImportJobs.sourceDates,
        completedDayCount: historyImportJobs.completedDayCount,
        successfulDayCount: historyImportJobs.successfulDayCount,
        failedDayCount: historyImportJobs.failedDayCount,
        skippedDayCount: historyImportJobs.skippedDayCount,
        currentSourceDate: historyImportJobs.currentSourceDate,
        status: historyImportJobs.status,
        createdAt: historyImportJobs.createdAt,
        startedAt: historyImportJobs.startedAt,
        completedAt: historyImportJobs.completedAt,
        updatedAt: historyImportJobs.updatedAt,
      })
      .from(historyImportJobs)
      .innerJoin(trafficAssets, eq(trafficAssets.id, historyImportJobs.assetId))
      .where(
        and(
          eq(historyImportJobs.coverageAreaId, coverageAreaId),
          eq(historyImportJobs.id, id),
        ),
      )
      .limit(1);

    return row ?? null;
  }

  async requeueInterrupted() {
    await this.database
      .update(historyImportJobs)
      .set({
        status: "QUEUED",
        completedDayCount: 0,
        successfulDayCount: 0,
        failedDayCount: 0,
        skippedDayCount: 0,
        currentSourceDate: null,
        startedAt: null,
        completedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(historyImportJobs.status, "RUNNING"));
  }

  async claimNext() {
    return this.database.transaction(async (transaction) => {
      const [candidate] = await transaction
        .select({ id: historyImportJobs.id })
        .from(historyImportJobs)
        .where(eq(historyImportJobs.status, "QUEUED"))
        .orderBy(asc(historyImportJobs.createdAt))
        .limit(1)
        .for("update", { skipLocked: true });
      if (!candidate) return null;

      const [claimed] = await transaction
        .update(historyImportJobs)
        .set({
          status: "RUNNING",
          completedDayCount: 0,
          successfulDayCount: 0,
          failedDayCount: 0,
          skippedDayCount: 0,
          currentSourceDate: null,
          startedAt: new Date(),
          completedAt: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(historyImportJobs.id, candidate.id),
            eq(historyImportJobs.status, "QUEUED"),
          ),
        )
        .returning();

      return claimed ?? null;
    });
  }

  async setCurrentSourceDate(id: string, sourceDate: string) {
    await this.database
      .update(historyImportJobs)
      .set({ currentSourceDate: sourceDate, updatedAt: new Date() })
      .where(
        and(
          eq(historyImportJobs.id, id),
          eq(historyImportJobs.status, "RUNNING"),
        ),
      );
  }

  async recordDayOutcome(id: string, outcome: HistoryImportDayOutcome) {
    const outcomeIncrement =
      outcome === "SUCCESS"
        ? {
            successfulDayCount: sql`${historyImportJobs.successfulDayCount} + 1`,
          }
        : outcome === "FAILED"
          ? { failedDayCount: sql`${historyImportJobs.failedDayCount} + 1` }
          : { skippedDayCount: sql`${historyImportJobs.skippedDayCount} + 1` };

    await this.database
      .update(historyImportJobs)
      .set({
        completedDayCount: sql`${historyImportJobs.completedDayCount} + 1`,
        ...outcomeIncrement,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(historyImportJobs.id, id),
          eq(historyImportJobs.status, "RUNNING"),
        ),
      );
  }

  async complete(id: string) {
    const [completed] = await this.database
      .update(historyImportJobs)
      .set({
        status: sql`CASE
          WHEN ${historyImportJobs.failedDayCount} = 0 THEN 'COMPLETED'::history_import_job_status
          WHEN ${historyImportJobs.successfulDayCount} + ${historyImportJobs.skippedDayCount} = 0 THEN 'FAILED'::history_import_job_status
          ELSE 'PARTIAL_FAILURE'::history_import_job_status
        END`,
        currentSourceDate: null,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(historyImportJobs.id, id),
          eq(historyImportJobs.status, "RUNNING"),
        ),
      )
      .returning({ id: historyImportJobs.id });

    return completed ?? null;
  }

  async fail(id: string) {
    await this.database
      .update(historyImportJobs)
      .set({
        status: "FAILED",
        currentSourceDate: null,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(historyImportJobs.id, id),
          eq(historyImportJobs.status, "RUNNING"),
        ),
      );
  }

  async deleteForTests(ids: string[]) {
    if (ids.length === 0) return;
    await this.database
      .delete(historyImportJobs)
      .where(inArray(historyImportJobs.id, ids));
  }
}
