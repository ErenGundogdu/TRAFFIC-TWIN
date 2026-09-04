import type { z } from "zod";

import {
  stationDataCollectionSchema,
  stationFeatureCollectionSchema,
} from "./schemas.js";

export class FintrafficResponseError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "FintrafficResponseError";
  }
}

export class FintrafficClient {
  constructor(
    private readonly baseUrl: string,
    private readonly userAgent: string,
    private readonly fetchImplementation: typeof fetch = fetch,
  ) {}

  getStations() {
    return this.get("stations", stationFeatureCollectionSchema);
  }

  getCurrentStationData() {
    return this.get("stations/data", stationDataCollectionSchema);
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
        signal: AbortSignal.timeout(15_000),
      },
    );

    if (!response.ok) {
      throw new FintrafficResponseError(
        `Fintraffic request failed with status ${response.status}.`,
        response.status,
      );
    }

    try {
      return schema.parse(await response.json());
    } catch (error) {
      throw new FintrafficResponseError(
        "Fintraffic returned an invalid response.",
        response.status,
        { cause: error },
      );
    }
  }
}
