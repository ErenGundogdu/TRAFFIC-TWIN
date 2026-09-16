import type { TrafficEventCatalogResponse } from "@traffic-twin/contracts";

import type { StationCatalogRepository } from "../asset-catalog/station-catalog-repository.js";
import { CoverageAreaNotFoundError } from "../asset-catalog/station-catalog-service.js";
import { normalizeTrafficEvents } from "../providers/fintraffic/normalize-traffic-events.js";
import type { FintrafficTrafficMessageClient } from "../providers/fintraffic/traffic-message-client.js";
import type { TrafficEventRepository } from "./traffic-event-repository.js";

const FINTRAFFIC_TRAFFIC_MESSAGE_SOURCE = {
  id: "fintraffic-traffic-message",
  name: "Fintraffic Digitraffic Traffic Messages",
  attribution: "Fintraffic / Digitraffic, CC BY 4.0",
  licenseUrl: "https://www.digitraffic.fi/en/terms-of-service/",
} as const;

const DEFAULT_FRESHNESS_THRESHOLD_MS = 10 * 60 * 1_000;

export class TrafficEventService {
  constructor(
    private readonly stationRepository: StationCatalogRepository,
    private readonly eventRepository: TrafficEventRepository,
    private readonly client: Pick<
      FintrafficTrafficMessageClient,
      "getTrafficAnnouncements" | "getRoadWorks"
    >,
    private readonly clock: () => Date = () => new Date(),
    private readonly freshnessThresholdMs = DEFAULT_FRESHNESS_THRESHOLD_MS,
  ) {}

  async syncCoverage(coverageAreaId: string) {
    const coverageArea =
      await this.stationRepository.findCoverageArea(coverageAreaId);
    if (!coverageArea) throw new CoverageAreaNotFoundError(coverageAreaId);

    const [trafficAnnouncements, roadWorks] = await Promise.all([
      this.client.getTrafficAnnouncements(),
      this.client.getRoadWorks(),
    ]);
    const fetchedAt = this.clock();
    const normalized = normalizeTrafficEvents(
      [
        {
          category: "TRAFFIC_ANNOUNCEMENT",
          collection: trafficAnnouncements,
        },
        { category: "ROAD_WORK", collection: roadWorks },
      ],
      coverageArea,
      fetchedAt,
    );

    await this.eventRepository.replaceCoverage(coverageAreaId, {
      ...normalized,
      fetchedAt: fetchedAt.toISOString(),
    });

    return {
      coverageAreaId,
      eventCount: normalized.events.length,
      sourceUpdatedAt: normalized.sourceUpdatedAt,
      fetchedAt: fetchedAt.toISOString(),
    };
  }

  async getCatalog(
    coverageAreaId: string,
  ): Promise<TrafficEventCatalogResponse> {
    const coverageArea =
      await this.stationRepository.findCoverageArea(coverageAreaId);
    if (!coverageArea) throw new CoverageAreaNotFoundError(coverageAreaId);

    const result = await this.eventRepository.listCoverage(coverageAreaId);
    const { events, ...sourceTimes } = result;
    return {
      coverageArea,
      source: {
        ...FINTRAFFIC_TRAFFIC_MESSAGE_SOURCE,
        ...sourceTimes,
        freshness: getTrafficEventFreshness(
          sourceTimes.fetchedAt,
          this.clock(),
          this.freshnessThresholdMs,
        ),
      },
      events,
    };
  }
}

function getTrafficEventFreshness(
  fetchedAt: string | null,
  now: Date,
  thresholdMs: number,
): "FRESH" | "STALE" | "UNAVAILABLE" {
  if (!fetchedAt) return "UNAVAILABLE";

  return now.getTime() - new Date(fetchedAt).getTime() <= thresholdMs
    ? "FRESH"
    : "STALE";
}
