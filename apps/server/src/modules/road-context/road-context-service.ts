import type { StationRoadContext } from "@traffic-twin/contracts";

import { ApplicationError } from "../../common/errors/application-error.js";
import type { StationCatalogRepository } from "../asset-catalog/station-catalog-repository.js";
import { inferFintrafficRoadRef } from "../junctions/junction-matching.js";
import type { OpenStreetMapClient } from "../providers/openstreetmap/client.js";
import type {
  RoadContextRepository,
  StoredRoadContext,
} from "./road-context-repository.js";

const CACHE_TTL_MS = 24 * 60 * 60 * 1_000;
const FAILED_REFRESH_RETRY_MS = 5 * 60 * 1_000;

export class RoadContextNotFoundError extends ApplicationError {
  constructor() {
    super("The road-context station or coverage area was not found.", {
      code: "ROAD_CONTEXT_SCOPE_NOT_FOUND",
      kind: "NOT_FOUND",
      publicMessage: "İstasyon veya kapsama alanı bulunamadı.",
    });
  }
}

export class RoadContextService {
  private readonly cache = new Map<
    string,
    { refreshAfter: number; value: StationRoadContext }
  >();

  constructor(
    private readonly stationRepository: StationCatalogRepository,
    private readonly openStreetMapClient: Pick<
      OpenStreetMapClient,
      "getRoadContext"
    >,
    private readonly roadContextRepository: RoadContextRepository,
    private readonly clock: () => Date = () => new Date(),
    private readonly onRefreshError: (error: unknown) => void = () => undefined,
  ) {}

  async getStationRoadContext(coverageAreaId: string, assetId: string) {
    const cacheKey = `${coverageAreaId}:${assetId}`;
    const cached = this.cache.get(cacheKey);
    const now = this.clock();
    if (cached && cached.refreshAfter > now.getTime()) return cached.value;

    const coverageArea =
      await this.stationRepository.findCoverageArea(coverageAreaId);
    if (!coverageArea) throw new RoadContextNotFoundError();

    const station = (
      await this.stationRepository.listStations(coverageAreaId)
    ).find((item) => item.id === assetId);
    if (!station) throw new RoadContextNotFoundError();

    const persisted =
      cached?.value ??
      (await this.roadContextRepository.findByAssetId(assetId));
    if (persisted && isFresh(persisted, now)) {
      const value = withFreshness(persisted, "FRESH");
      this.cache.set(cacheKey, {
        refreshAfter:
          new Date(persisted.source.fetchedAt).getTime() + CACHE_TTL_MS,
        value,
      });
      return value;
    }

    const roadRef = inferFintrafficRoadRef(station.name);
    try {
      const result = await this.openStreetMapClient.getRoadContext({
        longitude: station.longitude,
        latitude: station.latitude,
        bearing: station.bearing,
        roadRef,
      });
      const fetchedAt = this.clock();
      const storedValue: StoredRoadContext = {
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
      await this.roadContextRepository.upsert(storedValue);

      const value = withFreshness(storedValue, "FRESH");
      this.cache.set(cacheKey, {
        refreshAfter: fetchedAt.getTime() + CACHE_TTL_MS,
        value,
      });
      return value;
    } catch (error) {
      if (!persisted) throw error;

      this.onRefreshError(error);
      const value = withFreshness(persisted, "STALE");
      this.cache.set(cacheKey, {
        refreshAfter: now.getTime() + FAILED_REFRESH_RETRY_MS,
        value,
      });
      return value;
    }
  }
}

function isFresh(value: StoredRoadContext, now: Date) {
  return (
    new Date(value.source.fetchedAt).getTime() + CACHE_TTL_MS > now.getTime()
  );
}

function withFreshness(
  value: StoredRoadContext,
  freshness: StationRoadContext["freshness"],
): StationRoadContext {
  return { ...value, freshness };
}
