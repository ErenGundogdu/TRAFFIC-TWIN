import type {
  StationCatalogResponse,
  StationSummary,
} from "@traffic-twin/contracts";

import type { FintrafficClient } from "../providers/fintraffic/client.js";
import { normalizeStations } from "../providers/fintraffic/normalize-stations.js";
import type {
  PersistedDirection,
  TrafficObservationRepository,
} from "../telemetry/traffic-observation-repository.js";
import { classifyMeasurementFreshness } from "../telemetry/classify-measurement-freshness.js";
import type {
  PersistedStation,
  StationCatalogRepository,
} from "./station-catalog-repository.js";

const SOURCE_BASE = {
  id: "fintraffic-tms",
  name: "Fintraffic Digitraffic TMS",
  attribution: "Fintraffic / Digitraffic, CC BY 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
} as const;
const SOURCE_FRESHNESS_LIMIT_MS = 3 * 60 * 1_000;

export class CoverageAreaNotFoundError extends Error {
  constructor(id: string) {
    super(`Coverage area '${id}' was not found.`);
    this.name = "CoverageAreaNotFoundError";
  }
}

function toUnavailableStation(station: PersistedStation): StationSummary {
  return {
    ...station,
    freshness: "UNAVAILABLE",
    directions: [1, 2].map((direction) => ({
      direction: direction as 1 | 2,
      label: `Yön ${direction}`,
      averageSpeedKmh: null,
      flowVehiclesPerHour: null,
      measuredAt: null,
    })),
  };
}

function toPersistedStation(
  station: PersistedStation,
  directions: PersistedDirection[],
  now: Date,
): StationSummary {
  const stationDirections = [1, 2].map((direction) => {
    const persisted = directions.find(
      (item) => item.assetId === station.id && item.direction === direction,
    );

    return {
      direction: direction as 1 | 2,
      label: `Yön ${direction}`,
      averageSpeedKmh: persisted?.averageSpeedKmh ?? null,
      flowVehiclesPerHour: persisted?.flowVehiclesPerHour ?? null,
      measuredAt: persisted?.measuredAt ?? null,
    };
  }) as StationSummary["directions"];
  const newestMeasurement = stationDirections
    .map((direction) => direction.measuredAt)
    .filter((value): value is string => value !== null)
    .sort()
    .at(-1);

  return {
    ...station,
    freshness: classifyMeasurementFreshness(newestMeasurement, now),
    directions: stationDirections,
  };
}

export class StationCatalogService {
  constructor(
    private readonly repository: StationCatalogRepository,
    private readonly fintrafficClient: Pick<
      FintrafficClient,
      "getStations" | "getCurrentStationData"
    >,
    private readonly clock: () => Date = () => new Date(),
    private readonly observationRepository?: TrafficObservationRepository,
  ) {}

  async getCoverageStations(
    coverageAreaId: string,
  ): Promise<StationCatalogResponse> {
    const coverageArea = await this.repository.findCoverageArea(coverageAreaId);

    if (!coverageArea) {
      throw new CoverageAreaNotFoundError(coverageAreaId);
    }

    const fetchedAt = this.clock();

    if (this.observationRepository) {
      const persistedStations = await this.repository.listStations(
        coverageArea.id,
      );

      if (persistedStations.length > 0) {
        const directions =
          await this.observationRepository.listLatestDirections(
            persistedStations.map((station) => station.id),
          );
        const sourceUpdatedAt = directions
          .map((direction) => direction.sourceUpdatedAt)
          .sort()
          .at(-1);
        const sourceAgeMs = sourceUpdatedAt
          ? fetchedAt.getTime() - new Date(sourceUpdatedAt).getTime()
          : Number.POSITIVE_INFINITY;

        return {
          coverageArea,
          source: {
            ...SOURCE_BASE,
            status:
              sourceAgeMs <= SOURCE_FRESHNESS_LIMIT_MS
                ? "AVAILABLE"
                : "DEGRADED",
            updatedAt: sourceUpdatedAt ?? null,
            fetchedAt: fetchedAt.toISOString(),
          },
          stations: persistedStations.map((station) =>
            toPersistedStation(station, directions, fetchedAt),
          ),
        };
      }
    }

    try {
      const [stationCollection, dataCollection] = await Promise.all([
        this.fintrafficClient.getStations(),
        this.fintrafficClient.getCurrentStationData(),
      ]);
      const stations = normalizeStations(
        stationCollection,
        dataCollection,
        coverageArea,
        fetchedAt,
      );

      await this.repository.upsertStations(
        coverageArea.id,
        stations,
        new Date(stationCollection.dataUpdatedTime),
      );
      await this.observationRepository?.insertBatch(
        stations,
        new Date(dataCollection.dataUpdatedTime),
      );

      return {
        coverageArea,
        source: {
          ...SOURCE_BASE,
          status: "AVAILABLE",
          updatedAt: dataCollection.dataUpdatedTime,
          fetchedAt: fetchedAt.toISOString(),
        },
        stations,
      };
    } catch (error) {
      const stations = await this.repository.listStations(coverageArea.id);

      if (stations.length === 0) {
        throw error;
      }

      return {
        coverageArea,
        source: {
          ...SOURCE_BASE,
          status: "DEGRADED",
          updatedAt: null,
          fetchedAt: fetchedAt.toISOString(),
        },
        stations: stations.map(toUnavailableStation),
      };
    }
  }
}
