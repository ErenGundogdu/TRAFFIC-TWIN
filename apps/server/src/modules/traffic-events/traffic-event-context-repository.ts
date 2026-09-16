import type { TrafficEvent } from "@traffic-twin/contracts";
import { and, eq, inArray, sql } from "drizzle-orm";

import type { Database } from "../../infrastructure/database/client.js";
import {
  trafficAssets,
  trafficEvents,
} from "../../infrastructure/database/schema.js";
import { toTrafficEvent } from "./traffic-event-repository.js";

export interface TrafficEventContextCandidate {
  event: TrafficEvent;
  distanceMeters: number;
}

export interface TrafficEventContextRepository {
  findCandidates(input: {
    coverageAreaId: string;
    stationAssetId: string;
    maximumDistanceMeters: number;
  }): Promise<TrafficEventContextCandidate[]>;
}

export class PostgresTrafficEventContextRepository implements TrafficEventContextRepository {
  constructor(private readonly database: Database) {}

  async findCandidates(input: {
    coverageAreaId: string;
    stationAssetId: string;
    maximumDistanceMeters: number;
  }) {
    const eventGeography = sql`ST_SetSRID(ST_GeomFromGeoJSON(${trafficEvents.geometry}::text), 4326)::geography`;
    const stationGeography = sql`${trafficAssets.location}::geography`;
    const distanceMeters = sql<number>`ST_Distance(${stationGeography}, ${eventGeography})`;
    const rows = await this.database
      .select({ event: trafficEvents, distanceMeters })
      .from(trafficEvents)
      .innerJoin(
        trafficAssets,
        and(
          eq(trafficAssets.id, input.stationAssetId),
          eq(trafficAssets.coverageAreaId, input.coverageAreaId),
        ),
      )
      .where(
        and(
          eq(trafficEvents.coverageAreaId, input.coverageAreaId),
          inArray(trafficEvents.status, ["ACTIVE", "UPCOMING"]),
          sql`ST_DWithin(${stationGeography}, ${eventGeography}, ${input.maximumDistanceMeters})`,
        ),
      )
      .orderBy(distanceMeters);

    return rows.map((row) => ({
      event: toTrafficEvent(row.event),
      distanceMeters: Math.round(row.distanceMeters),
    }));
  }
}
