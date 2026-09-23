import { describe, expect, it, vi } from "vitest";

import { FintrafficResponseError } from "./client.js";
import { FintrafficStationLaneLayoutClient } from "./station-lane-layout-client.js";

describe("FintrafficStationLaneLayoutClient", () => {
  it("maps the official piste/kaista1/kaista2 fields to lane counts per direction", async () => {
    const fetchImplementation: typeof fetch = vi.fn(async () =>
      Response.json([
        { piste: 20002, nimi: "vt1_Espoo_Hirvisuo", kaista1: 3, kaista2: 2 },
        { piste: 3, nimi: "kt51_Kivenlahti", kaista1: 4, kaista2: 3 },
      ]),
    );
    const client = new FintrafficStationLaneLayoutClient(
      "https://tie.digitraffic.fi/ui/tms/history/pisteet.json",
      "TrafficTwin/Test",
      fetchImplementation,
    );

    const layouts = await client.listLayouts();

    expect(layouts).toEqual([
      { tmsNumber: 20002, forwardLaneCount: 3, reverseLaneCount: 2 },
      { tmsNumber: 3, forwardLaneCount: 4, reverseLaneCount: 3 },
    ]);
  });

  it("skips only the rows missing the fields it depends on, keeping the rest", async () => {
    // Real production data confirmed this matters: a handful of stations
    // publish kaista1/kaista2 as null (decommissioned or non-standard
    // installations). Those rows must not invalidate every other station.
    const fetchImplementation: typeof fetch = vi.fn(async () =>
      Response.json([
        { piste: 20002, kaista1: 3, kaista2: 2 },
        { piste: 150, kaista1: null, kaista2: null },
        { piste: 999 },
      ]),
    );
    const client = new FintrafficStationLaneLayoutClient(
      "https://tie.digitraffic.fi/ui/tms/history/pisteet.json",
      "TrafficTwin/Test",
      fetchImplementation,
    );

    expect(await client.listLayouts()).toEqual([
      { tmsNumber: 20002, forwardLaneCount: 3, reverseLaneCount: 2 },
    ]);
  });

  it("throws a FintrafficResponseError on a non-OK response", async () => {
    const fetchImplementation: typeof fetch = vi.fn(
      async () => new Response("unavailable", { status: 503 }),
    );
    const client = new FintrafficStationLaneLayoutClient(
      "https://tie.digitraffic.fi/ui/tms/history/pisteet.json",
      "TrafficTwin/Test",
      fetchImplementation,
    );

    await expect(client.listLayouts()).rejects.toBeInstanceOf(
      FintrafficResponseError,
    );
  });
});
