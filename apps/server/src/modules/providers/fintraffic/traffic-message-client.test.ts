import { describe, expect, it, vi } from "vitest";

import { readFixture } from "./test-fixtures.js";
import { FintrafficTrafficMessageClient } from "./traffic-message-client.js";

describe("FintrafficTrafficMessageClient", () => {
  it("identifies the application and validates Simple JSON messages", async () => {
    const fetchImplementation = vi.fn<typeof fetch>(async () =>
      Promise.resolve(
        Response.json(readFixture("traffic-announcements.sample.json")),
      ),
    );
    const client = new FintrafficTrafficMessageClient(
      "https://tie.digitraffic.fi/api/traffic-message/v2",
      "TrafficTwin/Test",
      fetchImplementation,
    );

    const result = await client.getTrafficAnnouncements();
    const [url, requestInit] = fetchImplementation.mock.calls[0] ?? [];
    const headers = new Headers(requestInit?.headers);

    expect(result.features[0]?.properties.situationId).toBe("GUID50470546");
    expect(String(url)).toBe(
      "https://tie.digitraffic.fi/api/traffic-message/v2/traffic-announcements",
    );
    expect(headers.get("Digitraffic-User")).toBe("TrafficTwin/Test");
    expect(headers.get("Accept-Encoding")).toBe("gzip");
  });
});
