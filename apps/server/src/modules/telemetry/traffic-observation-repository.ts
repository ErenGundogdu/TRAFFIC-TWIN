import type { StationSummary } from "@traffic-twin/contracts";
import { desc, inArray } from "drizzle-orm";

import type { Database } from "../../infrastructure/database/client.js";
import { trafficObservations } from "../../infrastructure/database/schema.js";

export interface TrafficObservationRepository {
  insertBatch(
    stations: StationSummary[],
    sourceUpdatedAt: Date,
  ): Promise<number>;
  listLatestDirections(assetIds: string[]): Promise<PersistedDirection[]>;
}

export interface PersistedDirection {
  assetId: string;
  direction: 1 | 2;
  measuredAt: string;
  averageSpeedKmh: number | null;
  flowVehiclesPerHour: number | null;
  sourceUpdatedAt: string;
}

export class PostgresTrafficObservationRepository implements TrafficObservationRepository {
  constructor(private readonly database: Database) {}

  async insertBatch(
    stations: StationSummary[],
    sourceUpdatedAt: Date,
  ): Promise<number> {
    const observations = stations.flatMap((station) =>
      station.directions.flatMap((direction) => {
        if (
          !direction.measuredAt ||
          (direction.averageSpeedKmh === null &&
            direction.flowVehiclesPerHour === null)
        ) {
          return [];
        }

        return {
          assetId: station.id,
          direction: direction.direction,
          measuredAt: new Date(direction.measuredAt),
          averageSpeedKmh: direction.averageSpeedKmh,
          flowVehiclesPerHour: direction.flowVehiclesPerHour,
          sourceUpdatedAt,
        };
      }),
    );

    if (observations.length === 0) {
      return 0;
    }

    const inserted = await this.database
      .insert(trafficObservations)
      .values(observations)
      .onConflictDoNothing()
      .returning({ assetId: trafficObservations.assetId });

    return inserted.length;
  }

  async listLatestDirections(
    assetIds: string[],
  ): Promise<PersistedDirection[]> {
    if (assetIds.length === 0) return [];

    const rows = await this.database
      .selectDistinctOn([
        trafficObservations.assetId,
        trafficObservations.direction,
      ])
      .from(trafficObservations)
      .where(inArray(trafficObservations.assetId, assetIds))
      .orderBy(
        trafficObservations.assetId,
        trafficObservations.direction,
        desc(trafficObservations.measuredAt),
      );

    return rows.flatMap((row) => {
      if (row.direction !== 1 && row.direction !== 2) return [];

      return {
        assetId: row.assetId,
        direction: row.direction,
        measuredAt: row.measuredAt.toISOString(),
        averageSpeedKmh: row.averageSpeedKmh,
        flowVehiclesPerHour: row.flowVehiclesPerHour,
        sourceUpdatedAt: row.sourceUpdatedAt.toISOString(),
      };
    });
  }
}
