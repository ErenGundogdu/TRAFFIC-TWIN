import type {
  CoverageArea,
  TrafficEvent,
  TrafficEventCategory,
  TrafficEventDirection,
  TrafficEventGeometry,
  TrafficEventSeverity,
  TrafficEventStatus,
} from "@traffic-twin/contracts";

import type { FintrafficTrafficMessageCollection } from "./traffic-message-schemas.js";

interface EventCollection {
  category: TrafficEventCategory;
  collection: FintrafficTrafficMessageCollection;
}

function collectPositions(value: unknown): Array<[number, number]> {
  if (!Array.isArray(value)) return [];
  if (
    value.length >= 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number"
  ) {
    return [[value[0], value[1]]];
  }
  return value.flatMap(collectPositions);
}

function intersectsCoverage(
  geometry: TrafficEventGeometry,
  [minLongitude, minLatitude, maxLongitude, maxLatitude]: CoverageArea["bbox"],
) {
  const positions = collectPositions(geometry.coordinates);
  if (positions.length === 0) return false;

  const longitudes = positions.map(([longitude]) => longitude);
  const latitudes = positions.map(([, latitude]) => latitude);
  return (
    Math.min(...longitudes) <= maxLongitude &&
    Math.max(...longitudes) >= minLongitude &&
    Math.min(...latitudes) <= maxLatitude &&
    Math.max(...latitudes) >= minLatitude
  );
}

function normalizeSeverity(values: string[]): TrafficEventSeverity {
  const normalized = values.map((value) => value.toLowerCase());
  if (normalized.some((value) => value === "high" || value === "highest")) {
    return "HIGH";
  }
  if (normalized.includes("medium")) return "MEDIUM";
  if (normalized.includes("low")) return "LOW";
  return "UNKNOWN";
}

function resolveStatus(
  announcementType: string | null | undefined,
  startsAt: string | null,
  endsAt: string | null,
  now: Date,
): TrafficEventStatus {
  if (announcementType?.toLowerCase() === "ended") return "ENDED";
  if (endsAt && new Date(endsAt).getTime() <= now.getTime()) return "ENDED";
  if (startsAt && new Date(startsAt).getTime() > now.getTime()) {
    return "UPCOMING";
  }
  return "ACTIVE";
}

function cleanOptionalText(value: string | undefined) {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
}

function normalizeDirection(value: string | undefined): TrafficEventDirection {
  switch (value?.toLowerCase()) {
    case "both":
      return "BOTH";
    case "pos":
      return "POSITIVE";
    case "neg":
      return "NEGATIVE";
    default:
      return "UNKNOWN";
  }
}

export function normalizeTrafficEvents(
  collections: EventCollection[],
  coverageArea: CoverageArea,
  now: Date,
) {
  const events = new Map<string, TrafficEvent>();

  for (const { category, collection } of collections) {
    for (const feature of collection.features) {
      if (
        !feature.geometry ||
        !intersectsCoverage(feature.geometry, coverageArea.bbox)
      ) {
        continue;
      }

      const announcement =
        feature.properties.announcements.find(
          (candidate) => candidate.language === "fi",
        ) ?? feature.properties.announcements[0];
      if (!announcement) continue;

      const phaseStarts = announcement.roadWorkPhases.flatMap((phase) =>
        phase.timeAndDuration?.startTime
          ? [phase.timeAndDuration.startTime]
          : [],
      );
      const phaseEnds = announcement.roadWorkPhases.flatMap((phase) =>
        phase.timeAndDuration?.endTime ? [phase.timeAndDuration.endTime] : [],
      );
      const startsAt =
        announcement.timeAndDuration?.startTime ??
        phaseStarts.sort()[0] ??
        null;
      const endsAt =
        announcement.timeAndDuration?.endTime ??
        phaseEnds.sort().at(-1) ??
        null;
      const roadAddress = announcement.locationDetails?.roadAddressLocation;
      const roadNumbers = [
        roadAddress?.primaryPoint?.roadAddress?.road,
        roadAddress?.secondaryPoint?.roadAddress?.road,
      ].filter((value): value is number => value !== undefined);
      const providerEventId = feature.properties.situationId;

      events.set(providerEventId, {
        id: `fintraffic-traffic-message:${providerEventId}`,
        providerEventId,
        category,
        status: resolveStatus(
          feature.properties.trafficAnnouncementType,
          startsAt,
          endsAt,
          now,
        ),
        severity: normalizeSeverity(
          announcement.roadWorkPhases.flatMap((phase) =>
            phase.severity ? [phase.severity] : [],
          ),
        ),
        title: announcement.title.trim(),
        description: cleanOptionalText(announcement.location?.description),
        comment: cleanOptionalText(announcement.comment),
        effects: [
          ...new Set(announcement.features.map((item) => item.name.trim())),
        ],
        direction: normalizeDirection(roadAddress?.direction),
        directionDescription: cleanOptionalText(
          roadAddress?.directionDescription,
        ),
        sender: cleanOptionalText(announcement.sender),
        language: announcement.language,
        geometry: feature.geometry,
        roadNumbers: [...new Set(roadNumbers)],
        releaseTime: feature.properties.releaseTime,
        versionTime: feature.properties.versionTime,
        startsAt,
        endsAt,
      });
    }
  }

  return {
    events: [...events.values()].sort((left, right) =>
      right.versionTime.localeCompare(left.versionTime),
    ),
    sourceUpdatedAt:
      collections
        .map(({ collection }) => collection.dataUpdatedTime)
        .sort()
        .at(-1) ?? null,
  };
}
