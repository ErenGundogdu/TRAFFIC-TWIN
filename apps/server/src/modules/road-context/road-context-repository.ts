import {
  stationRoadContextSchema,
  type StationRoadContext,
} from "@traffic-twin/contracts";
import { and, eq, inArray } from "drizzle-orm";

import type { Database } from "../../infrastructure/database/client.js";
import { stationRoadContexts } from "../../infrastructure/database/schema.js";

export type StoredRoadContext = Omit<StationRoadContext, "freshness">;

export interface RoadContextRepository {
  findByAssetId(assetId: string): Promise<StoredRoadContext | null>;
  findByAssetIds(assetIds: string[]): Promise<StoredRoadContext[]>;
  findMatchedByRoadRef(roadRef: string): Promise<StoredRoadContext[]>;
  findMatchedByAssetIds(assetIds: string[]): Promise<StoredRoadContext[]>;
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

    return parseStoredRoadContext(row);
  }

  async findByAssetIds(assetIds: string[]) {
    if (assetIds.length === 0) return [];

    const rows = await this.database
      .select()
      .from(stationRoadContexts)
      .where(inArray(stationRoadContexts.assetId, assetIds));

    return rows.map(parseStoredRoadContext);
  }

  async findMatchedByRoadRef(roadRef: string) {
    const rows = await this.database
      .select()
      .from(stationRoadContexts)
      .where(
        and(
          eq(stationRoadContexts.status, "MATCHED"),
          eq(stationRoadContexts.roadRef, roadRef),
        ),
      );

    return rows.map(parseStoredRoadContext);
  }

  async findMatchedByAssetIds(assetIds: string[]) {
    if (assetIds.length === 0) return [];

    const rows = await this.database
      .select()
      .from(stationRoadContexts)
      .where(
        and(
          eq(stationRoadContexts.status, "MATCHED"),
          inArray(stationRoadContexts.assetId, assetIds),
        ),
      );

    return rows.map(parseStoredRoadContext);
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

function parseStoredRoadContext(
  row: typeof stationRoadContexts.$inferSelect,
): StoredRoadContext {
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
