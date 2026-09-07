import type { StationRoadContext } from "@traffic-twin/contracts";

import type { StationCatalogRepository } from "../asset-catalog/station-catalog-repository.js";
import { inferFintrafficRoadRef } from "../junctions/junction-matching.js";
import type { OpenStreetMapClient } from "../providers/openstreetmap/client.js";

const CACHE_TTL_MS = 24 * 60 * 60 * 1_000;

export class RoadContextNotFoundError extends Error {}

export class RoadContextService {
  private readonly cache = new Map<
    string,
    { expiresAt: number; value: StationRoadContext }
  >();

  constructor(
    private readonly stationRepository: StationCatalogRepository,
    private readonly openStreetMapClient: Pick<
      OpenStreetMapClient,
      "getRoadContext"
    >,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async getStationRoadContext(coverageAreaId: string, assetId: string) {
    const cacheKey = `${coverageAreaId}:${assetId}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > this.clock().getTime()) {
      return cached.value;
    }

    const coverageArea =
      await this.stationRepository.findCoverageArea(coverageAreaId);
    if (!coverageArea) throw new RoadContextNotFoundError();

    const station = (
      await this.stationRepository.listStations(coverageAreaId)
    ).find((item) => item.id === assetId);
    if (!station) throw new RoadContextNotFoundError();

    const roadRef = inferFintrafficRoadRef(station.name);
    const result = await this.openStreetMapClient.getRoadContext({
      longitude: station.longitude,
      latitude: station.latitude,
      bearing: station.bearing,
      roadRef,
    });
    const fetchedAt = this.clock();
    const value: StationRoadContext = {
      assetId,
      status: result.segments.length > 0 ? "MATCHED" : "NO_MATCH",
      roadRef,
      matchingPolicy: "osm-ref-nearest-bearing-v1",
      source: {
        id: "openstreetmap",
        attribution: "© OpenStreetMap contributors",
        licenseUrl: "https://www.openstreetmap.org/copyright",
        updatedAt: result.sourceUpdatedAt,
        fetchedAt: fetchedAt.toISOString(),
      },
      segments: result.segments.map(({ sourceUpdatedAt: _, ...segment }) => {
        void _;
        return segment;
      }),
    };
    this.cache.set(cacheKey, {
      expiresAt: fetchedAt.getTime() + CACHE_TTL_MS,
      value,
    });
    return value;
  }
}
