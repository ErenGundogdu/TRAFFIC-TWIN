import { createReadStream } from "node:fs";
import { createGunzip } from "node:zlib";

import { z } from "zod";

import type { StationCatalogRepository } from "../asset-catalog/station-catalog-repository.js";
import type { FintrafficHistoryClient } from "../providers/fintraffic/history-client.js";
import { parseFintrafficHistory } from "../providers/fintraffic/parse-history.js";
import type { HistoryImportRepository } from "./history-import-repository.js";
import { FINTRAFFIC_HISTORY_PROCESSOR_VERSION } from "./history-processor-version.js";
import {
  formatDateInTimeZone,
  resolveHistoryResolutions,
  type HistoryResolutionPolicy,
} from "./history-resolution-policy.js";

const importInputSchema = z.object({
  coverageAreaId: z.string().min(1),
  tmsNumber: z.number().int().positive(),
  sourceDate: z.iso.date(),
});

export class HistoryImportService {
  constructor(
    private readonly stationRepository: StationCatalogRepository,
    private readonly importRepository: HistoryImportRepository,
    private readonly historyClient: FintrafficHistoryClient,
    private readonly archiveRoot: string,
    private readonly resolutionPolicy: HistoryResolutionPolicy = {
      minuteRetentionDays: 7,
      hourRetentionDays: 730,
      dayRetentionDays: 1_825,
    },
    private readonly now: () => Date = () => new Date(),
  ) {}

  async importDay(input: z.input<typeof importInputSchema>) {
    const command = importInputSchema.parse(input);
    const station = (
      await this.stationRepository.listStations(command.coverageAreaId)
    ).find((item) => item.tmsNumber === command.tmsNumber);

    if (!station) {
      throw new Error(
        `TMS ${command.tmsNumber} is not registered in coverage area '${command.coverageAreaId}'.`,
      );
    }

    const coverageArea = await this.stationRepository.findCoverageArea(
      command.coverageAreaId,
    );
    if (!coverageArea) {
      throw new Error(
        `Coverage area '${command.coverageAreaId}' was not found.`,
      );
    }
    const resolutions = resolveHistoryResolutions(
      command.sourceDate,
      formatDateInTimeZone(this.now(), coverageArea.timeZone),
      this.resolutionPolicy,
    );
    if (resolutions.length === 0) {
      throw new Error(
        `Source date '${command.sourceDate}' is outside the configured history retention window.`,
      );
    }

    const artifactId = `fintraffic-tms:${command.tmsNumber}:${command.sourceDate}:${FINTRAFFIC_HISTORY_PROCESSOR_VERSION}`;
    const downloaded = await this.historyClient.downloadDay(
      command.tmsNumber,
      command.sourceDate,
      this.archiveRoot,
    );
    const existing = await this.importRepository.findArtifact(artifactId);
    const existingCoverage = existing
      ? await this.importRepository.listCoverageForArtifact(artifactId)
      : [];

    if (
      existing?.status === "PROCESSED" &&
      existing.checksumSha256 === downloaded.checksumSha256 &&
      existing.processorVersion === FINTRAFFIC_HISTORY_PROCESSOR_VERSION &&
      resolutions.every((resolution) =>
        existingCoverage.some(
          (coverage) =>
            coverage.resolution === resolution &&
            coverage.status === "AVAILABLE",
        ),
      )
    ) {
      if (
        existing.rawFileStatus !== "RETAINED" ||
        existing.storagePath !== downloaded.storagePath
      ) {
        await this.importRepository.restoreRetainedRawFile({
          id: artifactId,
          provider: "fintraffic-tms",
          assetId: station.id,
          sourceDate: command.sourceDate,
          processorVersion: FINTRAFFIC_HISTORY_PROCESSOR_VERSION,
          ...downloaded,
        });
      }
      return {
        status: "unchanged" as const,
        artifactId,
        recordCount: existing.recordCount,
        validRecordCount: existing.validRecordCount,
      };
    }

    await this.importRepository.recordDownloaded({
      id: artifactId,
      provider: "fintraffic-tms",
      assetId: station.id,
      sourceDate: command.sourceDate,
      processorVersion: FINTRAFFIC_HISTORY_PROCESSOR_VERSION,
      ...downloaded,
    });

    try {
      const parsed = await parseFintrafficHistory(
        createReadStream(downloaded.storagePath).pipe(createGunzip()),
        resolutions,
      );
      await this.importRepository.replaceWithProcessed(
        artifactId,
        station.id,
        command.sourceDate,
        parsed.aggregates,
        parsed.recordCount,
        parsed.validRecordCount,
      );

      return {
        status: "processed" as const,
        artifactId,
        recordCount: parsed.recordCount,
        validRecordCount: parsed.validRecordCount,
        aggregateCount: parsed.aggregates.length,
        resolutions,
      };
    } catch (error) {
      await this.importRepository.markFailed(artifactId, error);
      throw error;
    }
  }
}
