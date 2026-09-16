import type { CoverageArea } from "@traffic-twin/contracts";
import { describe, expect, it, vi } from "vitest";

import type { StationCatalogRepository } from "../asset-catalog/station-catalog-repository.js";
import { readFixture } from "../providers/fintraffic/test-fixtures.js";
import { trafficMessageFeatureCollectionSchema } from "../providers/fintraffic/traffic-message-schemas.js";
import type { TrafficEventRepository } from "./traffic-event-repository.js";
import { TrafficEventService } from "./traffic-event-service.js";

const coverageArea: CoverageArea = {
  id: "helsinki",
  name: "Helsinki metropol bölgesi",
  timeZone: "Europe/Helsinki",
  bbox: [23, 60, 26.1, 62],
};

describe("TrafficEventService", () => {
  it("persists normalized provider events before serving the catalog", async () => {
    const announcements = trafficMessageFeatureCollectionSchema.parse(
      readFixture("traffic-announcements.sample.json"),
    );
    const roadWorks = trafficMessageFeatureCollectionSchema.parse(
      readFixture("roadworks.sample.json"),
    );
    const stationRepository = {
      findCoverageArea: vi.fn(async () => coverageArea),
    } as unknown as StationCatalogRepository;
    const eventRepository: TrafficEventRepository = {
      replaceCoverage: vi.fn(async () => undefined),
      listCoverage: vi.fn(async () => ({
        events: [],
        sourceUpdatedAt: null,
        fetchedAt: null,
      })),
    };
    const service = new TrafficEventService(
      stationRepository,
      eventRepository,
      {
        getTrafficAnnouncements: vi.fn(async () => announcements),
        getRoadWorks: vi.fn(async () => roadWorks),
      },
      () => new Date("2026-09-14T10:00:00Z"),
    );

    await expect(service.syncCoverage("helsinki")).resolves.toMatchObject({
      eventCount: 2,
      sourceUpdatedAt: "2026-09-14T07:36:51.015Z",
    });
    expect(eventRepository.replaceCoverage).toHaveBeenCalledWith(
      "helsinki",
      expect.objectContaining({
        events: expect.arrayContaining([
          expect.objectContaining({ category: "ROAD_WORK" }),
        ]),
      }),
    );
  });

  it.each([
    ["2026-09-14T09:51:00.000Z", "FRESH"],
    ["2026-09-14T09:49:59.999Z", "STALE"],
    [null, "UNAVAILABLE"],
  ] as const)(
    "reports a %s event snapshot as %s",
    async (fetchedAt, expectedFreshness) => {
      const stationRepository = {
        findCoverageArea: vi.fn(async () => coverageArea),
      } as unknown as StationCatalogRepository;
      const eventRepository: TrafficEventRepository = {
        replaceCoverage: vi.fn(async () => undefined),
        listCoverage: vi.fn(async () => ({
          events: [],
          sourceUpdatedAt: null,
          fetchedAt,
        })),
      };
      const service = new TrafficEventService(
        stationRepository,
        eventRepository,
        {
          getTrafficAnnouncements: vi.fn(),
          getRoadWorks: vi.fn(),
        },
        () => new Date("2026-09-14T10:00:00.000Z"),
        10 * 60 * 1_000,
      );

      const result = await service.getCatalog("helsinki");

      expect(result.source.freshness).toBe(expectedFreshness);
    },
  );
});
