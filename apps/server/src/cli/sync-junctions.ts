import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { parseEnv } from "../config/env.js";
import { createDatabase } from "../infrastructure/database/client.js";
import { PostgresStationCatalogRepository } from "../modules/asset-catalog/station-catalog-repository.js";
import { JunctionService } from "../modules/junctions/junction-service.js";
import { PostgresJunctionCatalogRepository } from "../modules/junctions/junction-repository.js";
import { OpenStreetMapClient } from "../modules/providers/openstreetmap/client.js";

const rootEnvPath = resolve(import.meta.dirname, "../../../../.env");
if (existsSync(rootEnvPath)) process.loadEnvFile(rootEnvPath);

function readCoverageArgument(args: string[]) {
  const index = args.indexOf("--coverage");
  const value = index >= 0 ? args[index + 1] : undefined;
  if (!value) throw new Error("Kullanım: --coverage <coverage-area-id>");
  return value;
}

const env = parseEnv();
const { db, pool } = createDatabase(env.DATABASE_URL);

try {
  const service = new JunctionService(
    new PostgresStationCatalogRepository(db),
    new PostgresJunctionCatalogRepository(db),
    new OpenStreetMapClient(env.OVERPASS_BASE_URL, env.FINTRAFFIC_USER),
  );
  console.log(
    JSON.stringify(
      await service.sync(readCoverageArgument(process.argv)),
      null,
      2,
    ),
  );
} finally {
  await pool.end();
}
