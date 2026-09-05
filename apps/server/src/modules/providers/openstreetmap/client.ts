import type { CoverageArea } from "@traffic-twin/contracts";

import { normalizeOsmJunctions } from "./normalize-junctions.js";
import { overpassJunctionResponseSchema } from "./schemas.js";

export class OverpassResponseError extends Error {
  constructor(status: number) {
    super(`Overpass responded with HTTP ${status}.`);
    this.name = "OverpassResponseError";
  }
}

export class OpenStreetMapClient {
  constructor(
    private readonly baseUrl: string,
    private readonly userAgent: string,
  ) {}

  async getJunctions(coverageArea: CoverageArea) {
    const [west, south, east, north] = coverageArea.bbox;
    const query = [
      "[out:json][timeout:25];",
      `rel[type=junction](${south},${west},${north},${east})->.junctions;`,
      "(.junctions;way(r.junctions)[highway];);",
      "out body center;",
    ].join("");
    const url = new URL(this.baseUrl);
    url.searchParams.set("data", query);
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": this.userAgent,
      },
      signal: AbortSignal.timeout(35_000),
    });

    if (!response.ok) {
      throw new OverpassResponseError(response.status);
    }

    return normalizeOsmJunctions(
      overpassJunctionResponseSchema.parse(await response.json()),
    );
  }
}
