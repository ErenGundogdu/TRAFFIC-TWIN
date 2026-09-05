import type { JunctionSummary } from "@traffic-twin/contracts";
import { eq, sql } from "drizzle-orm";

import type { Database } from "../../infrastructure/database/client.js";
import {
  derivedJunctions,
  junctionSensorMatches,
  trafficAssets,
} from "../../infrastructure/database/schema.js";
import type { DerivedJunction } from "./junction-matching.js";

export interface JunctionCatalogRepository {
  replaceCoverage(
    coverageAreaId: string,
    junctions: DerivedJunction[],
  ): Promise<void>;
  listCoverage(coverageAreaId: string): Promise<{
    junctions: JunctionSummary[];
    fetchedAt: string | null;
  }>;
}

export class PostgresJunctionCatalogRepository implements JunctionCatalogRepository {
  constructor(private readonly database: Database) {}

  async replaceCoverage(coverageAreaId: string, junctions: DerivedJunction[]) {
    await this.database.transaction(async (transaction) => {
      await transaction
        .delete(derivedJunctions)
        .where(eq(derivedJunctions.coverageAreaId, coverageAreaId));

      if (junctions.length === 0) return;

      await transaction.insert(derivedJunctions).values(
        junctions.map((junction) => ({
          id: junction.id,
          coverageAreaId: junction.coverageAreaId,
          osmRelationId: junction.osmRelationId,
          name: junction.name,
          location: sql`ST_SetSRID(ST_MakePoint(${junction.longitude}, ${junction.latitude}), 4326)`,
          roadRefs: junction.roadRefs,
          coverage: junction.coverage,
          policyVersion: junction.policyVersion,
          sourceUpdatedAt: junction.sourceUpdatedAt,
          sourceFetchedAt: junction.sourceFetchedAt,
          updatedAt: new Date(),
        })),
      );

      const matches = junctions.flatMap((junction) =>
        junction.matches.map((match) => ({
          junctionId: junction.id,
          stationAssetId: match.stationAssetId,
          roadRef: match.roadRef,
          distanceMeters: match.distanceMeters,
          bearingDifferenceDegrees: match.bearingDifferenceDegrees,
          confidence: match.confidence,
          policyVersion: junction.policyVersion,
        })),
      );

      if (matches.length > 0) {
        await transaction.insert(junctionSensorMatches).values(matches);
      }
    });
  }

  async listCoverage(coverageAreaId: string) {
    const rows = await this.database
      .select({
        id: derivedJunctions.id,
        osmRelationId: derivedJunctions.osmRelationId,
        name: derivedJunctions.name,
        location: derivedJunctions.location,
        roadRefs: derivedJunctions.roadRefs,
        coverage: derivedJunctions.coverage,
        policyVersion: derivedJunctions.policyVersion,
        sourceUpdatedAt: derivedJunctions.sourceUpdatedAt,
        sourceFetchedAt: derivedJunctions.sourceFetchedAt,
        stationAssetId: junctionSensorMatches.stationAssetId,
        stationName: trafficAssets.name,
        roadRef: junctionSensorMatches.roadRef,
        distanceMeters: junctionSensorMatches.distanceMeters,
        bearingDifferenceDegrees:
          junctionSensorMatches.bearingDifferenceDegrees,
        confidence: junctionSensorMatches.confidence,
      })
      .from(derivedJunctions)
      .leftJoin(
        junctionSensorMatches,
        eq(junctionSensorMatches.junctionId, derivedJunctions.id),
      )
      .leftJoin(
        trafficAssets,
        eq(trafficAssets.id, junctionSensorMatches.stationAssetId),
      )
      .where(eq(derivedJunctions.coverageAreaId, coverageAreaId))
      .orderBy(derivedJunctions.name, trafficAssets.name);
    const grouped = new Map<string, JunctionSummary>();

    for (const row of rows) {
      const junction = grouped.get(row.id) ?? {
        id: row.id,
        osmRelationId: row.osmRelationId,
        name: row.name,
        longitude: row.location.x,
        latitude: row.location.y,
        roadRefs: row.roadRefs,
        coverage: row.coverage,
        policyVersion: row.policyVersion,
        sourceUpdatedAt: row.sourceUpdatedAt.toISOString(),
        sensors: [],
      };

      if (
        row.stationAssetId &&
        row.stationName &&
        row.roadRef &&
        row.distanceMeters !== null &&
        row.confidence
      ) {
        junction.sensors.push({
          assetId: row.stationAssetId,
          name: row.stationName,
          roadRef: row.roadRef,
          distanceMeters: row.distanceMeters,
          bearingDifferenceDegrees: row.bearingDifferenceDegrees,
          confidence: row.confidence,
        });
      }
      grouped.set(row.id, junction);
    }

    return {
      junctions: [...grouped.values()],
      fetchedAt: rows[0]?.sourceFetchedAt.toISOString() ?? null,
    };
  }
}
