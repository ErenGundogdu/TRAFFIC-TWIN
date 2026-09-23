import type { StationSummary } from "@traffic-twin/contracts";
import type { LaneFlowWindow } from "@traffic-twin/contracts";
import { desc, inArray } from "drizzle-orm";

import type { Database } from "../../infrastructure/database/client.js";
import {
  trafficLaneObservations,
  trafficObservations,
} from "../../infrastructure/database/schema.js";

export interface TrafficObservationRepository {
  insertBatch(
    stations: StationSummary[],
    sourceUpdatedAt: Date,
  ): Promise<number>;
  listLatestDirections(assetIds: string[]): Promise<PersistedDirection[]>;
  listLatestLanes(assetIds: string[]): Promise<PersistedLane[]>;
}

export interface PersistedLane {
  assetId: string;
  lane: number;
  averageSpeedKmh: number | null;
  flowVehiclesPerHour: number | null;
  flowWindow: LaneFlowWindow | null;
  measuredAt: string;
  sourceUpdatedAt: string;
}

export interface PersistedDirection {
  assetId: string;
  direction: 1 | 2;
  measuredAt: string;
  averageSpeedKmh: number | null;
  flowVehiclesPerHour: number | null;
  sourceUpdatedAt: string;
  speedPercentOfFreeFlow: number | null;
  flowPercentOfCapacity: number | null;
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
          speedPercentOfFreeFlow: direction.trafficFlow.speedPercentOfFreeFlow,
          flowPercentOfCapacity: direction.trafficFlow.flowPercentOfCapacity,
          sourceUpdatedAt,
        };
      }),
    );

    const inserted =
      observations.length === 0
        ? []
        : await this.database
            .insert(trafficObservations)
            .values(observations)
            .onConflictDoNothing()
            .returning({ assetId: trafficObservations.assetId });

    const laneObservations = stations.flatMap((station) =>
      station.lanes.flatMap((lane) => {
        if (
          !lane.measuredAt ||
          (lane.averageSpeedKmh === null && lane.flowVehiclesPerHour === null)
        ) {
          return [];
        }

        return {
          assetId: station.id,
          lane: lane.lane,
          measuredAt: new Date(lane.measuredAt),
          averageSpeedKmh: lane.averageSpeedKmh,
          flowVehiclesPerHour: lane.flowVehiclesPerHour,
          flowWindow: lane.flowWindow,
          sourceUpdatedAt,
        };
      }),
    );

    if (laneObservations.length > 0) {
      await this.database
        .insert(trafficLaneObservations)
        .values(laneObservations)
        .onConflictDoNothing();
    }

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
        speedPercentOfFreeFlow: row.speedPercentOfFreeFlow,
        flowPercentOfCapacity: row.flowPercentOfCapacity,
        sourceUpdatedAt: row.sourceUpdatedAt.toISOString(),
      };
    });
  }

  async listLatestLanes(assetIds: string[]): Promise<PersistedLane[]> {
    if (assetIds.length === 0) return [];

    const rows = await this.database
      .selectDistinctOn([
        trafficLaneObservations.assetId,
        trafficLaneObservations.lane,
      ])
      .from(trafficLaneObservations)
      .where(inArray(trafficLaneObservations.assetId, assetIds))
      .orderBy(
        trafficLaneObservations.assetId,
        trafficLaneObservations.lane,
        desc(trafficLaneObservations.measuredAt),
      );

    return rows.map((row) => ({
      assetId: row.assetId,
      lane: row.lane,
      averageSpeedKmh: row.averageSpeedKmh,
      flowVehiclesPerHour: row.flowVehiclesPerHour,
      flowWindow:
        row.flowWindow === "ROLLING_5_MINUTES" ||
        row.flowWindow === "FIXED_5_MINUTES"
          ? row.flowWindow
          : null,
      measuredAt: row.measuredAt.toISOString(),
      sourceUpdatedAt: row.sourceUpdatedAt.toISOString(),
    }));
  }
}
