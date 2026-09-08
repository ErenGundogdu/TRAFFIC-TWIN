import type {
  StationRoadContext,
  StationSummary,
} from "@traffic-twin/contracts";

function stationFlow(station: StationSummary) {
  const values = station.directions
    .map((direction) => direction.flowVehiclesPerHour)
    .filter((value): value is number => value !== null);
  return values.length === 0
    ? null
    : values.reduce((total, value) => total + value, 0);
}

function stationSpeed(station: StationSummary) {
  const weighted = station.directions.flatMap((direction) =>
    direction.averageSpeedKmh === null || direction.flowVehiclesPerHour === null
      ? []
      : [
          {
            speed: direction.averageSpeedKmh,
            flow: direction.flowVehiclesPerHour,
          },
        ],
  );
  const totalFlow = weighted.reduce((total, item) => total + item.flow, 0);
  return totalFlow === 0
    ? null
    : weighted.reduce((total, item) => total + item.speed * item.flow, 0) /
        totalFlow;
}

function circlePolygon(
  longitude: number,
  latitude: number,
  radiusMeters: number,
) {
  const points = Array.from({ length: 17 }, (_, index) => {
    const angle = (index / 16) * Math.PI * 2;
    const latitudeOffset = (Math.sin(angle) * radiusMeters) / 111_320;
    const longitudeOffset =
      (Math.cos(angle) * radiusMeters) /
      (111_320 * Math.cos((latitude * Math.PI) / 180));
    return [longitude + longitudeOffset, latitude + latitudeOffset] as [
      number,
      number,
    ];
  });
  return [points];
}

export function createTrafficDensityGeoJson(stations: StationSummary[]) {
  return {
    type: "FeatureCollection" as const,
    features: stations.map((station) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [station.longitude, station.latitude],
      },
      properties: {
        assetId: station.id,
        totalFlowVehiclesPerHour: stationFlow(station) ?? 0,
        hasFlow: stationFlow(station) !== null,
      },
    })),
  };
}

export function createTrafficVolumeGeoJson(stations: StationSummary[]) {
  const flows = stations
    .map(stationFlow)
    .filter((value): value is number => value !== null);
  const maximumFlow = Math.max(...flows, 1);

  return {
    type: "FeatureCollection" as const,
    features: stations.flatMap((station) => {
      const flow = stationFlow(station);
      if (flow === null) return [];
      return [
        {
          type: "Feature" as const,
          geometry: {
            type: "Polygon" as const,
            coordinates: circlePolygon(station.longitude, station.latitude, 48),
          },
          properties: {
            assetId: station.id,
            totalFlowVehiclesPerHour: flow,
            relativeFlowPercent: (flow / maximumFlow) * 100,
            heightMeters: 25 + (flow / maximumFlow) * 425,
          },
        },
      ];
    }),
  };
}

export function createRoadFlowGeoJson(
  context: StationRoadContext | undefined,
  station: StationSummary | null,
) {
  if (!context || !station) {
    return { type: "FeatureCollection" as const, features: [] };
  }

  return {
    type: "FeatureCollection" as const,
    features: context.segments.map((segment) => {
      const direction = segment.direction
        ? station.directions.find(
            (item) => item.direction === segment.direction,
          )
        : undefined;
      return {
        type: "Feature" as const,
        geometry: {
          type: "LineString" as const,
          coordinates: segment.coordinates,
        },
        properties: {
          id: segment.id,
          assetId: context.assetId,
          direction: segment.direction ?? 0,
          directionLabel: direction?.label ?? "Yön bilinmiyor",
          name: segment.name ?? `Yol ${segment.roadRef ?? ""}`.trim(),
          speedKmh: direction?.averageSpeedKmh ?? stationSpeed(station) ?? -1,
          flowVehiclesPerHour: direction?.flowVehiclesPerHour ?? 0,
          hasMeasurement: Boolean(
            direction &&
            direction.averageSpeedKmh !== null &&
            direction.flowVehiclesPerHour !== null,
          ),
        },
      };
    }),
  };
}
