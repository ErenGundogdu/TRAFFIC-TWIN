import type { OverpassJunctionResponse } from "./schemas.js";

export interface OsmJunctionCandidate {
  osmRelationId: string;
  name: string;
  longitude: number;
  latitude: number;
  roadRefs: string[];
  sourceUpdatedAt: string;
}

const ROAD_REF_KEYS = new Set([
  "ref",
  "destination:ref",
  "destination:ref:forward",
  "destination:ref:backward",
]);

function normalizeRoadRef(value: string) {
  return value.trim().toUpperCase().replaceAll(" ", "");
}

function roadRefsFromTags(tags: Record<string, string> | undefined) {
  if (!tags) return [];

  return Object.entries(tags)
    .filter(([key]) => ROAD_REF_KEYS.has(key))
    .flatMap(([, value]) => value.split(";"))
    .map(normalizeRoadRef)
    .filter(Boolean);
}

export function normalizeOsmJunctions(
  response: OverpassJunctionResponse,
): OsmJunctionCandidate[] {
  const ways = new Map(
    response.elements
      .filter((element) => element.type === "way")
      .map((element) => [element.id, element]),
  );

  return response.elements.flatMap((element) => {
    if (
      element.type !== "relation" ||
      element.tags?.type !== "junction" ||
      !element.center
    ) {
      return [];
    }

    const memberRoadRefs = (element.members ?? [])
      .filter((member) => member.type === "way")
      .flatMap((member) => roadRefsFromTags(ways.get(member.ref)?.tags));
    const roadRefs = [...new Set(memberRoadRefs)].sort();
    const junctionRef = element.tags.ref?.trim();

    return [
      {
        osmRelationId: String(element.id),
        name:
          element.tags.name?.trim() ||
          (junctionRef ? `Kavşak ${junctionRef}` : `OSM kavşağı ${element.id}`),
        longitude: element.center.lon,
        latitude: element.center.lat,
        roadRefs,
        sourceUpdatedAt: response.osm3s.timestamp_osm_base,
      },
    ];
  });
}
