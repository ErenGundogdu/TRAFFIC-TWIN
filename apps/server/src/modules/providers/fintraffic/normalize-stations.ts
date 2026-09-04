import type {
  CoverageArea,
  StationSummary,
  TrafficDirection,
} from "@traffic-twin/contracts";

import type {
  FintrafficStationCollection,
  FintrafficStationData,
  FintrafficStationDataCollection,
} from "./schemas.js";

const SENSOR_NAMES = {
  1: {
    speed: "KESKINOPEUS_5MIN_LIUKUVA_SUUNTA1",
    flow: "OHITUKSET_5MIN_LIUKUVA_SUUNTA1",
  },
  2: {
    speed: "KESKINOPEUS_5MIN_LIUKUVA_SUUNTA2",
    flow: "OHITUKSET_5MIN_LIUKUVA_SUUNTA2",
  },
} as const;

const FRESHNESS_LIMIT_MS = 3 * 60 * 1_000;

function isInsideCoverage(
  longitude: number,
  latitude: number,
  [minLongitude, minLatitude, maxLongitude, maxLatitude]: CoverageArea["bbox"],
) {
  return (
    longitude >= minLongitude &&
    longitude <= maxLongitude &&
    latitude >= minLatitude &&
    latitude <= maxLatitude
  );
}

function normalizeDirection(
  stationData: FintrafficStationData | undefined,
  direction: 1 | 2,
): TrafficDirection {
  const names = SENSOR_NAMES[direction];
  const speed = stationData?.sensorValues.find(
    (sensor) => sensor.name === names.speed && sensor.unit === "km/h",
  );
  const flow = stationData?.sensorValues.find(
    (sensor) => sensor.name === names.flow && sensor.unit === "kpl/h",
  );
  const measuredAt = [speed?.measuredTime, flow?.measuredTime]
    .filter((value): value is string => value !== undefined)
    .sort()
    .at(-1);

  return {
    direction,
    label: `Yön ${direction}`,
    averageSpeedKmh: speed?.value ?? null,
    flowVehiclesPerHour: flow?.value ?? null,
    measuredAt: measuredAt ?? null,
  };
}

export function normalizeStations(
  stationCollection: FintrafficStationCollection,
  dataCollection: FintrafficStationDataCollection,
  coverageArea: CoverageArea,
  now = new Date(),
): StationSummary[] {
  const dataByStationId = new Map(
    dataCollection.stations.map((station) => [station.id, station]),
  );

  return stationCollection.features
    .filter((feature) => feature.properties.collectionStatus === "GATHERING")
    .filter((feature) => {
      const [longitude, latitude] = feature.geometry.coordinates;
      return isInsideCoverage(longitude, latitude, coverageArea.bbox);
    })
    .map((feature) => {
      const stationData = dataByStationId.get(feature.id);
      const directions = [
        normalizeDirection(stationData, 1),
        normalizeDirection(stationData, 2),
      ] satisfies [TrafficDirection, TrafficDirection];
      const newestMeasurement = directions
        .map((direction) => direction.measuredAt)
        .filter((value): value is string => value !== null)
        .sort()
        .at(-1);
      const ageMs = newestMeasurement
        ? now.getTime() - new Date(newestMeasurement).getTime()
        : Number.POSITIVE_INFINITY;
      const [longitude, latitude] = feature.geometry.coordinates;

      return {
        id: `fintraffic-tms:${feature.id}`,
        providerStationId: feature.id,
        tmsNumber: feature.properties.tmsNumber,
        name: feature.properties.name,
        longitude,
        latitude,
        bearing: feature.properties.bearing,
        freshness:
          newestMeasurement === undefined
            ? "UNAVAILABLE"
            : ageMs <= FRESHNESS_LIMIT_MS
              ? "FRESH"
              : "STALE",
        directions,
      };
    });
}
