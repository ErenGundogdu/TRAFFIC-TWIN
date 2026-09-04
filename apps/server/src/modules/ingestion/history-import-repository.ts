import { eq } from "drizzle-orm";

import type { Database } from "../../infrastructure/database/client.js";
import {
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

  async recordDownloaded(artifact: HistoryArtifactRecord) {
    await this.database
      .insert(ingestionArtifacts)
      .values({ ...artifact, status: "DOWNLOADED" })
      .onConflictDoUpdate({
        target: ingestionArtifacts.id,
        set: {
          sourceUrl: artifact.sourceUrl,
          storagePath: artifact.storagePath,
          checksumSha256: artifact.checksumSha256,
          byteSize: artifact.byteSize,
          status: "DOWNLOADED",
          processorVersion: artifact.processorVersion,
          errorMessage: null,
          updatedAt: new Date(),
        },
      });
  }

  async replaceWithProcessed(
    artifactId: string,
    assetId: string,
    aggregates: HistoryAggregate[],
    recordCount: number,
    validRecordCount: number,
  ) {
    await this.database.transaction(async (transaction) => {
      await transaction
        .delete(trafficAggregates)
        .where(eq(trafficAggregates.artifactId, artifactId));

      if (aggregates.length > 0) {
        await transaction.insert(trafficAggregates).values(
          aggregates.map((aggregate) => ({
            assetId,
            artifactId,
            ...aggregate,
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
