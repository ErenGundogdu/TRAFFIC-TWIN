import { and, eq, lt } from "drizzle-orm";

import type { Database } from "../../infrastructure/database/client.js";
import {
  trafficAggregates,
  trafficObservations,
} from "../../infrastructure/database/schema.js";

const DAY_MS = 86_400_000;

export class RetentionService {
  constructor(private readonly database: Database) {}

  async run(
    liveObservationDays: number,
    historyMinuteDays: number,
    now = new Date(),
  ) {
    const observationCutoff = new Date(
      now.getTime() - liveObservationDays * DAY_MS,
    );
    const minuteCutoff = new Date(now.getTime() - historyMinuteDays * DAY_MS);

    const [deletedObservations, deletedMinuteAggregates] = await Promise.all([
      this.database
        .delete(trafficObservations)
        .where(lt(trafficObservations.measuredAt, observationCutoff))
        .returning({ assetId: trafficObservations.assetId }),
      this.database
        .delete(trafficAggregates)
        .where(
          and(
            eq(trafficAggregates.resolution, "minute"),
            lt(trafficAggregates.bucketStart, minuteCutoff),
          ),
        )
        .returning({ assetId: trafficAggregates.assetId }),
    ]);

    return {
      observationCutoff: observationCutoff.toISOString(),
      minuteAggregateCutoff: minuteCutoff.toISOString(),
      deletedObservations: deletedObservations.length,
      deletedMinuteAggregates: deletedMinuteAggregates.length,
    };
  }
}
