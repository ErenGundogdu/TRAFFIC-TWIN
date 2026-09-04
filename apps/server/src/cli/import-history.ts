import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { z } from "zod";

import { parseEnv } from "../config/env.js";
import { createDatabase } from "../infrastructure/database/client.js";
import { PostgresStationCatalogRepository } from "../modules/asset-catalog/station-catalog-repository.js";
import { HistoryImportRepository } from "../modules/ingestion/history-import-repository.js";
import { HistoryImportService } from "../modules/ingestion/history-import-service.js";
import { FintrafficHistoryClient } from "../modules/providers/fintraffic/history-client.js";

const rootEnvPath = resolve(import.meta.dirname, "../../../../.env");
if (existsSync(rootEnvPath)) process.loadEnvFile(rootEnvPath);

const argumentSchema = z.object({
  coverage: z.string().min(1).default("helsinki"),
  station: z.coerce.number().int().positive(),
  date: z.iso.date(),
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
  const service = new HistoryImportService(
    new PostgresStationCatalogRepository(connection.db),
    new HistoryImportRepository(connection.db),
    new FintrafficHistoryClient(env.FINTRAFFIC_BASE_URL, env.FINTRAFFIC_USER),
    resolve(process.cwd(), env.RAW_DATA_DIR),
  );
  const result = await service.importDay({
    coverageAreaId: input.coverage,
    tmsNumber: input.station,
    sourceDate: input.date,
  });
  console.log(JSON.stringify(result, null, 2));
} finally {
  await connection.pool.end();
}
