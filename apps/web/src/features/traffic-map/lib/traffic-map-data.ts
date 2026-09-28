import type {
  AnomalyEvaluation,
  JunctionSummary,
  StationSummary,
  TrafficEvent,
} from "@traffic-twin/contracts";

const EMPTY_STATION_ID_SET: ReadonlySet<string> = new Set();

export function createStationGeoJson(
  stations: StationSummary[],
  selectedStationId: string | null,
  anomalies: AnomalyEvaluation[] = [],
  highlightedStationIds: ReadonlySet<string> = EMPTY_STATION_ID_SET,
) {
  const anomalyStatusByAsset = createAnomalyStatusByAsset(anomalies);

  return {
    type: "FeatureCollection" as const,
    features: stations.map((station) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [station.longitude, station.latitude],
      },
      properties: {
        id: station.id,
        kind: "station",
        name: station.name,
        tmsNumber: station.tmsNumber,
        freshness: station.freshness,
        selected: station.id === selectedStationId,
        highlighted: highlightedStationIds.has(station.id),
        dimmed:
          highlightedStationIds.size > 0 &&
          station.id !== selectedStationId &&
          !highlightedStationIds.has(station.id),
        anomalyStatus: anomalyStatusByAsset.get(station.id) ?? "NONE",
        shortLabel: `TMS ${station.tmsNumber}`,
        bearing:
          station.directions[0]?.heading?.degrees ?? station.bearing ?? -1,
        directionOneFlowStatus:
          station.directions[0]?.trafficFlow.status ?? "INSUFFICIENT_DATA",
        directionTwoFlowStatus:
          station.directions[1]?.trafficFlow.status ?? "INSUFFICIENT_DATA",
        directionOneSpeed: station.directions[0]?.averageSpeedKmh ?? null,
        directionTwoSpeed: station.directions[1]?.averageSpeedKmh ?? null,
      },
    })),
  };
}

export function createJunctionGeoJson(
  junctions: JunctionSummary[],
  selectedJunctionId: string | null,
) {
  return {
    type: "FeatureCollection" as const,
    features: junctions.map((junction) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [junction.longitude, junction.latitude],
      },
      properties: {
        id: junction.id,
        kind: "junction",
        name: junction.name,
        coverage: junction.coverage,
        sensorCount: junction.sensors.length,
        roadRefCount: junction.roadRefs.length,
        selected: junction.id === selectedJunctionId,
      },
    })),
  };
}

export function createAnomalyGeoJson(
  stations: StationSummary[],
  anomalies: AnomalyEvaluation[],
  selectedStationId: string | null = null,
) {
  const statusByAsset = createAnomalyStatusByAsset(anomalies);

  return {
    type: "FeatureCollection" as const,
    features: stations.flatMap((station) => {
      const status = statusByAsset.get(station.id);
      return status
        ? [
            {
              type: "Feature" as const,
              geometry: {
                type: "Point" as const,
                coordinates: [station.longitude, station.latitude],
              },
              properties: {
                assetId: station.id,
                status,
                selected: station.id === selectedStationId,
              },
            },
          ]
        : [];
    }),
  };
}

function createAnomalyStatusByAsset(anomalies: AnomalyEvaluation[]) {
  const statusByAsset = new Map<string, "ACTIVE" | "CANDIDATE">();

  for (const anomaly of anomalies) {
    if (anomaly.status === "ACTIVE") {
      statusByAsset.set(anomaly.assetId, "ACTIVE");
    } else if (
      anomaly.status === "CANDIDATE" &&
      statusByAsset.get(anomaly.assetId) !== "ACTIVE"
    ) {
      statusByAsset.set(anomaly.assetId, "CANDIDATE");
    }
  }

  return statusByAsset;
}

export function countAnomalousAssets(anomalies: AnomalyEvaluation[]) {
  return createAnomalyStatusByAsset(anomalies).size;
}

export function createTrafficEventGeoJson(events: TrafficEvent[]) {
  return {
    type: "FeatureCollection" as const,
    features: events
      .filter((event) => event.status !== "ENDED")
      .map((event) => ({
        type: "Feature" as const,
        geometry: event.geometry,
        properties: {
          id: event.id,
          kind: "traffic-event",
          category: event.category,
          status: event.status,
          severity: event.severity,
          title: event.title,
          language: event.language,
          description: event.description,
          startsAt: event.startsAt,
          endsAt: event.endsAt,
          roadNumbers: event.roadNumbers.join(", "),
        },
      })),
  };
}

export function getTrafficEventAnchor(event: TrafficEvent) {
  const positions = getGeometryPositions(event.geometry);
  if (positions.length === 0) return null;

  const bounds = positions.reduce(
    (current, [longitude, latitude]) => ({
      minLongitude: Math.min(current.minLongitude, longitude),
      minLatitude: Math.min(current.minLatitude, latitude),
      maxLongitude: Math.max(current.maxLongitude, longitude),
      maxLatitude: Math.max(current.maxLatitude, latitude),
    }),
    {
      minLongitude: Number.POSITIVE_INFINITY,
      minLatitude: Number.POSITIVE_INFINITY,
      maxLongitude: Number.NEGATIVE_INFINITY,
      maxLatitude: Number.NEGATIVE_INFINITY,
    },
  );

  return {
    longitude: (bounds.minLongitude + bounds.maxLongitude) / 2,
    latitude: (bounds.minLatitude + bounds.maxLatitude) / 2,
  };
}

export function createTrafficEventAnchorGeoJson(events: TrafficEvent[]) {
  return {
    type: "FeatureCollection" as const,
    features: events.flatMap((event) => {
      if (event.status === "ENDED") return [];
      const anchor = getTrafficEventAnchor(event);
      if (!anchor) return [];

      return [
        {
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: [anchor.longitude, anchor.latitude],
          },
          properties: { id: event.id },
        },
      ];
    }),
  };
}

function getGeometryPositions(
  geometry: TrafficEvent["geometry"],
): Array<[number, number]> {
  switch (geometry.type) {
    case "Point":
      return [geometry.coordinates];
    case "LineString":
      return geometry.coordinates;
    case "MultiLineString":
    case "Polygon":
      return geometry.coordinates.flat();
    case "MultiPolygon":
      return geometry.coordinates.flat(2);
  }
}
