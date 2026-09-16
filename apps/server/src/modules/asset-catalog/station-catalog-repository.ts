import type { CoverageArea, StationSummary } from "@traffic-twin/contracts";
import { eq, inArray, sql } from "drizzle-orm";

import type { Database } from "../../infrastructure/database/client.js";
import {
  coverageAreas,
  trafficDirectionProfiles,
  trafficAssets,
} from "../../infrastructure/database/schema.js";

export interface PersistedStation {
  id: string;
  providerStationId: number;
  tmsNumber: number;
  name: string;
  longitude: number;
  latitude: number;
  bearing: number | null;
  directionProfiles?: Array<{
    direction: 1 | 2;
    freeFlowSpeedKmh: number | null;
    maximumFlowVehiclesPerHour: number | null;
  }>;
}

export interface StationCatalogRepository {
  findCoverageArea(id: string): Promise<CoverageArea | null>;
  listStations(coverageAreaId: string): Promise<PersistedStation[]>;
  upsertStations(
    coverageAreaId: string,
    stations: StationSummary[],
    sourceUpdatedAt: Date,
    referenceSourceUpdatedAt?: Date,
  ): Promise<void>;
}

export class PostgresStationCatalogRepository implements StationCatalogRepository {
  constructor(private readonly database: Database) {}

  async findCoverageArea(id: string): Promise<CoverageArea | null> {
    const [area] = await this.database
      .select()
      .from(coverageAreas)
      .where(eq(coverageAreas.id, id))
      .limit(1);

    return area
      ? {
          id: area.id,
          name: area.name,
          timeZone: area.timeZone,
          bbox: [
            area.minLongitude,
            area.minLatitude,
            area.maxLongitude,
            area.maxLatitude,
          ],
        }
      : null;
  }

  async listStations(coverageAreaId: string): Promise<PersistedStation[]> {
    const rows = await this.database
      .select({
        id: trafficAssets.id,
        providerStationId: trafficAssets.providerStationId,
        tmsNumber: trafficAssets.tmsNumber,
        name: trafficAssets.name,
        location: trafficAssets.location,
        bearing: trafficAssets.bearing,
      })
      .from(trafficAssets)
      .where(eq(trafficAssets.coverageAreaId, coverageAreaId))
      .orderBy(trafficAssets.name);

    const profiles =
      rows.length === 0
        ? []
        : await this.database
            .select()
            .from(trafficDirectionProfiles)
            .where(
              inArray(
                trafficDirectionProfiles.assetId,
                rows.map((row) => row.id),
              ),
            );

    return rows.map((row) => ({
      id: row.id,
      providerStationId: row.providerStationId,
      tmsNumber: row.tmsNumber,
      name: row.name,
      longitude: row.location.x,
      latitude: row.location.y,
      bearing: row.bearing,
      directionProfiles: profiles.flatMap((profile) =>
        profile.assetId === row.id &&
        (profile.direction === 1 || profile.direction === 2)
          ? [
              {
                direction: profile.direction,
                freeFlowSpeedKmh: profile.freeFlowSpeedKmh,
                maximumFlowVehiclesPerHour: profile.maximumFlowVehiclesPerHour,
              },
            ]
          : [],
      ),
    }));
  }

  async upsertStations(
    coverageAreaId: string,
    stations: StationSummary[],
    sourceUpdatedAt: Date,
    referenceSourceUpdatedAt?: Date,
  ): Promise<void> {
    if (stations.length === 0) {
      return;
    }

    await this.database
      .insert(trafficAssets)
      .values(
        stations.map((station) => ({
          id: station.id,
          coverageAreaId,
          provider: "fintraffic-tms",
          providerStationId: station.providerStationId,
          tmsNumber: station.tmsNumber,
          kind: "sensor-station" as const,
          name: station.name,
          location: sql`ST_SetSRID(ST_MakePoint(${station.longitude}, ${station.latitude}), 4326)`,
          bearing: station.bearing,
          collecting: true,
          capabilities: ["speed", "volume", "directional-flow"],
          sourceUpdatedAt,
          updatedAt: new Date(),
        })),
      )
      .onConflictDoUpdate({
        target: trafficAssets.id,
        set: {
          coverageAreaId: sql`excluded.coverage_area_id`,
          providerStationId: sql`excluded.provider_station_id`,
          tmsNumber: sql`excluded.tms_number`,
          name: sql`excluded.name`,
          location: sql`excluded.location`,
          bearing: sql`excluded.bearing`,
          collecting: true,
          capabilities: sql`excluded.capabilities`,
          sourceUpdatedAt: sql`excluded.source_updated_at`,
          updatedAt: new Date(),
        },
      });

    const profiles = stations.flatMap((station) =>
      station.directions.flatMap((direction) =>
        direction.trafficFlow.freeFlowSpeedKmh === null &&
        direction.trafficFlow.maximumFlowVehiclesPerHour === null
          ? []
          : [
              {
                assetId: station.id,
                direction: direction.direction,
                freeFlowSpeedKmh: direction.trafficFlow.freeFlowSpeedKmh,
                maximumFlowVehiclesPerHour:
                  direction.trafficFlow.maximumFlowVehiclesPerHour,
                sourceUpdatedAt: referenceSourceUpdatedAt,
                updatedAt: new Date(),
              },
            ],
      ),
    );

    if (profiles.length > 0) {
      await this.database
        .insert(trafficDirectionProfiles)
        .values(profiles)
        .onConflictDoUpdate({
          target: [
            trafficDirectionProfiles.assetId,
            trafficDirectionProfiles.direction,
          ],
          set: {
            freeFlowSpeedKmh: sql`excluded.free_flow_speed_kmh`,
            maximumFlowVehiclesPerHour: sql`excluded.maximum_flow_vehicles_per_hour`,
            sourceUpdatedAt: sql`excluded.source_updated_at`,
            updatedAt: new Date(),
          },
        });
    }
  }
}
