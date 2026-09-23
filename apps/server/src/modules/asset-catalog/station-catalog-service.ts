import type {
  StationCatalogResponse,
  StationSummary,
} from "@traffic-twin/contracts";

import { ApplicationError } from "../../common/errors/application-error.js";
import type { FintrafficClient } from "../providers/fintraffic/client.js";
import { normalizeDirectionHeading } from "../providers/fintraffic/normalize-direction-heading.js";
import { normalizeStations } from "../providers/fintraffic/normalize-stations.js";
import type {
  PersistedDirection,
  PersistedLane,
  TrafficObservationRepository,
} from "../telemetry/traffic-observation-repository.js";
import { classifyMeasurementFreshness } from "../telemetry/classify-measurement-freshness.js";
import { classifyTrafficFlow } from "../telemetry/classify-traffic-flow.js";
import type { LaneDirectionEvidenceRepository } from "../telemetry/lane-direction-evidence-repository.js";
import {
  resolveLaneDirectionsFromLayout,
  type ResolvedLaneDirection,
  type StationLanesInput,
} from "../telemetry/lane-direction-evidence.js";
import type { FintrafficStationLaneLayoutClient } from "../providers/fintraffic/station-lane-layout-client.js";
import type {
  PersistedStation,
  StationCatalogRepository,
} from "./station-catalog-repository.js";

// The official layout rarely changes (it tracks physical road works, not
// traffic), so it is refreshed on the same cadence as station metadata
// rather than on every request.
const LANE_LAYOUT_CACHE_TTL_MS = 24 * 60 * 60 * 1_000;

const SOURCE_BASE = {
  id: "fintraffic-tms",
  name: "Fintraffic Digitraffic TMS",
  attribution: "Fintraffic / Digitraffic, CC BY 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
} as const;
const SOURCE_FRESHNESS_LIMIT_MS = 3 * 60 * 1_000;

export class CoverageAreaNotFoundError extends ApplicationError {
  constructor(id: string) {
    const message = `Coverage area '${id}' was not found.`;
    super(message, {
      code: "COVERAGE_AREA_NOT_FOUND",
      kind: "NOT_FOUND",
      publicMessage: message,
    });
  }
}

function toStationIdentity(station: PersistedStation) {
  return {
    id: station.id,
    providerStationId: station.providerStationId,
    tmsNumber: station.tmsNumber,
    name: station.name,
    longitude: station.longitude,
    latitude: station.latitude,
    bearing: station.bearing,
  };
}

function toUnavailableStation(station: PersistedStation): StationSummary {
  return {
    ...toStationIdentity(station),
    freshness: "UNAVAILABLE",
    directions: [1, 2].map((direction) => {
      const profile = station.directionProfiles?.find(
        (item) => item.direction === direction,
      );
      return {
        direction: direction as 1 | 2,
        heading: normalizeDirectionHeading(station.bearing, direction as 1 | 2),
        averageSpeedKmh: null,
        flowVehiclesPerHour: null,
        measuredAt: null,
        trafficFlow: classifyTrafficFlow({
          averageSpeedKmh: null,
          flowVehiclesPerHour: null,
          freeFlowSpeedKmh: profile?.freeFlowSpeedKmh ?? null,
          maximumFlowVehiclesPerHour:
            profile?.maximumFlowVehiclesPerHour ?? null,
        }),
      };
    }),
    lanes: [],
  };
}

