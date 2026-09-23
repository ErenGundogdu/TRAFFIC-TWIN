import type { Readable } from "node:stream";
import { createInterface } from "node:readline";

import type {
  ResolvedHistoryResolution,
  TrafficCompositionBreakdown,
} from "@traffic-twin/contracts";

export interface HistoryAggregate {
  direction: 1 | 2;
  resolution: ResolvedHistoryResolution;
  bucketStart: Date;
  averageSpeedKmh: number;
  vehicleCount: number;
  sampleCount: number;
  vehicleClassBreakdown: TrafficCompositionBreakdown;
  laneBreakdown: TrafficCompositionBreakdown;
  laneVehicleClassBreakdown: TrafficCompositionBreakdown;
}

export interface ParsedHistory {
  recordCount: number;
  validRecordCount: number;
  aggregates: HistoryAggregate[];
}

interface MutableAggregate {
  direction: 1 | 2;
  resolution: ResolvedHistoryResolution;
  bucketStart: Date;
  speedTotal: number;
  count: number;
  vehicleClassBreakdown: TrafficCompositionBreakdown;
  laneBreakdown: TrafficCompositionBreakdown;
  laneVehicleClassBreakdown: TrafficCompositionBreakdown;
}

const HELSINKI_TIME_ZONE = "Europe/Helsinki";

function localTimeParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: HELSINKI_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

export function finlandLocalToUtc(
  year: number,
  ordinal: number,
  hour: number,
  minute: number,
  second: number,
  centisecond = 0,
) {
  const calendarDate = new Date(Date.UTC(year, 0, ordinal));
  const desired = Date.UTC(
    year,
    calendarDate.getUTCMonth(),
    calendarDate.getUTCDate(),
    hour,
    minute,
    second,
    centisecond * 10,
  );
  let candidate = desired;

  for (let iteration = 0; iteration < 2; iteration += 1) {
    const rendered = localTimeParts(new Date(candidate));
    const renderedAsUtc = Date.UTC(
      rendered.year,
      rendered.month - 1,
      rendered.day,
      rendered.hour,
      rendered.minute,
      rendered.second,
      centisecond * 10,
    );
    candidate += desired - renderedAsUtc;
  }

  return new Date(candidate);
}

export function finlandLocalToUtcIfValid(
  year: number,
  ordinal: number,
  hour: number,
  minute: number,
  second: number,
) {
  const utc = finlandLocalToUtc(year, ordinal, hour, minute, second);
  const expectedDate = new Date(Date.UTC(year, 0, ordinal));
  const local = localTimeParts(utc);
  return local.year === expectedDate.getUTCFullYear() &&
    local.month === expectedDate.getUTCMonth() + 1 &&
    local.day === expectedDate.getUTCDate() &&
    local.hour === hour &&
    local.minute === minute &&
    local.second === second
    ? utc
    : null;
}

function bucketStart(
  resolution: ResolvedHistoryResolution,
  year: number,
  ordinal: number,
  hour: number,
  minute: number,
) {
  return finlandLocalToUtc(
    year,
    ordinal,
    resolution === "day" ? 0 : hour,
    resolution === "minute" ? minute : 0,
    0,
  );
}

export async function parseFintrafficHistory(
  input: Readable,
  resolutions: readonly ResolvedHistoryResolution[] = ["minute", "hour", "day"],
): Promise<ParsedHistory> {
  const aggregates = new Map<string, MutableAggregate>();
  let recordCount = 0;
  let validRecordCount = 0;
  const lines = createInterface({ input, crlfDelay: Infinity });

  for await (const line of lines) {
    if (!line.trim()) continue;
    recordCount += 1;
    const fields = line.split(";").map(Number);
    if (fields.length < 16 || fields.some((value) => !Number.isFinite(value))) {
      continue;
    }

    const shortYear = fields[1];
    const ordinal = fields[2];
    const hour = fields[3];
    const minute = fields[4];
    const direction = fields[9];
    const lane = fields[8];
    const vehicleClass = fields[10];
    const speed = fields[11];
    const faulty = fields[12];

    if (
      faulty !== 0 ||
      (direction !== 1 && direction !== 2) ||
      lane === undefined ||
      !Number.isInteger(lane) ||
      lane < 1 ||
      vehicleClass === undefined ||
      !Number.isInteger(vehicleClass) ||
      vehicleClass < 1 ||
      vehicleClass > 9 ||
      speed === undefined ||
      speed < 2 ||
      speed >= 199
    ) {
      continue;
    }

    const year = shortYear! >= 70 ? 1900 + shortYear! : 2000 + shortYear!;
    validRecordCount += 1;

    for (const resolution of resolutions) {
      const start = bucketStart(resolution, year, ordinal!, hour!, minute!);
      const key = `${resolution}:${direction}:${start.toISOString()}`;
      const aggregate = aggregates.get(key) ?? {
        direction,
        resolution,
        bucketStart: start,
        speedTotal: 0,
        count: 0,
        vehicleClassBreakdown: {},
        laneBreakdown: {},
        laneVehicleClassBreakdown: {},
      };
      aggregate.speedTotal += speed;
      aggregate.count += 1;
      incrementBreakdown(
        aggregate.vehicleClassBreakdown,
        String(vehicleClass),
        speed,
      );
      incrementBreakdown(aggregate.laneBreakdown, String(lane), speed);
      incrementBreakdown(
        aggregate.laneVehicleClassBreakdown,
        `${lane}:${vehicleClass}`,
        speed,
      );
      aggregates.set(key, aggregate);
    }
  }

  return {
    recordCount,
    validRecordCount,
    aggregates: [...aggregates.values()].map((aggregate) => ({
      direction: aggregate.direction,
      resolution: aggregate.resolution,
      bucketStart: aggregate.bucketStart,
      averageSpeedKmh: aggregate.speedTotal / aggregate.count,
      vehicleCount: aggregate.count,
      sampleCount: aggregate.count,
      vehicleClassBreakdown: aggregate.vehicleClassBreakdown,
      laneBreakdown: aggregate.laneBreakdown,
      laneVehicleClassBreakdown: aggregate.laneVehicleClassBreakdown,
    })),
  };
}

function incrementBreakdown(
  breakdown: TrafficCompositionBreakdown,
  key: string,
  speedKmh: number,
) {
  const current = breakdown[key] ?? { vehicleCount: 0, speedTotalKmh: 0 };
  current.vehicleCount += 1;
  current.speedTotalKmh += speedKmh;
  breakdown[key] = current;
}
