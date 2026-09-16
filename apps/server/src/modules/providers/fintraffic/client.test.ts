import { describe, expect, it, vi } from "vitest";

import { FintrafficClient } from "./client.js";
import { readFixture } from "./test-fixtures.js";

describe("FintrafficClient", () => {
  it("identifies the application, requests gzip and validates the payload", async () => {
    const payload = readFixture("stations.sample.json");
    const fetchImplementation = vi.fn<typeof fetch>(async () =>
      Promise.resolve(Response.json(payload)),
    );
    const client = new FintrafficClient(
      "https://tie.digitraffic.fi/api/tms/v1",
      "TrafficTwin/Test",
      fetchImplementation,
    );

    const result = await client.getStations();
    const [, requestInit] = fetchImplementation.mock.calls[0] ?? [];
    const headers = new Headers(requestInit?.headers);

    expect(result.features).toHaveLength(1);
    expect(headers.get("Accept-Encoding")).toBe("gzip");
    expect(headers.get("Digitraffic-User")).toBe("TrafficTwin/Test");
  });

  it("sends validators and accepts a 304 without parsing a body", async () => {
    const fetchImplementation = vi.fn<typeof fetch>(async () =>
      Promise.resolve(
        new Response(null, {
          status: 304,
          headers: { ETag: '"station-data-v2"' },
        }),
      ),
    );
    const client = new FintrafficClient(
      "https://tie.digitraffic.fi/api/tms/v1",
      "TrafficTwin/Test",
      fetchImplementation,
    );

    const result = await client.getCurrentStationDataConditional({
      etag: '"station-data-v1"',
      lastModified: "Fri, 04 Sep 2026 09:00:00 GMT",
    });
    const headers = new Headers(
      fetchImplementation.mock.calls[0]?.[1]?.headers,
    );

    expect(result).toEqual({
      status: "not-modified",
      validators: {
        etag: '"station-data-v2"',
        lastModified: "Fri, 04 Sep 2026 09:00:00 GMT",
      },
    });
    expect(headers.get("If-None-Match")).toBe('"station-data-v1"');
    expect(headers.get("If-Modified-Since")).toBe(
      "Fri, 04 Sep 2026 09:00:00 GMT",
    );
  });

  it("validates station-specific sensor constants", async () => {
    const fetchImplementation = vi.fn<typeof fetch>(async () =>
      Promise.resolve(
        Response.json({
          dataUpdatedTime: "2026-09-08T06:00:00Z",
          stations: [
            {
              id: 20002,
              sensorConstantValues: [
                {
                  name: "VVAPAAS1",
                  value: 100,
                  validFrom: "01-01",
                  validTo: "12-31",
                },
              ],
            },
          ],
        }),
      ),
    );
    const client = new FintrafficClient(
      "https://tie.digitraffic.fi/api/tms/v1",
      "TrafficTwin/Test",
      fetchImplementation,
    );

    await expect(client.getSensorConstants()).resolves.toMatchObject({
      stations: [{ id: 20002 }],
    });
    expect(String(fetchImplementation.mock.calls[0]?.[0])).toBe(
      "https://tie.digitraffic.fi/api/tms/v1/stations/sensor-constants",
    );
  });
});
