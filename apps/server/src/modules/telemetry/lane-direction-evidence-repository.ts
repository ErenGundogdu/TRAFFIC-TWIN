import { inArray, sql } from "drizzle-orm";

import type { Database } from "../../infrastructure/database/client.js";
import { trafficAggregates } from "../../infrastructure/database/schema.js";
import {
  resolveLaneDirections,
  type LaneDirectionEvidenceRow,
  type ResolvedLaneDirection,
} from "./lane-direction-evidence.js";

export interface LaneDirectionEvidenceRepository {
  listResolvedDirections(assetIds: string[]): Promise<ResolvedLaneDirection[]>;
}

export class PostgresLaneDirectionEvidenceRepository implements LaneDirectionEvidenceRepository {
  constructor(private readonly database: Database) {}

  async listResolvedDirections(
    assetIds: string[],
  ): Promise<ResolvedLaneDirection[]> {
    if (assetIds.length === 0) return [];

    const result = await this.database.execute<{
      assetId: string;
      direction: number;
      lane: number;
      vehicleCount: string;
    }>(sql`
      SELECT
        ${trafficAggregates.assetId} AS "assetId",
        ${trafficAggregates.direction} AS "direction",
        lane_entry.key::integer AS "lane",
        SUM((lane_entry.value ->> 'vehicleCount')::bigint)::text AS "vehicleCount"
      FROM ${trafficAggregates}
      CROSS JOIN LATERAL jsonb_each(${trafficAggregates.laneBreakdown}) AS lane_entry(key, value)
      WHERE ${inArray(trafficAggregates.assetId, assetIds)}
        AND ${trafficAggregates.resolution} = 'day'
        AND lane_entry.key ~ '^[1-9][0-9]*$'
      GROUP BY
        ${trafficAggregates.assetId},
        ${trafficAggregates.direction},
        lane_entry.key
    `);

    return resolveLaneDirections(
      result.rows.flatMap((row): LaneDirectionEvidenceRow[] => {
        if (row.direction !== 1 && row.direction !== 2) return [];
        return [
          {
            assetId: row.assetId,
            direction: row.direction,
            lane: row.lane,
            vehicleCount: Number(row.vehicleCount),
          },
        ];
      }),
    );
  }
}
