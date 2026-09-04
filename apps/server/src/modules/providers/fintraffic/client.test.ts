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
});
