import type { TrafficCompositionBreakdown } from "@traffic-twin/contracts";
import { and, eq, gte, lt, sql } from "drizzle-orm";

import type { Database } from "../../infrastructure/database/client.js";
import { trafficAggregates } from "../../infrastructure/database/schema.js";

export interface HourlyLaneHistoryRow {
  direction: 1 | 2;
  timestamp: string;
  laneBreakdown: TrafficCompositionBreakdown;
}

export interface LaneHistoryRepository {
  listHourlyBaseline(input: {
    assetId: string;
    from: Date;
    to: Date;
    timeZone: string;
    localWeekday: number;
    localHour: number;
  }): Promise<HourlyLaneHistoryRow[]>;
}

export class PostgresLaneHistoryRepository implements LaneHistoryRepository {
  constructor(private readonly database: Database) {}

  async listHourlyBaseline(input: {
    assetId: string;
    from: Date;
    to: Date;
    timeZone: string;
    localWeekday: number;
    localHour: number;
  }): Promise<HourlyLaneHistoryRow[]> {
    const rows = await this.database
      .select({
        direction: trafficAggregates.direction,
        timestamp: trafficAggregates.bucketStart,
        laneBreakdown: trafficAggregates.laneBreakdown,
      })
      .from(trafficAggregates)
      .where(
        and(
          eq(trafficAggregates.assetId, input.assetId),
          eq(trafficAggregates.resolution, "hour"),
          gte(trafficAggregates.bucketStart, input.from),
          lt(trafficAggregates.bucketStart, input.to),
          sql`extract(isodow from timezone(${input.timeZone}, ${trafficAggregates.bucketStart})) = ${input.localWeekday}`,
          sql`extract(hour from timezone(${input.timeZone}, ${trafficAggregates.bucketStart})) = ${input.localHour}`,
          sql`${trafficAggregates.laneBreakdown} <> '{}'::jsonb`,
        ),
      );

    return rows.flatMap((row) =>
      row.direction === 1 || row.direction === 2
        ? [
            {
              direction: row.direction,
              timestamp: row.timestamp.toISOString(),
              laneBreakdown: row.laneBreakdown,
            },
          ]
        : [],
    );
  }
}
