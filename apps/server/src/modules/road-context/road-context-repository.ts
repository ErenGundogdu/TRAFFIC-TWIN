import {
  stationRoadContextSchema,
  type StationRoadContext,
} from "@traffic-twin/contracts";
import { eq } from "drizzle-orm";

import type { Database } from "../../infrastructure/database/client.js";
import { stationRoadContexts } from "../../infrastructure/database/schema.js";

export type StoredRoadContext = Omit<StationRoadContext, "freshness">;

export interface RoadContextRepository {
  findByAssetId(assetId: string): Promise<StoredRoadContext | null>;
  upsert(value: StoredRoadContext): Promise<void>;
}

export class PostgresRoadContextRepository implements RoadContextRepository {
  constructor(private readonly database: Database) {}

  async findByAssetId(assetId: string) {
    const [row] = await this.database
      .select()
      .from(stationRoadContexts)
      .where(eq(stationRoadContexts.assetId, assetId))
      .limit(1);

    if (!row) return null;

    const parsed = stationRoadContextSchema.parse({
      assetId: row.assetId,
      status: row.status,
      freshness: "FRESH",
      roadRef: row.roadRef,
      matchingPolicy: row.matchingPolicy,
      source: {
        id: "openstreetmap",
        attribution: "© OpenStreetMap contributors",
        licenseUrl: "https://www.openstreetmap.org/copyright",
        updatedAt: row.sourceUpdatedAt.toISOString(),
        fetchedAt: row.fetchedAt.toISOString(),
      },
      segments: row.segments,
    });
    const { freshness: _, ...stored } = parsed;
    void _;
    return stored;
  }

  async upsert(value: StoredRoadContext) {
    await this.database
      .insert(stationRoadContexts)
      .values({
        assetId: value.assetId,
        status: value.status,
        roadRef: value.roadRef,
        matchingPolicy: value.matchingPolicy,
        sourceUpdatedAt: new Date(value.source.updatedAt),
        fetchedAt: new Date(value.source.fetchedAt),
        segments: value.segments,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: stationRoadContexts.assetId,
        set: {
          status: value.status,
          roadRef: value.roadRef,
          matchingPolicy: value.matchingPolicy,
          sourceUpdatedAt: new Date(value.source.updatedAt),
          fetchedAt: new Date(value.source.fetchedAt),
          segments: value.segments,
          updatedAt: new Date(),
        },
      });
  }
}
