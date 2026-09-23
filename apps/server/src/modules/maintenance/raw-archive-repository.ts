import { and, eq, lt } from "drizzle-orm";

import type { Database } from "../../infrastructure/database/client.js";
import {
  coverageAreas,
  historyAggregateCoverage,
  ingestionArtifacts,
  trafficAssets,
} from "../../infrastructure/database/schema.js";

export class RawArchiveRepository {
  constructor(private readonly database: Database) {}

  async listPurgeCandidates(cutoff: Date, limit: number) {
    return await this.database
      .select({
        id: ingestionArtifacts.id,
        sourceDate: ingestionArtifacts.sourceDate,
        storagePath: ingestionArtifacts.storagePath,
        byteSize: ingestionArtifacts.byteSize,
        validRecordCount: ingestionArtifacts.validRecordCount,
        processorVersion: ingestionArtifacts.processorVersion,
        timeZone: coverageAreas.timeZone,
      })
      .from(ingestionArtifacts)
      .innerJoin(
        trafficAssets,
        eq(trafficAssets.id, ingestionArtifacts.assetId),
      )
      .innerJoin(
        coverageAreas,
        eq(coverageAreas.id, trafficAssets.coverageAreaId),
      )
      .where(
        and(
          eq(ingestionArtifacts.provider, "fintraffic-tms"),
          eq(ingestionArtifacts.status, "PROCESSED"),
          eq(ingestionArtifacts.rawFileStatus, "RETAINED"),
          lt(ingestionArtifacts.updatedAt, cutoff),
        ),
      )
      .orderBy(ingestionArtifacts.updatedAt)
      .limit(limit);
  }

  async listCoverage(artifactId: string) {
    return await this.database
      .select({
        resolution: historyAggregateCoverage.resolution,
        status: historyAggregateCoverage.status,
      })
      .from(historyAggregateCoverage)
      .where(eq(historyAggregateCoverage.artifactId, artifactId));
  }

  async markPurged(id: string, purgedAt: Date) {
    const [updated] = await this.database
      .update(ingestionArtifacts)
      .set({
        rawFileStatus: "PURGED",
        rawFilePurgedAt: purgedAt,
        updatedAt: purgedAt,
      })
      .where(
        and(
          eq(ingestionArtifacts.id, id),
          eq(ingestionArtifacts.rawFileStatus, "RETAINED"),
        ),
      )
      .returning({ id: ingestionArtifacts.id });

    return updated !== undefined;
  }

  async markMissing(id: string, observedAt: Date) {
    const [updated] = await this.database
      .update(ingestionArtifacts)
      .set({
        rawFileStatus: "MISSING",
        rawFilePurgedAt: null,
        updatedAt: observedAt,
      })
      .where(
        and(
          eq(ingestionArtifacts.id, id),
          eq(ingestionArtifacts.rawFileStatus, "RETAINED"),
        ),
      )
      .returning({ id: ingestionArtifacts.id });

    return updated !== undefined;
  }
}
