import type { StationTrafficEventContextResponse } from "@traffic-twin/contracts";

import type { StationCatalogRepository } from "../asset-catalog/station-catalog-repository.js";
import { inferFintrafficRoadRef } from "../junctions/junction-matching.js";
import {
  matchTrafficEventContext,
  TRAFFIC_EVENT_CONTEXT_POLICY,
} from "./traffic-event-context-matching.js";
import type { TrafficEventContextRepository } from "./traffic-event-context-repository.js";

export class TrafficEventContextNotFoundError extends Error {}

export class TrafficEventContextService {
  constructor(
    private readonly stationRepository: StationCatalogRepository,
    private readonly contextRepository: TrafficEventContextRepository,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async getStationContext(
    coverageAreaId: string,
    stationAssetId: string,
  ): Promise<StationTrafficEventContextResponse> {
    const coverageArea =
      await this.stationRepository.findCoverageArea(coverageAreaId);
    if (!coverageArea) throw new TrafficEventContextNotFoundError();

    const station = (
      await this.stationRepository.listStations(coverageAreaId)
    ).find((item) => item.id === stationAssetId);
    if (!station) throw new TrafficEventContextNotFoundError();

    const stationRoadRef = inferFintrafficRoadRef(station.name);
    const candidates = await this.contextRepository.findCandidates({
      coverageAreaId,
      stationAssetId,
      maximumDistanceMeters:
        TRAFFIC_EVENT_CONTEXT_POLICY.sameRoadMaxDistanceMeters,
    });

    return {
      station: { assetId: stationAssetId, roadRef: stationRoadRef },
      evaluatedAt: this.clock().toISOString(),
      policy: TRAFFIC_EVENT_CONTEXT_POLICY,
      matches: matchTrafficEventContext(candidates, stationRoadRef),
    };
  }
}
