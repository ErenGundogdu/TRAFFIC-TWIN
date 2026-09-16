import { z } from "zod";

const DEFAULT_BACKEND_URL = "http://localhost:4000";

const webEnvironmentSchema = z.object({
  NEXT_PUBLIC_API_URL: z
    .url()
    .refine(
      (value) => ["http:", "https:"].includes(new URL(value).protocol),
      "NEXT_PUBLIC_API_URL bir HTTP(S) adresi olmalıdır.",
    )
    .default(DEFAULT_BACKEND_URL),
});

type WebEnvironment = {
  NEXT_PUBLIC_API_URL?: string;
};

export type WebConfig = Readonly<{
  backendUrl: string;
}>;

export function parseWebConfig(input: WebEnvironment): WebConfig {
  const environment = webEnvironmentSchema.parse(input);

  return Object.freeze({
    backendUrl: environment.NEXT_PUBLIC_API_URL.replace(/\/+$/, ""),
  });
}

export const webConfig = parseWebConfig({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
});
