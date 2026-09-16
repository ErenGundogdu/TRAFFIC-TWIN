import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().max(65_535).default(4_000),
  CLIENT_ORIGIN: z.url().default("http://localhost:3000"),
  DATABASE_URL: z
    .url()
    .default(
      "postgresql://traffic_twin:traffic_twin@localhost:55432/traffic_twin",
    ),
  FINTRAFFIC_BASE_URL: z.url().default("https://tie.digitraffic.fi/api/tms/v1"),
  FINTRAFFIC_TRAFFIC_MESSAGE_BASE_URL: z
    .url()
    .default("https://tie.digitraffic.fi/api/traffic-message/v2"),
  FINTRAFFIC_USER: z
    .string()
    .min(3)
    .default("TrafficTwin/InternshipProject 0.1"),
  OVERPASS_BASE_URL: z.url().default("https://overpass-api.de/api/interpreter"),
  LIVE_POLL_INTERVAL_MS: z.coerce.number().int().min(60_000).default(60_000),
  TRAFFIC_EVENT_POLL_INTERVAL_MS: z.coerce
    .number()
    .int()
    .min(60_000)
    .default(300_000),
  ANOMALY_BASELINE_WEEKS: z.coerce.number().int().min(6).max(52).default(12),
  ANOMALY_MINIMUM_SAMPLES: z.coerce.number().int().min(3).max(52).default(6),
  ANOMALY_PERSISTENCE_COUNT: z.coerce.number().int().min(2).max(10).default(2),
  RAW_DATA_DIR: z.string().min(1).default("../../data/raw"),
  LIVE_OBSERVATION_RETENTION_DAYS: z.coerce
    .number()
    .int()
    .positive()
    .default(90),
  HISTORY_MINUTE_RETENTION_DAYS: z.coerce.number().int().positive().default(90),
});

export type AppEnv = z.infer<typeof envSchema>;

export function parseEnv(input: NodeJS.ProcessEnv = process.env): AppEnv {
  return envSchema.parse(input);
}
