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

export interface HttpValidators {
  etag?: string;
  lastModified?: string;
}

export type ConditionalStationDataResult =
  | { status: "not-modified"; validators: HttpValidators }
  | {
      status: "modified";
      data: z.infer<typeof stationDataCollectionSchema>;
      validators: HttpValidators;
    };

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

  async getCurrentStationDataConditional(
    validators: HttpValidators = {},
  ): Promise<ConditionalStationDataResult> {
    const response = await this.fetch("stations/data", {
      ...(validators.etag ? { "If-None-Match": validators.etag } : {}),
      ...(validators.lastModified
        ? { "If-Modified-Since": validators.lastModified }
        : {}),
    });
    const etag = response.headers.get("etag") ?? validators.etag;
    const lastModified =
      response.headers.get("last-modified") ?? validators.lastModified;
    const nextValidators: HttpValidators = {
      ...(etag ? { etag } : {}),
      ...(lastModified ? { lastModified } : {}),
    };

    if (response.status === 304) {
      return { status: "not-modified", validators: nextValidators };
    }

    if (!response.ok) {
      throw new FintrafficResponseError(
        `Fintraffic request failed with status ${response.status}.`,
        response.status,
      );
    }

    return {
      status: "modified",
      data: await this.parse(response, stationDataCollectionSchema),
      validators: nextValidators,
    };
  }

  private async get<T>(path: string, schema: z.ZodType<T>): Promise<T> {
    const response = await this.fetch(path);

    if (!response.ok) {
      throw new FintrafficResponseError(
        `Fintraffic request failed with status ${response.status}.`,
        response.status,
      );
    }

    return this.parse(response, schema);
  }

  private fetch(path: string, extraHeaders: Record<string, string> = {}) {
    return this.fetchImplementation(
      new URL(path, `${this.baseUrl.replace(/\/$/, "")}/`),
      {
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip",
          "Digitraffic-User": this.userAgent,
          ...extraHeaders,
        },
        signal: AbortSignal.timeout(15_000),
      },
    );
  }

  private async parse<T>(response: Response, schema: z.ZodType<T>): Promise<T> {
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
