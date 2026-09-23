import type {
  CorridorInsightResponse,
  StationCatalogResponse,
} from "@traffic-twin/contracts";

import { ApplicationError } from "../../common/errors/application-error.js";
import type { StationCatalogService } from "../asset-catalog/station-catalog-service.js";
import type { RoadContextRepository } from "../road-context/road-context-repository.js";
import type { RoadContextService } from "../road-context/road-context-service.js";
import { analyzeCorridorDirection } from "./corridor-analysis.js";

export class CorridorInsightNotFoundError extends ApplicationError {
  constructor() {
    super("The corridor-insight station or coverage area was not found.", {
      code: "CORRIDOR_INSIGHT_SCOPE_NOT_FOUND",
      kind: "NOT_FOUND",
      publicMessage: "İstasyon veya kapsama alanı bulunamadı.",
    });
  }
}

export class CorridorInsightService {
  constructor(
    private readonly stationCatalogService: Pick<
      StationCatalogService,
      "getCoverageStations"
    >,
    private readonly roadContextService: Pick<
      RoadContextService,
      "getStationRoadContext"
    >,
    private readonly roadContextRepository: Pick<
      RoadContextRepository,
      "findMatchedByRoadRef"
    >,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async getStationCorridorInsight(
    coverageAreaId: string,
    assetId: string,
  ): Promise<CorridorInsightResponse> {
    const [catalog, roadContext] = await Promise.all([
      this.stationCatalogService.getCoverageStations(coverageAreaId),
      this.roadContextService.getStationRoadContext(coverageAreaId, assetId),
    ]);
    const selectedStation = catalog.stations.find(
      (station) => station.id === assetId,
    );
    if (!selectedStation) throw new CorridorInsightNotFoundError();

    const now = this.clock();
    const corridorStations = await this.findVerifiedCorridorStations(
      catalog,
      roadContext.status === "MATCHED" ? roadContext.roadRef : null,
    );

    return {
      assetId,
      roadRef: roadContext.roadRef,
      roadContextStatus: roadContext.status,
      roadContextFreshness: roadContext.freshness,
      generatedAt: now.toISOString(),
      policyVersion: "verified-road-live-corridor-v1",
      directions: [
        analyzeCorridorDirection(selectedStation, 1, corridorStations, now),
        analyzeCorridorDirection(selectedStation, 2, corridorStations, now),
      ],
      source: {
        roadNetwork: "OpenStreetMap",
        traffic: "Fintraffic TMS",
      },
    };
  }

  private async findVerifiedCorridorStations(
    catalog: StationCatalogResponse,
    roadRef: string | null,
  ) {
    if (!roadRef) return [];
    const verifiedIds = new Set(
      (await this.roadContextRepository.findMatchedByRoadRef(roadRef)).map(
        (context) => context.assetId,
      ),
    );
    return catalog.stations.filter((station) => verifiedIds.has(station.id));
  }
}
