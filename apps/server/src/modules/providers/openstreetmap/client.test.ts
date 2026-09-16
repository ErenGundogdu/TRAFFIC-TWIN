import { afterEach, describe, expect, it, vi } from "vitest";

import { OpenStreetMapClient } from "./client.js";
import type { OverpassResponseError } from "./client.js";

const input = {
  longitude: 24.637997,
  latitude: 60.220898,
  bearing: 298,
  roadRef: "1",
};

describe("OpenStreetMapClient", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("preserves the upstream HTTP status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 429 })),
    );

    const client = new OpenStreetMapClient(
      "https://overpass.example/api/interpreter",
      "traffic-twin-test",
    );

    await expect(client.getRoadContext(input)).rejects.toMatchObject({
      name: "OverpassResponseError",
      status: 429,
    });
  });

  it("normalizes network and timeout failures", async () => {
    const cause = new Error("network unavailable");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(cause)),
    );

    const client = new OpenStreetMapClient(
      "https://overpass.example/api/interpreter",
      "traffic-twin-test",
    );

    await expect(client.getRoadContext(input)).rejects.toEqual(
      expect.objectContaining<Partial<OverpassResponseError>>({
        name: "OverpassResponseError",
        status: null,
        cause,
      }),
    );
  });
});
