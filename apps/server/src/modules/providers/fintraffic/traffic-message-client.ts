import type { z } from "zod";

import { FintrafficResponseError } from "./client.js";
import { trafficMessageFeatureCollectionSchema } from "./traffic-message-schemas.js";

export class FintrafficTrafficMessageClient {
  constructor(
    private readonly baseUrl: string,
    private readonly userAgent: string,
    private readonly fetchImplementation: typeof fetch = fetch,
  ) {}

  getTrafficAnnouncements() {
    return this.get(
      "traffic-announcements",
      trafficMessageFeatureCollectionSchema,
    );
  }

  getRoadWorks() {
    return this.get("roadworks", trafficMessageFeatureCollectionSchema);
  }

  private async get<T>(path: string, schema: z.ZodType<T>): Promise<T> {
    const response = await this.fetchImplementation(
      new URL(path, `${this.baseUrl.replace(/\/$/, "")}/`),
      {
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip",
          "Digitraffic-User": this.userAgent,
        },
        signal: AbortSignal.timeout(30_000),
      },
    );

    if (!response.ok) {
      throw new FintrafficResponseError(
        `Fintraffic traffic message request failed with status ${response.status}.`,
        response.status,
      );
    }

    try {
      return schema.parse(await response.json());
    } catch (error) {
      throw new FintrafficResponseError(
        "Fintraffic returned an invalid traffic message response.",
        response.status,
        { cause: error },
      );
    }
  }
}