function toPersistedStation(
  station: PersistedStation,
  directions: PersistedDirection[],
  lanes: PersistedLane[],
  laneDirections: ResolvedLaneDirection[],
  laneLayoutDirections: ResolvedLaneDirection[],
  now: Date,
): StationSummary {
  const stationDirections = [1, 2].map((direction) => {
    const persisted = directions.find(
      (item) => item.assetId === station.id && item.direction === direction,
    );
    const profile = station.directionProfiles?.find(
      (item) => item.direction === direction,
    );

    return {
      direction: direction as 1 | 2,
      heading: normalizeDirectionHeading(station.bearing, direction as 1 | 2),
      averageSpeedKmh: persisted?.averageSpeedKmh ?? null,
      flowVehiclesPerHour: persisted?.flowVehiclesPerHour ?? null,
      measuredAt: persisted?.measuredAt ?? null,
      trafficFlow: classifyTrafficFlow({
        averageSpeedKmh: persisted?.averageSpeedKmh ?? null,
        flowVehiclesPerHour: persisted?.flowVehiclesPerHour ?? null,
        freeFlowSpeedKmh: profile?.freeFlowSpeedKmh ?? null,
        maximumFlowVehiclesPerHour: profile?.maximumFlowVehiclesPerHour ?? null,
        reportedSpeedPercent: persisted?.speedPercentOfFreeFlow ?? null,
        reportedFlowPercent: persisted?.flowPercentOfCapacity ?? null,
      }),
    };
  }) as StationSummary["directions"];
  const newestMeasurement = stationDirections
    .map((direction) => direction.measuredAt)
    .filter((value): value is string => value !== null)
    .sort()
    .at(-1);
  const stationLanes = lanes
    .filter((lane) => lane.assetId === station.id)
    .map((lane) => {
      // Real observed-passage evidence always wins; the official lane
      // layout only fills in stations that evidence has not reached yet.
      // The UI must be able to tell the two apart rather than call both
      // "geçmiş veriden" (from historical evidence).
      const observed = laneDirections.find(
        (evidence) =>
          evidence.assetId === station.id && evidence.lane === lane.lane,
      );
      const fromLayout = laneLayoutDirections.find(
        (evidence) =>
          evidence.assetId === station.id && evidence.lane === lane.lane,
      );
      const resolvedDirection = observed ?? fromLayout;
      const directionEvidence = observed
        ? ("OBSERVED_PASSAGES" as const)
        : fromLayout
          ? ("OFFICIAL_LANE_LAYOUT" as const)
          : null;
      return {
        lane: lane.lane,
        direction: resolvedDirection?.direction ?? null,
        directionEvidence,
        averageSpeedKmh: lane.averageSpeedKmh,
        flowVehiclesPerHour: lane.flowVehiclesPerHour,
        flowWindow: lane.flowWindow,
        measuredAt: lane.measuredAt,
      };
    });
  const newestLaneMeasurement = stationLanes
    .map((lane) => lane.measuredAt)
    .sort()
    .at(-1);
  const newestStationMeasurement = [newestMeasurement, newestLaneMeasurement]
    .filter((value): value is string => value !== undefined)
    .sort()
    .at(-1);

  return {
    ...toStationIdentity(station),
    freshness: classifyMeasurementFreshness(newestStationMeasurement, now),
    directions: stationDirections,
    lanes: stationLanes,
  };
}

export class StationCatalogService {
  private laneLayoutCache: Awaited<
    ReturnType<FintrafficStationLaneLayoutClient["listLayouts"]>
  > | null = null;
  private laneLayoutCacheFetchedAt = 0;

  constructor(
    private readonly repository: StationCatalogRepository,
    private readonly fintrafficClient: Pick<
      FintrafficClient,
      "getStations" | "getCurrentStationData" | "getSensorConstants"
    >,
    private readonly clock: () => Date = () => new Date(),
    private readonly observationRepository?: TrafficObservationRepository,
    private readonly laneDirectionRepository?: LaneDirectionEvidenceRepository,
    private readonly laneLayoutClient?: Pick<
      FintrafficStationLaneLayoutClient,
      "listLayouts"
    >,
  ) {}

  private async getLaneLayouts(now: Date) {
    if (!this.laneLayoutClient) return [];
    if (
      this.laneLayoutCache &&
      now.getTime() - this.laneLayoutCacheFetchedAt < LANE_LAYOUT_CACHE_TTL_MS
    ) {
      return this.laneLayoutCache;
    }
    try {
      this.laneLayoutCache = await this.laneLayoutClient.listLayouts();
      this.laneLayoutCacheFetchedAt = now.getTime();
    } catch {
      // A stale (or empty, on the very first attempt) cache is preferred
      // over failing the whole station response for this secondary source.
      this.laneLayoutCache ??= [];
    }
    return this.laneLayoutCache;
  }

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
        const assetIds = persistedStations.map((station) => station.id);
        const [directions, lanes, laneDirections, laneLayouts] =
          await Promise.all([
            this.observationRepository.listLatestDirections(assetIds),
            this.observationRepository.listLatestLanes(assetIds),
            this.laneDirectionRepository?.listResolvedDirections(assetIds) ??
              [],
            this.getLaneLayouts(fetchedAt),
          ]);
        const stationLanesForLayout: StationLanesInput[] =
          persistedStations.map((station) => ({
            assetId: station.id,
            tmsNumber: station.tmsNumber,
            lanes: lanes
              .filter((lane) => lane.assetId === station.id)
              .map((lane) => lane.lane),
          }));
        const laneLayoutDirections = resolveLaneDirectionsFromLayout(
          laneLayouts,
          stationLanesForLayout,
        );
        const sourceUpdatedAt = [...directions, ...lanes]
          .map((observation) => observation.sourceUpdatedAt)
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
            toPersistedStation(
              station,
              directions,
              lanes,
              laneDirections,
              laneLayoutDirections,
              fetchedAt,
            ),
          ),
        };
      }
    }

    try {
      const [stationCollection, dataCollection, sensorConstants] =
        await Promise.all([
          this.fintrafficClient.getStations(),
          this.fintrafficClient.getCurrentStationData(),
          this.fintrafficClient.getSensorConstants().catch(() => null),
        ]);
      const stations = normalizeStations(
        stationCollection,
        dataCollection,
        coverageArea,
        fetchedAt,
        sensorConstants,
      );

      await this.repository.upsertStations(
        coverageArea.id,
        stations,
        new Date(stationCollection.dataUpdatedTime),
        sensorConstants ? new Date(sensorConstants.dataUpdatedTime) : undefined,
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
