import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { z } from "zod";

import { parseEnv } from "../config/env.js";
import { createDatabase } from "../infrastructure/database/client.js";
import { PostgresStationCatalogRepository } from "../modules/asset-catalog/station-catalog-repository.js";
import { StatisticsBulkImportService } from "../modules/ingestion/statistics-bulk-import-service.js";
import { StatisticsImportRepository } from "../modules/ingestion/statistics-import-repository.js";
import { StatisticsImportService } from "../modules/ingestion/statistics-import-service.js";
import { resolveStatisticsRollingWindow } from "../modules/ingestion/statistics-rolling-window.js";
import { FintrafficStatisticsClient } from "../modules/providers/fintraffic/statistics-client.js";

const rootEnvPath = resolve(import.meta.dirname, "../../../../.env");
if (existsSync(rootEnvPath)) process.loadEnvFile(rootEnvPath);

const argumentSchema = z
  .object({
    coverage: z.string().min(1).default("helsinki"),
    station: z.union([z.literal("all"), z.coerce.number().int().positive()]),
    limit: z.coerce.number().int().positive().optional(),
    offset: z.coerce.number().int().nonnegative().default(0),
    batch: z.coerce.number().int().min(1).max(20).default(10),
    resolution: z.enum(["hour", "day"]),
    window: z.literal("rolling").optional(),
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
  })
  .refine(
    (value) =>
      value.window === "rolling"
        ? value.from === undefined && value.to === undefined
        : value.from !== undefined && value.to !== undefined,
    { message: "Provide both dates or use --window rolling." },
  )
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    message: "'from' must be before or equal to 'to'.",
  });

function parseArguments(arguments_: string[]) {
  const values = new Map<string, string>();
  const normalizedArguments = arguments_.filter(
    (argument) => argument !== "--",
  );
  for (let index = 0; index < normalizedArguments.length; index += 2) {
    const key = normalizedArguments[index]?.replace(/^--/, "");
    const value = normalizedArguments[index + 1];
    if (key && value) values.set(key, value);
  }
  return argumentSchema.parse(Object.fromEntries(values));
}

const input = parseArguments(process.argv.slice(2));
const env = parseEnv();
const connection = createDatabase(env.DATABASE_URL);

try {
  const stationRepository = new PostgresStationCatalogRepository(connection.db);
  const coverageArea = await stationRepository.findCoverageArea(input.coverage);
  if (!coverageArea) {
    throw new Error(`Coverage area '${input.coverage}' was not found.`);
  }
  const range =
    input.window === "rolling"
      ? resolveStatisticsRollingWindow(input.resolution, coverageArea.timeZone)
      : { from: input.from!, to: input.to! };
  const repository = new StatisticsImportRepository(connection.db);
  const client = new FintrafficStatisticsClient(
    env.FINTRAFFIC_BASE_URL,
    env.FINTRAFFIC_USER,
  );
  const stationNumbers =
    input.station === "all"
      ? (await stationRepository.listStations(input.coverage))
          .map((station) => station.tmsNumber)
          .sort((left, right) => left - right)
          .slice(
            input.offset,
            input.limit === undefined ? undefined : input.offset + input.limit,
          )
      : [input.station];
  console.log(
    `Statistics ${input.resolution} ${range.from}..${range.to}; ${stationNumbers.length} stations.`,
  );
  if (input.station === "all") {
    const result = await new StatisticsBulkImportService(
      stationRepository,
      repository,
      client,
    ).importRange({
      coverageAreaId: input.coverage,
      tmsNumbers: stationNumbers,
      resolution: input.resolution,
      ...range,
      batchSize: input.batch,
      onProgress: (message) => console.log(message),
    });
    console.log(JSON.stringify(result, null, 2));
    if (result.failures.length > 0) process.exitCode = 1;
  } else {
    try {
      const result = await new StatisticsImportService(
        stationRepository,
        repository,
        client,
      ).importRange(
        {
          coverageAreaId: input.coverage,
          tmsNumber: input.station,
          resolution: input.resolution,
          ...range,
        },
        (progress) => {
          console.log(
            `TMS ${progress.tmsNumber} ${progress.resolution} ${progress.from}..${progress.to} direction ${progress.direction}: ${progress.status}`,
          );
        },
      );
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`TMS ${input.station}: ${message}`);
      process.exitCode = 1;
    }
  }
} finally {
  await connection.pool.end();
}
