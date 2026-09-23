import { unlink } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";

import {
  formatDateInTimeZone,
  resolveHistoryResolutions,
  type HistoryResolutionPolicy,
} from "../ingestion/history-resolution-policy.js";
import type { RawArchiveRepository } from "./raw-archive-repository.js";

const DAY_MS = 86_400_000;
const DEFAULT_BATCH_SIZE = 100;

type PurgeCandidate = Awaited<
  ReturnType<RawArchiveRepository["listPurgeCandidates"]>
>[number];

export class RawArchiveRetentionService {
  private readonly archiveRoot: string;

  constructor(
    private readonly repository: Pick<
      RawArchiveRepository,
      "listPurgeCandidates" | "listCoverage" | "markPurged" | "markMissing"
    >,
    archiveRoot: string,
    private readonly resolutionPolicy: HistoryResolutionPolicy,
    private readonly requiredProcessorVersion: string,
    private readonly removeFile: (path: string) => Promise<void> = unlink,
  ) {
    this.archiveRoot = resolve(archiveRoot);
  }

  async run(
    retentionDays: number,
    now = new Date(),
    batchSize = DEFAULT_BATCH_SIZE,
  ) {
    const cutoff = new Date(now.getTime() - retentionDays * DAY_MS);
    const candidates = await this.repository.listPurgeCandidates(
      cutoff,
      batchSize,
    );
    const result = {
      cutoff: cutoff.toISOString(),
      candidateCount: candidates.length,
      purgedFileCount: 0,
      purgedByteCount: 0,
      missingFileCount: 0,
      skippedUnsafePathCount: 0,
      skippedIncompleteCoverageCount: 0,
      skippedOutdatedProcessorCount: 0,
      failedFileCount: 0,
    };

    for (const candidate of candidates) {
      if (candidate.processorVersion !== this.requiredProcessorVersion) {
        result.skippedOutdatedProcessorCount += 1;
        continue;
      }
      if (!(await this.hasRequiredCoverage(candidate, now))) {
        result.skippedIncompleteCoverageCount += 1;
        continue;
      }

      const storagePath = resolve(candidate.storagePath);
      if (!isPathInside(this.archiveRoot, storagePath)) {
        result.skippedUnsafePathCount += 1;
        continue;
      }

      try {
        await this.removeFile(storagePath);
        await this.repository.markPurged(candidate.id, now);
        result.purgedFileCount += 1;
        result.purgedByteCount += candidate.byteSize;
      } catch (error) {
        if (isMissingFileError(error)) {
          await this.repository.markMissing(candidate.id, now);
          result.missingFileCount += 1;
          continue;
        }
        result.failedFileCount += 1;
      }
    }

    return result;
  }

  private async hasRequiredCoverage(candidate: PurgeCandidate, now: Date) {
    if (candidate.validRecordCount === 0) return true;

    const currentLocalDate = formatDateInTimeZone(now, candidate.timeZone);
    const requiredResolutions = resolveHistoryResolutions(
      candidate.sourceDate,
      currentLocalDate,
      this.resolutionPolicy,
    );
    if (requiredResolutions.length === 0) return true;

    const coverage = await this.repository.listCoverage(candidate.id);
    const available = new Set(
      coverage
        .filter((item) => item.status === "AVAILABLE")
        .map((item) => item.resolution),
    );
    return requiredResolutions.every((resolution) => available.has(resolution));
  }
}

function isPathInside(root: string, candidate: string) {
  const pathFromRoot = relative(root, candidate);
  return (
    pathFromRoot !== "" &&
    pathFromRoot !== ".." &&
    !pathFromRoot.startsWith(
      `..${process.platform === "win32" ? "\\" : "/"}`,
    ) &&
    !isAbsolute(pathFromRoot)
  );
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}
