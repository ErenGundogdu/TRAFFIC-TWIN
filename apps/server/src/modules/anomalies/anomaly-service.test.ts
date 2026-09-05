import type { CoverageArea } from "@traffic-twin/contracts";
import { describe, expect, it, vi } from "vitest";

import type { StationCatalogRepository } from "../asset-catalog/station-catalog-repository.js";
import type { TrafficObservationRepository } from "../telemetry/traffic-observation-repository.js";
import type { AnomalyRepository } from "./anomaly-repository.js";
import { AnomalyService } from "./anomaly-service.js";

const coverageArea: CoverageArea = {
  id: "helsinki",
  name: "Helsinki",
  timeZone: "Europe/Helsinki",
  bbox: [24.5, 60.1, 25.25, 60.45],
};

function createDependencies() {
  const stationRepository: StationCatalogRepository = {
    findCoverageArea: vi.fn(async () => coverageArea),
    listStations: vi.fn(async () => [
      {
        id: "fintraffic-tms:20002",
        providerStationId: 20002,
        tmsNumber: 20002,
        name: "vt1_Espoo_Hirvisuo",
        longitude: 24.63,
        latitude: 60.22,
        bearing: 298,
      },
    ]),
    upsertStations: vi.fn(async () => undefined),
  };
  const observationRepository: TrafficObservationRepository = {
    insertBatch: vi.fn(async () => 0),
    listLatestDirections: vi.fn(async () => [
      {
        assetId: "fintraffic-tms:20002",
        direction: 1 as const,
        measuredAt: "2026-09-05T09:05:00.000Z",
        averageSpeedKmh: 30,
        flowVehiclesPerHour: null,
        sourceUpdatedAt: "2026-09-05T09:05:30.000Z",
      },
    ]),
  };
  const anomalyRepository: AnomalyRepository = {
    listHourlyBaseline: vi.fn(async () =>
      [78, 80, 79, 81, 80, 82].map((averageSpeedKmh, index) => ({
        assetId: "fintraffic-tms:20002",
        direction: 1 as const,
        timestamp: new Date(Date.UTC(2026, 7, 29 - index * 7, 9)).toISOString(),
        averageSpeedKmh,
        flowVehiclesPerHour: 900,
      })),
    ),
    listPrevious: vi.fn(async () => []),
    save: vi.fn(async () => undefined),
    listLatestCoverage: vi.fn(async () => []),
  };

  return { stationRepository, observationRepository, anomalyRepository };
}

describe("AnomalyService", () => {
  it("uses the same local weekday/hour baseline and persists an explainable candidate", async () => {
    const dependencies = createDependencies();
    const service = new AnomalyService(
      dependencies.stationRepository,
      dependencies.observationRepository,
      dependencies.anomalyRepository,
    );

    await expect(service.evaluateCoverage("helsinki")).resolves.toEqual({
      evaluatedCount: 1,
      skippedCount: 0,
    });
    expect(
      dependencies.anomalyRepository.listHourlyBaseline,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        timeZone: "Europe/Helsinki",
        localWeekday: 6,
        localHour: 12,
      }),
    );
    expect(dependencies.anomalyRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({
        status: "CANDIDATE",
        sampleCount: 6,
        baselineWindowWeeks: 12,
        minimumSamples: 6,
        baselineSamples: expect.any(Array),
      }),
    ]);
  });

  it("does not count the same source observation twice", async () => {
    const dependencies = createDependencies();
    vi.mocked(dependencies.anomalyRepository.listPrevious).mockResolvedValue([
      {
        assetId: "fintraffic-tms:20002",
        direction: 1,
        metric: "average-speed-kmh",
        status: "CANDIDATE",
        observedAt: "2026-09-05T09:05:00.000Z",
        consecutiveDeviations: 1,
        policyVersion: "rolling-weekly-median-mad-v1",
      },
    ]);
    const service = new AnomalyService(
      dependencies.stationRepository,
      dependencies.observationRepository,
      dependencies.anomalyRepository,
    );

    await expect(service.evaluateCoverage("helsinki")).resolves.toEqual({
      evaluatedCount: 0,
      skippedCount: 1,
    });
    expect(dependencies.anomalyRepository.save).toHaveBeenCalledWith([]);
  });
});
