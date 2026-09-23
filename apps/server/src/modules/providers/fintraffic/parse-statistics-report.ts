import { finlandLocalToUtcIfValid } from "./parse-history.js";

export type StatisticsResolution = "hour" | "day";

export interface VolumeStatistic {
  direction: 1 | 2;
  resolution: StatisticsResolution;
  bucketStart: Date;
  vehicleCount: number;
}

export interface SpeedStatistic {
  direction: 1 | 2;
  resolution: StatisticsResolution;
  bucketStart: Date;
  averageSpeedKmh: number;
  detectedVehicleCount: number;
}

export function partitionStatisticsReport(
  csv: string,
  expectedTmsNumbers: number[],
): Map<number, string> {
  const { headers, rows } = parseRows(csv);
  const stationIndex = headers.findIndex(
    (header) => header.toLocaleLowerCase("fi-FI") === "pistetunnus",
  );
  if (stationIndex < 0) {
    throw new Error("Fintraffic statistics report has no station identifier.");
  }
  const expected = new Set(expectedTmsNumbers);
  const byStation = new Map(
    expectedTmsNumbers.map((number) => [number, [headers.join(";")]]),
  );
  for (const row of rows) {
    const number = Number(row[stationIndex]);
    if (!Number.isInteger(number) || !expected.has(number)) {
      throw new Error(
        "Fintraffic statistics report contains an unexpected station.",
      );
    }
    byStation.get(number)!.push(row.join(";"));
  }
  return new Map(
    [...byStation].map(([number, lines]) => [number, lines.join("\n")]),
  );
}

export function parseVolumeStatistics(
  csv: string,
  resolution: StatisticsResolution,
): VolumeStatistic[] {
  const { headers, rows } = parseRows(csv);
  requireHeaders(
    headers,
    resolution === "hour"
      ? ["pvm", "suunta", "ajoneuvoluokka", "00_01"]
      : ["pvm", "suunta", "kaikki"],
  );
  return rows.flatMap((row): VolumeStatistic[] => {
    const direction = parseDirection(value(row, headers, "suunta"));
    const date = parseCompactDate(value(row, headers, "pvm"));
    if (!direction || !date) return [];

    if (resolution === "day") {
      const vehicleCount = parseNonnegativeInteger(
        valueCaseInsensitive(row, headers, "kaikki"),
      );
      const bucketStart = dateAt(date, 0);
      return vehicleCount === null || bucketStart === null
        ? []
        : [
            {
              direction,
              resolution,
              bucketStart,
              vehicleCount,
            },
          ];
    }

    if (
      value(row, headers, "ajoneuvoluokka").toLocaleLowerCase("fi-FI") !==
      "kaikki"
    ) {
      return [];
    }

    return headers.flatMap((header, index) => {
      const match = /^(\d{2})_(\d{2})$/.exec(header);
      if (!match) return [];
      const hour = Number(match[1]);
      const vehicleCount = parseNonnegativeInteger(row[index] ?? "");
      const bucketStart = dateAt(date, hour);
      return vehicleCount === null || bucketStart === null
        ? []
        : [
            {
              direction,
              resolution,
              bucketStart,
              vehicleCount,
            },
          ];
    });
  });
}

export function parseSpeedStatistics(
  csv: string,
  resolution: StatisticsResolution,
): SpeedStatistic[] {
  const { headers, rows } = parseRows(csv);
  requireHeaders(
    headers,
    resolution === "hour"
      ? ["pvm", "suunta", "klo", "kaikki", "keskinopeus_kaikki"]
      : ["pvm", "suunta", "kaikki", "keskinopeus_kaikki"],
  );
  return rows.flatMap((row) => {
    const direction = parseDirection(value(row, headers, "suunta"));
    const date = parseCompactDate(value(row, headers, "pvm"));
    const averageSpeedKmh = parseNonnegativeNumber(
      valueCaseInsensitive(row, headers, "keskinopeus_kaikki"),
    );
    const detectedVehicleCount = parseNonnegativeInteger(
      valueCaseInsensitive(row, headers, "kaikki"),
    );
    if (
      !direction ||
      !date ||
      averageSpeedKmh === null ||
      detectedVehicleCount === null
    ) {
      return [];
    }
    const hour =
      resolution === "hour"
        ? parseNonnegativeInteger(value(row, headers, "klo"))
        : 0;
    if (hour === null || hour > 23) return [];
    const bucketStart = dateAt(date, hour);
    if (bucketStart === null) return [];

    return [
      {
        direction,
        resolution,
        bucketStart,
        averageSpeedKmh,
        detectedVehicleCount,
      },
    ];
  });
}

function parseRows(csv: string) {
  const lines = csv
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.length > 0);
  const headers = (lines.shift() ?? "").split(";");
  return { headers, rows: lines.map((line) => line.split(";")) };
}

function requireHeaders(headers: string[], required: string[]) {
  const normalized = new Set(
    headers.map((header) => header.toLocaleLowerCase("fi-FI")),
  );
  if (required.some((header) => !normalized.has(header))) {
    throw new Error("Fintraffic statistics report has an unexpected format.");
  }
}

function value(row: string[], headers: string[], header: string) {
  const index = headers.indexOf(header);
  return index < 0 ? "" : (row[index] ?? "");
}

function valueCaseInsensitive(
  row: string[],
  headers: string[],
  header: string,
) {
  const index = headers.findIndex(
    (candidate) => candidate.toLocaleLowerCase("fi-FI") === header,
  );
  return index < 0 ? "" : (row[index] ?? "");
}

function parseDirection(value_: string): 1 | 2 | null {
  const parsed = Number(value_);
  return parsed === 1 || parsed === 2 ? parsed : null;
}

function parseCompactDate(value_: string) {
  if (!/^\d{8}$/.test(value_)) return null;
  const year = Number(value_.slice(0, 4));
  const month = Number(value_.slice(4, 6));
  const day = Number(value_.slice(6, 8));
  const date = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateAt(date: Date, hour: number) {
  const year = date.getUTCFullYear();
  const ordinal =
    Math.floor(
      (date.getTime() - Date.UTC(year, 0, 1)) / (24 * 60 * 60 * 1_000),
    ) + 1;
  // The spring DST jump can produce a source 03_04 bucket even though 03:00
  // does not exist in Helsinki. It must not collide with the real 04:00 bucket.
  return finlandLocalToUtcIfValid(year, ordinal, hour, 0, 0);
}

function parseNonnegativeNumber(value_: string) {
  if (value_.trim() === "") return null;
  const parsed = Number(value_);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function parseNonnegativeInteger(value_: string) {
  const parsed = parseNonnegativeNumber(value_);
  return parsed !== null && Number.isInteger(parsed) ? parsed : null;
}
