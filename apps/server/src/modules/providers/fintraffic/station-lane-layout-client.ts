import { z } from "zod";

import { FintrafficResponseError } from "./client.js";

// This feed is the same undocumented-but-verified "TMS statistics" family
// already used by the statistics client. It carries the road authority's
// own lane count per direction (kaista1/kaista2), which the raw per-vehicle
// archive does not expose on its own for stations we have not reprocessed.
const stationLaneLayoutRowSchema = z
  .object({
    piste: z.number().int().positive(),
    kaista1: z.number().int().nonnegative(),
    kaista2: z.number().int().nonnegative(),
  })
  .loose();

export interface StationLaneLayout {
  tmsNumber: number;
  forwardLaneCount: number;
  reverseLaneCount: number;
}

export class FintrafficStationLaneLayoutClient {
  constructor(
    private readonly url: string,
    private readonly userAgent: string,
    private readonly fetchImplementation: typeof fetch = fetch,
  ) {}

  async listLayouts(): Promise<StationLaneLayout[]> {
    const response = await this.fetchImplementation(this.url, {
      headers: {
        Accept: "application/json",
        "Digitraffic-User": this.userAgent,
      },
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      throw new FintrafficResponseError(
        `Fintraffic station lane layout request failed with status ${response.status}.`,
        response.status,
      );
    }

    const body: unknown = await response.json();
    if (!Array.isArray(body)) {
      throw new Error(
        "Fintraffic station lane layout response was not a list.",
      );
    }

    // Some entries (decommissioned or non-standard installations) do not
    // publish a lane count at all. Skip only those rows instead of letting
    // a handful of nulls invalidate every other station's layout.
    return body.flatMap((row) => {
      const parsed = stationLaneLayoutRowSchema.safeParse(row);
      if (!parsed.success) return [];
      return [
        {
          tmsNumber: parsed.data.piste,
          forwardLaneCount: parsed.data.kaista1,
          reverseLaneCount: parsed.data.kaista2,
        },
      ];
    });
  }
}
