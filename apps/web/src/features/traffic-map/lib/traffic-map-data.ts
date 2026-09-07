import type {
  AnomalyEvaluation,
  JunctionSummary,
  StationSummary,
} from "@traffic-twin/contracts";

export function createStationGeoJson(
  stations: StationSummary[],
  selectedStationId: string | null,
) {
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
        shortLabel: `TMS ${station.tmsNumber}`,
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
        selected: junction.id === selectedJunctionId,
      },
    })),
  };
}

export function createAnomalyGeoJson(
  stations: StationSummary[],
  anomalies: AnomalyEvaluation[],
) {
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
              properties: { assetId: station.id, status },
            },
          ]
        : [];
    }),
  };
}
