import type { CoverageArea } from "@traffic-twin/contracts";
import { describe, expect, it, vi } from "vitest";

import type { StationCatalogRepository } from "../asset-catalog/station-catalog-repository.js";
import {
  stationDataCollectionSchema,
  stationFeatureCollectionSchema,
} from "../providers/fintraffic/schemas.js";
import { readFixture } from "../providers/fintraffic/test-fixtures.js";
import type { TrafficObservationRepository } from "../telemetry/traffic-observation-repository.js";
import { LiveTrafficPoller } from "./live-traffic-poller.js";

const coverageArea: CoverageArea = {
  id: "helsinki",
  name: "Helsinki",
  timeZone: "Europe/Helsinki",
  bbox: [24.5, 60.1, 25.25, 60.45],
};

describe("LiveTrafficPoller", () => {
  it("persists and publishes a modified batch but skips a 304", async () => {
    const metadata = stationFeatureCollectionSchema.parse(
      readFixture("stations.sample.json"),
    );
    const data = stationDataCollectionSchema.parse(
      readFixture("station-data.sample.json"),
    );
    const stationRepository: StationCatalogRepository = {
      findCoverageArea: vi.fn(async () => coverageArea),
      listStations: vi.fn(async () => []),
      upsertStations: vi.fn(async () => undefined),
    };
    const observationRepository: TrafficObservationRepository = {
      insertBatch: vi.fn(async () => 2),
      listLatestDirections: vi.fn(async () => []),
    };
    const client = {
      getStations: vi.fn(async () => metadata),
      getSensorConstants: vi.fn(async () => ({
        dataUpdatedTime: "2026-09-04T06:00:00Z",
        stations: [],
      })),
      getCurrentStationDataConditional: vi
        .fn()
        .mockResolvedValueOnce({
          status: "modified" as const,
          data,
          validators: { etag: '"v1"' },
        })
        .mockResolvedValueOnce({
          status: "not-modified" as const,
          validators: { etag: '"v1"' },
        }),
    };
    const publish = vi.fn();
    const poller = new LiveTrafficPoller(
      "helsinki",
      60_000,
      stationRepository,
      observationRepository,
      client,
      publish,
      () => new Date("2026-09-04T09:04:00Z"),
    );

    await expect(poller.runOnce()).resolves.toEqual({
      status: "updated",
      insertedObservationCount: 2,
    });
    await expect(poller.runOnce()).resolves.toEqual({
      status: "not-modified",
      insertedObservationCount: 0,
    });

    expect(client.getStations).toHaveBeenCalledTimes(1);
    expect(client.getCurrentStationDataConditional).toHaveBeenLastCalledWith({
      etag: '"v1"',
    });
    expect(observationRepository.insertBatch).toHaveBeenCalledTimes(1);
    expect(publish).toHaveBeenCalledTimes(1);
  });
});
