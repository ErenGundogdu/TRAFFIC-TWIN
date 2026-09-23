import type {
  CoverageArea,
  StationSummary,
  TrafficDirection,
  TrafficLane,
} from "@traffic-twin/contracts";

import type {
  FintrafficStationCollection,
  FintrafficStationData,
  FintrafficStationDataCollection,
  FintrafficStationSensorConstantsCollection,
} from "./schemas.js";

import { classifyMeasurementFreshness } from "../../telemetry/classify-measurement-freshness.js";
import { classifyTrafficFlow } from "../../telemetry/classify-traffic-flow.js";
import { normalizeDirectionHeading } from "./normalize-direction-heading.js";
import type { DirectionReference } from "./normalize-sensor-constants.js";
import { normalizeStationReferences } from "./normalize-sensor-constants.js";

const SENSOR_NAMES = {
  1: {
    speed: "KESKINOPEUS_5MIN_LIUKUVA_SUUNTA1",
    flow: "OHITUKSET_5MIN_LIUKUVA_SUUNTA1",
    speedPercent: "KESKINOPEUS_5MIN_LIUKUVA_SUUNTA1_VVAPAAS1",
    flowPercent: "OHITUKSET_5MIN_LIUKUVA_SUUNTA1_MS1",
  },
  2: {
    speed: "KESKINOPEUS_5MIN_LIUKUVA_SUUNTA2",
    flow: "OHITUKSET_5MIN_LIUKUVA_SUUNTA2",
    speedPercent: "KESKINOPEUS_5MIN_LIUKUVA_SUUNTA2_VVAPAAS2",
    flowPercent: "OHITUKSET_5MIN_LIUKUVA_SUUNTA2_MS2",
  },
} as const;

const LANE_SPEED_SENSOR_PATTERN = /^LIUKUVA_NOPEUS_KAISTA_(\d+)$/;
const LANE_ROLLING_FLOW_SENSOR_PATTERN = /^OHITUKSET_5MIN_LIUKUVA_KAISTA(\d+)$/;
const LANE_FIXED_FLOW_SENSOR_PATTERN = /^OHITUKSET_5MIN_KIINTEA_KAISTA(\d+)$/;

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
  reference: DirectionReference,
  providerBearing: number | null,
): TrafficDirection {
  const names = SENSOR_NAMES[direction];
  const speed = stationData?.sensorValues.find(
    (sensor) => sensor.name === names.speed && sensor.unit === "km/h",
  );
  const flow = stationData?.sensorValues.find(
    (sensor) => sensor.name === names.flow && sensor.unit === "kpl/h",
  );
  const speedPercent = stationData?.sensorValues.find(
    (sensor) => sensor.name === names.speedPercent,
  );
  const flowPercent = stationData?.sensorValues.find(
    (sensor) => sensor.name === names.flowPercent,
  );
  const measuredAt = [
    speed?.measuredTime,
    flow?.measuredTime,
    speedPercent?.measuredTime,
    flowPercent?.measuredTime,
  ]
    .filter((value): value is string => value !== undefined)
    .sort()
    .at(-1);

  return {
    direction,
    heading: normalizeDirectionHeading(providerBearing, direction),
    averageSpeedKmh: speed?.value ?? null,
    flowVehiclesPerHour: flow?.value ?? null,
    measuredAt: measuredAt ?? null,
    trafficFlow: classifyTrafficFlow({
      averageSpeedKmh: speed?.value ?? null,
      flowVehiclesPerHour: flow?.value ?? null,
      freeFlowSpeedKmh: reference.freeFlowSpeedKmh,
      maximumFlowVehiclesPerHour: reference.maximumFlowVehiclesPerHour,
      reportedSpeedPercent: speedPercent?.value ?? null,
      reportedFlowPercent: flowPercent?.value ?? null,
    }),
  };
}

function normalizeLanes(
  stationData: FintrafficStationData | undefined,
): TrafficLane[] {
  const lanes = new Map<
    number,
    {
      averageSpeedKmh: number | null;
      speedMeasuredAt: string | null;
      rollingFlow: { value: number; measuredAt: string } | null;
      fixedFlow: { value: number; measuredAt: string } | null;
    }
  >();

  for (const sensor of stationData?.sensorValues ?? []) {
    const speedMatch = LANE_SPEED_SENSOR_PATTERN.exec(sensor.name);
    const rollingFlowMatch = LANE_ROLLING_FLOW_SENSOR_PATTERN.exec(sensor.name);
    const fixedFlowMatch = LANE_FIXED_FLOW_SENSOR_PATTERN.exec(sensor.name);
    const lane = Number(
      speedMatch?.[1] ?? rollingFlowMatch?.[1] ?? fixedFlowMatch?.[1],
    );
    if (!Number.isInteger(lane) || lane < 1) continue;

    const current = lanes.get(lane) ?? {
      averageSpeedKmh: null,
      speedMeasuredAt: null,
      rollingFlow: null,
      fixedFlow: null,
    };
    if (speedMatch && sensor.unit === "km/h") {
      current.averageSpeedKmh = sensor.value;
      current.speedMeasuredAt = sensor.measuredTime;
    }
    if (rollingFlowMatch && sensor.unit === "kpl/h") {
      current.rollingFlow = {
        value: sensor.value,
        measuredAt: sensor.measuredTime,
      };
    }
    if (fixedFlowMatch && sensor.unit === "kpl/h") {
      current.fixedFlow = {
        value: sensor.value,
        measuredAt: sensor.measuredTime,
      };
    }
    lanes.set(lane, current);
  }

  return [...lanes.entries()]
    .map(([lane, values]) => {
      const flow = values.rollingFlow ?? values.fixedFlow;
      return {
        lane,
        direction: null,
        directionEvidence: null,
        averageSpeedKmh: values.averageSpeedKmh,
        flowVehiclesPerHour: flow?.value ?? null,
        flowWindow: values.rollingFlow
          ? ("ROLLING_5_MINUTES" as const)
          : values.fixedFlow
            ? ("FIXED_5_MINUTES" as const)
            : null,
        measuredAt:
          [values.speedMeasuredAt, flow?.measuredAt]
            .filter((value): value is string => value !== null)
            .sort()
            .at(-1) ?? null,
      };
    })
    .sort((left, right) => left.lane - right.lane);
}

export function normalizeStations(
  stationCollection: FintrafficStationCollection,
  dataCollection: FintrafficStationDataCollection,
  coverageArea: CoverageArea,
  now = new Date(),
  sensorConstants: FintrafficStationSensorConstantsCollection | null = null,
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
      const references = normalizeStationReferences(
        sensorConstants,
        feature.id,
        now,
        coverageArea.timeZone,
      );
      const directions = [
        normalizeDirection(
          stationData,
          1,
          references[0],
          feature.properties.bearing,
        ),
        normalizeDirection(
          stationData,
          2,
          references[1],
          feature.properties.bearing,
        ),
      ] satisfies [TrafficDirection, TrafficDirection];
      const newestMeasurement = directions
        .map((direction) => direction.measuredAt)
        .filter((value): value is string => value !== null)
        .sort()
        .at(-1);
      const [longitude, latitude] = feature.geometry.coordinates;

      return {
        id: `fintraffic-tms:${feature.id}`,
        providerStationId: feature.id,
        tmsNumber: feature.properties.tmsNumber,
        name: feature.properties.name,
        longitude,
        latitude,
        bearing: feature.properties.bearing,
        freshness: classifyMeasurementFreshness(newestMeasurement, now),
        directions,
        lanes: normalizeLanes(stationData),
      };
    });
}
