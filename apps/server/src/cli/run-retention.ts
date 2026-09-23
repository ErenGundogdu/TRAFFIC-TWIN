import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { parseEnv } from "../config/env.js";
import { createDatabase } from "../infrastructure/database/client.js";
import { RetentionService } from "../modules/maintenance/retention-service.js";
import { FINTRAFFIC_HISTORY_PROCESSOR_VERSION } from "../modules/ingestion/history-processor-version.js";
import { RawArchiveRepository } from "../modules/maintenance/raw-archive-repository.js";
import { RawArchiveRetentionService } from "../modules/maintenance/raw-archive-retention-service.js";

const rootEnvPath = resolve(import.meta.dirname, "../../../../.env");
if (existsSync(rootEnvPath)) process.loadEnvFile(rootEnvPath);

const env = parseEnv();
const connection = createDatabase(env.DATABASE_URL);

try {
  const aggregateResult = await new RetentionService(connection.db).run(
    env.LIVE_OBSERVATION_RETENTION_DAYS,
    env.HISTORY_MINUTE_RETENTION_DAYS,
    env.HISTORY_HOUR_RETENTION_DAYS,
    env.HISTORY_DAY_RETENTION_DAYS,
  );
  const rawArchiveResult = await new RawArchiveRetentionService(
    new RawArchiveRepository(connection.db),
    resolve(process.cwd(), env.RAW_DATA_DIR),
    {
      minuteRetentionDays: env.HISTORY_MINUTE_RETENTION_DAYS,
      hourRetentionDays: env.HISTORY_HOUR_RETENTION_DAYS,
      dayRetentionDays: env.HISTORY_DAY_RETENTION_DAYS,
    },
    FINTRAFFIC_HISTORY_PROCESSOR_VERSION,
  ).run(env.RAW_HISTORY_RETENTION_DAYS);
  console.log(JSON.stringify({ aggregateResult, rawArchiveResult }, null, 2));
} finally {
  await connection.pool.end();
}
