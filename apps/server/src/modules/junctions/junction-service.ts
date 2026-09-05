import type { JunctionCatalogResponse } from "@traffic-twin/contracts";

import type { StationCatalogRepository } from "../asset-catalog/station-catalog-repository.js";
import { CoverageAreaNotFoundError } from "../asset-catalog/station-catalog-service.js";
import type { OpenStreetMapClient } from "../providers/openstreetmap/client.js";
import { deriveJunctions } from "./junction-matching.js";
import type { JunctionCatalogRepository } from "./junction-repository.js";

const OSM_SOURCE = {
  id: "openstreetmap",
  name: "OpenStreetMap",
  attribution: "© OpenStreetMap katkıcıları, ODbL",
  licenseUrl: "https://www.openstreetmap.org/copyright",
} as const;

export class JunctionService {
  constructor(
    private readonly stationRepository: StationCatalogRepository,
    private readonly junctionRepository: JunctionCatalogRepository,
    private readonly osmClient: Pick<OpenStreetMapClient, "getJunctions">,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async sync(coverageAreaId: string) {
    const coverageArea =
      await this.stationRepository.findCoverageArea(coverageAreaId);
    if (!coverageArea) throw new CoverageAreaNotFoundError(coverageAreaId);

    const stations = await this.stationRepository.listStations(coverageAreaId);
    const candidates = await this.osmClient.getJunctions(coverageArea);
    const fetchedAt = this.clock();
    const junctions = deriveJunctions(
      coverageAreaId,
      candidates,
      stations,
      fetchedAt,
    );
    await this.junctionRepository.replaceCoverage(coverageAreaId, junctions);

    return {
      coverageAreaId,
      candidateCount: candidates.length,
      junctionCount: junctions.length,
      matchCount: junctions.reduce(
        (total, junction) => total + junction.matches.length,
        0,
      ),
      fetchedAt: fetchedAt.toISOString(),
    };
  }

  async getCatalog(coverageAreaId: string): Promise<JunctionCatalogResponse> {
    const coverageArea =
      await this.stationRepository.findCoverageArea(coverageAreaId);
    if (!coverageArea) throw new CoverageAreaNotFoundError(coverageAreaId);

    const result = await this.junctionRepository.listCoverage(coverageAreaId);
    return {
      coverageArea,
      source: { ...OSM_SOURCE, fetchedAt: result.fetchedAt },
      junctions: result.junctions,
    };
  }
}
