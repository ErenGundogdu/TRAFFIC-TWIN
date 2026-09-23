import { and, eq, inArray, lt } from "drizzle-orm";

import type { Database } from "../../infrastructure/database/client.js";
import {
  historyAggregateCoverage,
  trafficAggregates,
  trafficObservations,
} from "../../infrastructure/database/schema.js";

const DAY_MS = 86_400_000;

export class RetentionService {
  constructor(private readonly database: Database) {}

  async run(
    liveObservationDays: number,
    historyMinuteDays: number,
    historyHourDays: number,
    historyDayDays: number,
    now = new Date(),
  ) {
    const observationCutoff = new Date(
      now.getTime() - liveObservationDays * DAY_MS,
    );
    const minuteCutoff = new Date(now.getTime() - historyMinuteDays * DAY_MS);
    const hourCutoff = new Date(now.getTime() - historyHourDays * DAY_MS);
    const dayCutoff = new Date(now.getTime() - historyDayDays * DAY_MS);

    const result = await this.database.transaction(async (transaction) => {
      const deletedObservations = await transaction
        .delete(trafficObservations)
        .where(lt(trafficObservations.measuredAt, observationCutoff))
        .returning({ assetId: trafficObservations.assetId });
      const deletedMinuteAggregates = await expireResolution(
        transaction,
        "minute",
        minuteCutoff,
      );
      const deletedHourAggregates = await expireResolution(
        transaction,
        "hour",
        hourCutoff,
      );
      const deletedDayAggregates = await expireResolution(
        transaction,
        "day",
        dayCutoff,
      );

      return {
        deletedObservations: deletedObservations.length,
        deletedMinuteAggregates,
        deletedHourAggregates,
        deletedDayAggregates,
      };
    });

    return {
      observationCutoff: observationCutoff.toISOString(),
      minuteAggregateCutoff: minuteCutoff.toISOString(),
      hourAggregateCutoff: hourCutoff.toISOString(),
      dayAggregateCutoff: dayCutoff.toISOString(),
      ...result,
    };
  }
}

type RetentionTransaction = Parameters<
  Parameters<Database["transaction"]>[0]
>[0];

async function expireResolution(
  transaction: RetentionTransaction,
  resolution: "minute" | "hour" | "day",
  cutoff: Date,
) {
  const expiringCoverage = await transaction
    .select({ artifactId: historyAggregateCoverage.artifactId })
    .from(historyAggregateCoverage)
    .where(
      and(
        eq(historyAggregateCoverage.resolution, resolution),
        eq(historyAggregateCoverage.status, "AVAILABLE"),
        lt(historyAggregateCoverage.lastBucketAt, cutoff),
      ),
    );
  const artifactIds = [
    ...new Set(expiringCoverage.map((row) => row.artifactId)),
  ];
  if (artifactIds.length === 0) return 0;

  const deleted = await transaction
    .delete(trafficAggregates)
    .where(
      and(
        eq(trafficAggregates.resolution, resolution),
        inArray(trafficAggregates.artifactId, artifactIds),
      ),
    )
    .returning({ assetId: trafficAggregates.assetId });

  await transaction
    .update(historyAggregateCoverage)
    .set({
      status: "EXPIRED",
      bucketCount: 0,
      firstBucketAt: null,
      lastBucketAt: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(historyAggregateCoverage.resolution, resolution),
        inArray(historyAggregateCoverage.artifactId, artifactIds),
      ),
    );

  return deleted.length;
}
