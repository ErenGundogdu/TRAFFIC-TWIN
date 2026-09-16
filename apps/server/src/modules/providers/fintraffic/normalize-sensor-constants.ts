import type { FintrafficStationSensorConstantsCollection } from "./schemas.js";

export interface DirectionReference {
  direction: 1 | 2;
  freeFlowSpeedKmh: number | null;
  maximumFlowVehiclesPerHour: number | null;
}

const REFERENCE_NAMES = {
  1: { freeFlowSpeed: "VVAPAAS1", maximumFlow: "MS1" },
  2: { freeFlowSpeed: "VVAPAAS2", maximumFlow: "MS2" },
} as const;

function monthDay(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!month || !day) throw new Error(`Could not resolve date in ${timeZone}.`);
  return `${month}-${day}`;
}

function isActive(
  value: { validFrom: string; validTo: string },
  currentMonthDay: string,
) {
  return value.validFrom <= value.validTo
    ? currentMonthDay >= value.validFrom && currentMonthDay <= value.validTo
    : currentMonthDay >= value.validFrom || currentMonthDay <= value.validTo;
}

function positiveValue(
  values: FintrafficStationSensorConstantsCollection["stations"][number]["sensorConstantValues"],
  name: string,
  currentMonthDay: string,
) {
  const value = values.find(
    (item) => item.name === name && isActive(item, currentMonthDay),
  )?.value;
  return value !== undefined && value > 0 ? value : null;
}

export function normalizeStationReferences(
  collection: FintrafficStationSensorConstantsCollection | null,
  stationId: number,
  at: Date,
  timeZone: string,
): [DirectionReference, DirectionReference] {
  const values =
    collection?.stations.find((station) => station.id === stationId)
      ?.sensorConstantValues ?? [];
  const currentMonthDay = monthDay(at, timeZone);

  return ([1, 2] as const).map((direction) => {
    const names = REFERENCE_NAMES[direction];
    return {
      direction,
      freeFlowSpeedKmh: positiveValue(
        values,
        names.freeFlowSpeed,
        currentMonthDay,
      ),
      maximumFlowVehiclesPerHour: positiveValue(
        values,
        names.maximumFlow,
        currentMonthDay,
      ),
    };
  }) as [DirectionReference, DirectionReference];
}
