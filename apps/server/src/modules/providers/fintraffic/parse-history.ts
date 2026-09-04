import type { Readable } from "node:stream";
import { createInterface } from "node:readline";

import type { ResolvedHistoryResolution } from "@traffic-twin/contracts";

export interface HistoryAggregate {
  direction: 1 | 2;
  resolution: ResolvedHistoryResolution;
  bucketStart: Date;
  averageSpeedKmh: number;
  vehicleCount: number;
  sampleCount: number;
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
): Promise<ParsedHistory> {
  const aggregates = new Map<string, MutableAggregate>();
  let recordCount = 0;
  let validRecordCount = 0;
  const lines = createInterface({ input, crlfDelay: Infinity });

  for await (const line of lines) {
    if (!line.trim()) continue;
    recordCount += 1;
    const fields = line.split(";").map(Number);
    if (fields.length < 13 || fields.some((value) => !Number.isFinite(value))) {
      continue;
    }

    const shortYear = fields[1];
    const ordinal = fields[2];
    const hour = fields[3];
    const minute = fields[4];
    const direction = fields[9];
    const speed = fields[11];
    const faulty = fields[12];

    if (
      faulty !== 0 ||
      (direction !== 1 && direction !== 2) ||
      speed === undefined ||
      speed < 0
    ) {
      continue;
    }

    const year = shortYear! >= 70 ? 1900 + shortYear! : 2000 + shortYear!;
    validRecordCount += 1;

    for (const resolution of ["minute", "hour", "day"] as const) {
      const start = bucketStart(resolution, year, ordinal!, hour!, minute!);
      const key = `${resolution}:${direction}:${start.toISOString()}`;
      const aggregate = aggregates.get(key) ?? {
        direction,
        resolution,
        bucketStart: start,
        speedTotal: 0,
        count: 0,
      };
      aggregate.speedTotal += speed;
      aggregate.count += 1;
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
    })),
  };
}
