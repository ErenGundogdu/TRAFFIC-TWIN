import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { z } from "zod";

import { parseEnv } from "../config/env.js";
import { createDatabase } from "../infrastructure/database/client.js";
import { DEFAULT_ANOMALY_POLICY } from "../modules/anomalies/anomaly-engine.js";
import { PostgresAnomalyRepository } from "../modules/anomalies/anomaly-repository.js";
import { AnomalyService } from "../modules/anomalies/anomaly-service.js";
import { PostgresStationCatalogRepository } from "../modules/asset-catalog/station-catalog-repository.js";
import { PostgresTrafficObservationRepository } from "../modules/telemetry/traffic-observation-repository.js";

const rootEnvPath = resolve(import.meta.dirname, "../../../../.env");
if (existsSync(rootEnvPath)) process.loadEnvFile(rootEnvPath);

const argumentSchema = z.object({
  coverage: z.string().min(1).default("helsinki"),
});

function parseArguments(arguments_: string[]) {
  const values = new Map<string, string>();
  const normalized = arguments_.filter((argument) => argument !== "--");
  for (let index = 0; index < normalized.length; index += 2) {
    const key = normalized[index]?.replace(/^--/, "");
    const value = normalized[index + 1];
    if (key && value) values.set(key, value);
  }
  return argumentSchema.parse(Object.fromEntries(values));
}

const input = parseArguments(process.argv.slice(2));
const env = parseEnv();
const connection = createDatabase(env.DATABASE_URL);

try {
  const service = new AnomalyService(
    new PostgresStationCatalogRepository(connection.db),
    new PostgresTrafficObservationRepository(connection.db),
    new PostgresAnomalyRepository(connection.db),
    {
      ...DEFAULT_ANOMALY_POLICY,
      windowWeeks: env.ANOMALY_BASELINE_WEEKS,
      minimumSamples: env.ANOMALY_MINIMUM_SAMPLES,
      persistenceCount: env.ANOMALY_PERSISTENCE_COUNT,
    },
  );
  console.log(
    JSON.stringify(await service.evaluateCoverage(input.coverage), null, 2),
  );
} finally {
  await connection.pool.end();
}
