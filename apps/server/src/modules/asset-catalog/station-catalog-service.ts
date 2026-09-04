import type {
  StationCatalogResponse,
  StationSummary,
} from "@traffic-twin/contracts";

import type { FintrafficClient } from "../providers/fintraffic/client.js";
import { normalizeStations } from "../providers/fintraffic/normalize-stations.js";
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

export class StationCatalogService {
  constructor(
    private readonly repository: StationCatalogRepository,
    private readonly fintrafficClient: Pick<
      FintrafficClient,
      "getStations" | "getCurrentStationData"
    >,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async getCoverageStations(
    coverageAreaId: string,
  ): Promise<StationCatalogResponse> {
    const coverageArea = await this.repository.findCoverageArea(coverageAreaId);

    if (!coverageArea) {
      throw new CoverageAreaNotFoundError(coverageAreaId);
    }

    const fetchedAt = this.clock();

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
