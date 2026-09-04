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
  FINTRAFFIC_USER: z
    .string()
    .min(3)
    .default("TrafficTwin/InternshipProject 0.1"),
  LIVE_POLL_INTERVAL_MS: z.coerce.number().int().min(60_000).default(60_000),
});

export type AppEnv = z.infer<typeof envSchema>;

export function parseEnv(input: NodeJS.ProcessEnv = process.env): AppEnv {
  return envSchema.parse(input);
}
