import { createReadStream } from "node:fs";
import { createGunzip } from "node:zlib";

import { z } from "zod";

import type { StationCatalogRepository } from "../asset-catalog/station-catalog-repository.js";
import type { FintrafficHistoryClient } from "../providers/fintraffic/history-client.js";
import { parseFintrafficHistory } from "../providers/fintraffic/parse-history.js";
import type { HistoryImportRepository } from "./history-import-repository.js";

const PROCESSOR_VERSION = "fintraffic-raw-v1";
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

    const artifactId = `fintraffic-tms:${command.tmsNumber}:${command.sourceDate}:${PROCESSOR_VERSION}`;
    const downloaded = await this.historyClient.downloadDay(
      command.tmsNumber,
      command.sourceDate,
      this.archiveRoot,
    );
    const existing = await this.importRepository.findArtifact(artifactId);

    if (
      existing?.status === "PROCESSED" &&
      existing.checksumSha256 === downloaded.checksumSha256 &&
      existing.processorVersion === PROCESSOR_VERSION
    ) {
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
      processorVersion: PROCESSOR_VERSION,
      ...downloaded,
    });

    try {
      const parsed = await parseFintrafficHistory(
        createReadStream(downloaded.storagePath).pipe(createGunzip()),
      );
      await this.importRepository.replaceWithProcessed(
        artifactId,
        station.id,
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
      };
    } catch (error) {
      await this.importRepository.markFailed(artifactId, error);
      throw error;
    }
  }
}
