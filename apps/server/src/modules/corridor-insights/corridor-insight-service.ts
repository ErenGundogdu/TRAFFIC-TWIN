import type {
  CorridorCatalogResponse,
  CorridorInsightResponse,
  StationCatalogResponse,
} from "@traffic-twin/contracts";

import { ApplicationError } from "../../common/errors/application-error.js";
import type { StationCatalogService } from "../asset-catalog/station-catalog-service.js";
import type {
  RoadContextRepository,
  StoredRoadContext,
} from "../road-context/road-context-repository.js";
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
      "findMatchedByAssetIds" | "findMatchedByRoadRef"
    >,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async getCorridorCatalog(
    coverageAreaId: string,
  ): Promise<CorridorCatalogResponse> {
    const catalog =
      await this.stationCatalogService.getCoverageStations(coverageAreaId);
    const contexts = await this.roadContextRepository.findMatchedByAssetIds(
      catalog.stations.map((station) => station.id),
    );

    return createCorridorCatalog(catalog, contexts, this.clock());
  }

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

export function createCorridorCatalog(
  catalog: StationCatalogResponse,
  contexts: StoredRoadContext[],
  generatedAt: Date,
): CorridorCatalogResponse {
  const stationById = new Map(
    catalog.stations.map((station) => [station.id, station]),
  );
  const stationIdsByRoadRef = new Map<string, string[]>();

  for (const context of contexts) {
    if (context.status !== "MATCHED" || !context.roadRef) continue;
    if (!stationById.has(context.assetId)) continue;
    const stationIds = stationIdsByRoadRef.get(context.roadRef) ?? [];
    stationIds.push(context.assetId);
    stationIdsByRoadRef.set(context.roadRef, stationIds);
  }

  const collator = new Intl.Collator("fi-FI", {
    numeric: true,
    sensitivity: "base",
  });
  const corridors = [...stationIdsByRoadRef.entries()]
    .filter(([, stationIds]) => stationIds.length >= 3)
    .sort(([left], [right]) => collator.compare(left, right))
    .map(([roadRef, stationIds]) => ({
      id: `road:${roadRef}`,
      roadRef,
      stationIds: stationIds.sort(
        (left, right) =>
          (stationById.get(left)?.tmsNumber ?? 0) -
          (stationById.get(right)?.tmsNumber ?? 0),
      ),
    }));

  return {
    coverageAreaId: catalog.coverageArea.id,
    generatedAt: generatedAt.toISOString(),
    policyVersion: "verified-road-corridor-catalog-v1",
    minimumStationCount: 3,
    corridors,
    source: {
      roadNetwork: "OpenStreetMap",
      traffic: "Fintraffic TMS",
    },
  };
}
