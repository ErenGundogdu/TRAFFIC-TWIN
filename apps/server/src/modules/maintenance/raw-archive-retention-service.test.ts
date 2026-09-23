import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { RawArchiveRetentionService } from "./raw-archive-retention-service.js";

const policy = {
  minuteRetentionDays: 7,
  hourRetentionDays: 730,
  dayRetentionDays: 1_825,
};

describe("RawArchiveRetentionService", () => {
  const temporaryDirectories: string[] = [];

  afterEach(async () => {
    await Promise.all(
      temporaryDirectories.map((directory) =>
        rm(directory, { recursive: true, force: true }),
      ),
    );
  });

  it("purges only a processed file with complete retained coverage", async () => {
    const archiveRoot = await mkdtemp(join(tmpdir(), "traffic-twin-raw-"));
    temporaryDirectories.push(archiveRoot);
    const storagePath = join(archiveRoot, "fintraffic-tms", "20002.csv.gz");
    await mkdir(join(archiveRoot, "fintraffic-tms"), { recursive: true });
    await writeFile(storagePath, "fixture", { flag: "wx" });
    const markPurged = vi.fn(async () => true);
    const service = new RawArchiveRetentionService(
      {
        listPurgeCandidates: vi.fn(async () => [
          {
            id: "artifact-1",
            sourceDate: "2026-01-01",
            storagePath,
            byteSize: 7,
            validRecordCount: 100,
            processorVersion: "fintraffic-raw-v2",
            timeZone: "Europe/Helsinki",
          },
        ]),
        listCoverage: vi.fn(async () => [
          { resolution: "hour" as const, status: "AVAILABLE" as const },
          { resolution: "day" as const, status: "AVAILABLE" as const },
        ]),
        markPurged,
        markMissing: vi.fn(),
      },
      archiveRoot,
      policy,
      "fintraffic-raw-v2",
    );

    const result = await service.run(14, new Date("2026-09-20T12:00:00Z"));

    expect(result).toMatchObject({
      purgedFileCount: 1,
      purgedByteCount: 7,
      failedFileCount: 0,
    });
    await expect(access(storagePath)).rejects.toMatchObject({ code: "ENOENT" });
    expect(markPurged).toHaveBeenCalledWith(
      "artifact-1",
      new Date("2026-09-20T12:00:00Z"),
    );
  });

  it("does not touch unsafe paths or files with incomplete coverage", async () => {
    const archiveRoot = await mkdtemp(join(tmpdir(), "traffic-twin-raw-"));
    temporaryDirectories.push(archiveRoot);
    const removeFile = vi.fn(async () => undefined);
    const service = new RawArchiveRetentionService(
      {
        listPurgeCandidates: vi.fn(async () => [
          {
            id: "unsafe",
            sourceDate: "2026-01-01",
            storagePath: join(archiveRoot, "..", "outside.csv.gz"),
            byteSize: 7,
            validRecordCount: 100,
            processorVersion: "fintraffic-raw-v2",
            timeZone: "Europe/Helsinki",
          },
          {
            id: "incomplete",
            sourceDate: "2026-01-01",
            storagePath: join(archiveRoot, "incomplete.csv.gz"),
            byteSize: 7,
            validRecordCount: 100,
            processorVersion: "fintraffic-raw-v2",
            timeZone: "Europe/Helsinki",
          },
          {
            id: "outdated",
            sourceDate: "2026-01-01",
            storagePath: join(archiveRoot, "outdated.csv.gz"),
            byteSize: 7,
            validRecordCount: 100,
            processorVersion: "fintraffic-raw-v1",
            timeZone: "Europe/Helsinki",
          },
        ]),
        listCoverage: vi.fn(async (artifactId) =>
          artifactId === "unsafe"
            ? [
                { resolution: "hour" as const, status: "AVAILABLE" as const },
                { resolution: "day" as const, status: "AVAILABLE" as const },
              ]
            : [{ resolution: "day" as const, status: "AVAILABLE" as const }],
        ),
        markPurged: vi.fn(),
        markMissing: vi.fn(),
      },
      archiveRoot,
      policy,
      "fintraffic-raw-v2",
      removeFile,
    );

    const result = await service.run(14, new Date("2026-09-20T12:00:00Z"));

    expect(result.skippedUnsafePathCount).toBe(1);
    expect(result.skippedIncompleteCoverageCount).toBe(1);
    expect(result.skippedOutdatedProcessorCount).toBe(1);
    expect(removeFile).not.toHaveBeenCalled();
  });

  it("records an unexpectedly absent file without reporting it as purged", async () => {
    const archiveRoot = await mkdtemp(join(tmpdir(), "traffic-twin-raw-"));
    temporaryDirectories.push(archiveRoot);
    const markMissing = vi.fn(async () => true);
    const service = new RawArchiveRetentionService(
      {
        listPurgeCandidates: vi.fn(async () => [
          {
            id: "missing",
            sourceDate: "2020-01-01",
            storagePath: join(archiveRoot, "missing.csv.gz"),
            byteSize: 7,
            validRecordCount: 0,
            processorVersion: "fintraffic-raw-v2",
            timeZone: "Europe/Helsinki",
          },
        ]),
        listCoverage: vi.fn(),
        markPurged: vi.fn(),
        markMissing,
      },
      archiveRoot,
      policy,
      "fintraffic-raw-v2",
    );

    const result = await service.run(14, new Date("2026-09-20T12:00:00Z"));

    expect(result).toMatchObject({
      missingFileCount: 1,
      purgedFileCount: 0,
      failedFileCount: 0,
    });
    expect(markMissing).toHaveBeenCalledOnce();
  });
});
