import type { CreateFieldReport, FieldReport } from "@traffic-twin/contracts";
import { describe, expect, it, vi } from "vitest";

import type { StationCatalogRepository } from "../asset-catalog/station-catalog-repository.js";
import type { FieldReportRepository } from "./field-report-repository.js";
import {
  FieldReportOutsideCoverageError,
  FieldReportService,
} from "./field-report-service.js";

const coverageArea = {
  id: "helsinki",
  name: "Helsinki",
  timeZone: "Europe/Helsinki",
  bbox: [24.5, 60.1, 25.25, 60.45] as [number, number, number, number],
};

const command: CreateFieldReport = {
  coverageAreaId: "helsinki",
  author: "Eren",
  category: "ACCIDENT",
  severity: "HIGH",
  description: "Sağ şerit kapalı.",
  location: { longitude: 24.94, latitude: 60.17 },
};

describe("FieldReportService", () => {
  it("assigns the server clock after validating the coverage", async () => {
    const created: FieldReport = {
      ...command,
      id: "087b305a-829a-48fa-a94a-3394d59ca68a",
      source: "OPERATOR",
      status: "PENDING_REVIEW",
      observedAt: "2026-09-15T08:00:00.000Z",
      createdAt: "2026-09-15T08:00:00.000Z",
    };
    const repository = {
      create: vi.fn().mockResolvedValue(created),
      listCoverage: vi.fn(),
    } satisfies FieldReportRepository;
    const service = new FieldReportService(
      {
        findCoverageArea: vi.fn().mockResolvedValue(coverageArea),
      } as unknown as StationCatalogRepository,
      repository,
      () => new Date("2026-09-15T08:00:00.000Z"),
    );

    await expect(service.create(command)).resolves.toEqual(created);
    expect(repository.create).toHaveBeenCalledWith(
      command,
      new Date("2026-09-15T08:00:00.000Z"),
    );
  });

  it("rejects a location outside the selected coverage", async () => {
    const service = new FieldReportService(
      {
        findCoverageArea: vi.fn().mockResolvedValue(coverageArea),
      } as unknown as StationCatalogRepository,
      { create: vi.fn(), listCoverage: vi.fn() },
    );

    await expect(
      service.create({
        ...command,
        location: { longitude: 30, latitude: 65 },
      }),
    ).rejects.toBeInstanceOf(FieldReportOutsideCoverageError);
  });
});
