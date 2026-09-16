import {
  createFieldReportSchema,
  type CreateFieldReport,
} from "@traffic-twin/contracts";

import type { StationCatalogRepository } from "../asset-catalog/station-catalog-repository.js";
import type { FieldReportRepository } from "./field-report-repository.js";

export class FieldReportCoverageNotFoundError extends Error {}
export class FieldReportOutsideCoverageError extends Error {}

export class FieldReportService {
  constructor(
    private readonly stationRepository: StationCatalogRepository,
    private readonly reportRepository: FieldReportRepository,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async create(input: CreateFieldReport) {
    const command = createFieldReportSchema.parse(input);
    const coverageArea = await this.stationRepository.findCoverageArea(
      command.coverageAreaId,
    );
    if (!coverageArea) {
      throw new FieldReportCoverageNotFoundError(command.coverageAreaId);
    }
    if (!isLocationWithinBbox(command.location, coverageArea.bbox)) {
      throw new FieldReportOutsideCoverageError(command.coverageAreaId);
    }

    return this.reportRepository.create(command, this.clock());
  }

  async listCoverage(coverageAreaId: string) {
    const coverageArea =
      await this.stationRepository.findCoverageArea(coverageAreaId);
    if (!coverageArea) {
      throw new FieldReportCoverageNotFoundError(coverageAreaId);
    }
    return this.reportRepository.listCoverage(coverageAreaId);
  }
}

function isLocationWithinBbox(
  location: { longitude: number; latitude: number },
  bbox: [number, number, number, number],
) {
  const [minLongitude, minLatitude, maxLongitude, maxLatitude] = bbox;
  return (
    location.longitude >= minLongitude &&
    location.longitude <= maxLongitude &&
    location.latitude >= minLatitude &&
    location.latitude <= maxLatitude
  );
}
