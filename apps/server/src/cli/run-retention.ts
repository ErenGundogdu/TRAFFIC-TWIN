import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { parseEnv } from "../config/env.js";
import { createDatabase } from "../infrastructure/database/client.js";
import { RetentionService } from "../modules/maintenance/retention-service.js";

const rootEnvPath = resolve(import.meta.dirname, "../../../../.env");
if (existsSync(rootEnvPath)) process.loadEnvFile(rootEnvPath);

const env = parseEnv();
const connection = createDatabase(env.DATABASE_URL);

try {
  const result = await new RetentionService(connection.db).run(
    env.LIVE_OBSERVATION_RETENTION_DAYS,
    env.HISTORY_MINUTE_RETENTION_DAYS,
  );
  console.log(JSON.stringify(result, null, 2));
} finally {
  await connection.pool.end();
}
