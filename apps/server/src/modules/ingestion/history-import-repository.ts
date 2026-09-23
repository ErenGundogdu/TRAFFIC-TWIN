import { and, asc, eq, gte, lte } from "drizzle-orm";

import type { Database } from "../../infrastructure/database/client.js";
import {
  historyAggregateCoverage,
  ingestionArtifacts,
  trafficAggregates,
} from "../../infrastructure/database/schema.js";
import type { HistoryAggregate } from "../providers/fintraffic/parse-history.js";

export interface HistoryArtifactRecord {
  id: string;
  provider: string;
  assetId: string;
  sourceDate: string;
  sourceUrl: string;
  storagePath: string;
  checksumSha256: string;
  byteSize: number;
  processorVersion: string;
}

export class HistoryImportRepository {
  constructor(private readonly database: Database) {}

  async findArtifact(id: string) {
    const [artifact] = await this.database
      .select()
      .from(ingestionArtifacts)
      .where(eq(ingestionArtifacts.id, id))
      .limit(1);
    return artifact ?? null;
  }

  async listCoverageForArtifact(artifactId: string) {
    return this.database
      .select({
        resolution: historyAggregateCoverage.resolution,
        status: historyAggregateCoverage.status,
      })
      .from(historyAggregateCoverage)
      .where(eq(historyAggregateCoverage.artifactId, artifactId));
  }

  async listArtifactsForAssetDateRange(
    assetId: string,
    from: string,
    to: string,
  ) {
    return this.database
      .select({
        id: ingestionArtifacts.id,
        sourceDate: ingestionArtifacts.sourceDate,
        status: ingestionArtifacts.status,
        recordCount: ingestionArtifacts.recordCount,
        validRecordCount: ingestionArtifacts.validRecordCount,
        errorMessage: ingestionArtifacts.errorMessage,
        updatedAt: ingestionArtifacts.updatedAt,
      })
      .from(ingestionArtifacts)
      .where(
        and(
          eq(ingestionArtifacts.provider, "fintraffic-tms"),
          eq(ingestionArtifacts.assetId, assetId),
          gte(ingestionArtifacts.sourceDate, from),
          lte(ingestionArtifacts.sourceDate, to),
        ),
      )
      .orderBy(asc(ingestionArtifacts.sourceDate));
  }

  async recordDownloaded(artifact: HistoryArtifactRecord) {
    await this.database
      .insert(ingestionArtifacts)
      .values({ ...artifact, status: "DOWNLOADED" })
      .onConflictDoUpdate({
        target: ingestionArtifacts.id,
        set: {
          sourceUrl: artifact.sourceUrl,
          storagePath: artifact.storagePath,
          rawFileStatus: "RETAINED",
          rawFilePurgedAt: null,
          checksumSha256: artifact.checksumSha256,
          byteSize: artifact.byteSize,
          status: "DOWNLOADED",
          processorVersion: artifact.processorVersion,
          errorMessage: null,
          updatedAt: new Date(),
        },
      });
  }

  async restoreRetainedRawFile(artifact: HistoryArtifactRecord) {
    await this.database
      .update(ingestionArtifacts)
      .set({
        sourceUrl: artifact.sourceUrl,
        storagePath: artifact.storagePath,
        checksumSha256: artifact.checksumSha256,
        byteSize: artifact.byteSize,
        rawFileStatus: "RETAINED",
        rawFilePurgedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(ingestionArtifacts.id, artifact.id));
  }

  async replaceWithProcessed(
    artifactId: string,
    assetId: string,
    sourceDate: string,
    aggregates: HistoryAggregate[],
    recordCount: number,
    validRecordCount: number,
  ) {
    await this.database.transaction(async (transaction) => {
      await transaction
        .delete(trafficAggregates)
        .where(eq(trafficAggregates.artifactId, artifactId));
      await transaction
        .delete(historyAggregateCoverage)
        .where(eq(historyAggregateCoverage.artifactId, artifactId));

      if (aggregates.length > 0) {
        await transaction.insert(trafficAggregates).values(
          aggregates.map((aggregate) => ({
            assetId,
            artifactId,
            ...aggregate,
          })),
        );

        const coverageRows = summarizeCoverage(aggregates);
        await transaction.insert(historyAggregateCoverage).values(
          coverageRows.map((coverage) => ({
            assetId,
            sourceDate,
            artifactId,
            status: "AVAILABLE" as const,
            ...coverage,
          })),
        );
      }

      await transaction
        .update(ingestionArtifacts)
        .set({
          status: "PROCESSED",
          recordCount,
          validRecordCount,
          errorMessage: null,
          updatedAt: new Date(),
        })
        .where(eq(ingestionArtifacts.id, artifactId));
    });
  }

  async markFailed(artifactId: string, error: unknown) {
    await this.database
      .update(ingestionArtifacts)
      .set({
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        updatedAt: new Date(),
      })
      .where(eq(ingestionArtifacts.id, artifactId));
  }
}

function summarizeCoverage(aggregates: HistoryAggregate[]) {
  const resolutions = ["minute", "hour", "day"] as const;
  return resolutions.flatMap((resolution) => {
    const buckets = aggregates.filter(
      (aggregate) => aggregate.resolution === resolution,
    );
    if (buckets.length === 0) return [];
    const timestamps = buckets.map((bucket) => bucket.bucketStart.getTime());
    return [
      {
        resolution,
        bucketCount: buckets.length,
        firstBucketAt: new Date(Math.min(...timestamps)),
        lastBucketAt: new Date(Math.max(...timestamps)),
      },
    ];
  });
}
