import { describe, expect, it, vi } from "vitest";

import {
  FintrafficStatisticsClient,
  FintrafficStatisticsRangeError,
} from "./statistics-client.js";

describe("FintrafficStatisticsClient", () => {
  it("builds the official hourly all-vehicle report query", async () => {
    let requestedUrlText = "";
    const fetchImplementation: typeof fetch = vi.fn(async (input) => {
      requestedUrlText = String(input);
      return new Response("pvm;suunta\n", { status: 200 });
    });
    const client = new FintrafficStatisticsClient(
      "https://tie.digitraffic.fi/api/tms/v1",
      "TrafficTwin/Test",
      fetchImplementation,
    );

    await client.getReport({
      tmsNumber: 20002,
      direction: 1,
      metric: "speed",
      resolution: "hour",
      from: "2025-09-01",
      to: "2025-09-02",
    });

    expect(requestedUrlText).not.toBe("");
    const requestedUrl = new URL(requestedUrlText);
    expect(requestedUrl.pathname).toBe("/api/tms/v1/history");
    expect(Object.fromEntries(requestedUrl.searchParams)).toMatchObject({
      api: "keskinopeus",
      tyyppi: "h",
      piste: "20002",
      luokka: "kaikki",
      suunta: "1",
      sisallytakaistat: "0",
    });
  });

  it("retries a temporary 429 response and respects a final success", async () => {
    const fetchImplementation: typeof fetch = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response("busy", {
          status: 429,
          headers: { "Retry-After": "0" },
        }),
      )
      .mockResolvedValueOnce(new Response("pvm;suunta\n", { status: 200 }));
    const client = new FintrafficStatisticsClient(
      "https://tie.digitraffic.fi/api/tms/v1",
      "TrafficTwin/Test",
      fetchImplementation,
      { minimumIntervalMs: 0, retryDelayMs: 0, maximumAttempts: 3 },
    );

    await expect(
      client.getReport({
        tmsNumber: 20002,
        direction: 1,
        metric: "speed",
        resolution: "hour",
        from: "2025-09-01",
        to: "2025-09-02",
      }),
    ).resolves.toBe("pvm;suunta\n");
    expect(fetchImplementation).toHaveBeenCalledTimes(2);
  });

  it("spaces concurrent request starts by the configured interval", async () => {
    vi.useFakeTimers({ now: new Date("2026-09-22T00:00:00Z") });
    try {
      const starts: number[] = [];
      const fetchImplementation: typeof fetch = vi.fn(async () => {
        starts.push(Date.now());
        return new Response("pvm;suunta\n", { status: 200 });
      });
      const client = new FintrafficStatisticsClient(
        "https://tie.digitraffic.fi/api/tms/v1",
        "TrafficTwin/Test",
        fetchImplementation,
        { minimumIntervalMs: 500, retryDelayMs: 0, maximumAttempts: 1 },
      );
      const query = {
        tmsNumber: 20002,
        direction: 1 as const,
        resolution: "day" as const,
        from: "2025-09-01",
        to: "2025-09-02",
      };
      const reports = Promise.all([
        client.getReport({ ...query, metric: "volume" }),
        client.getReport({ ...query, metric: "speed" }),
      ]);
      await vi.advanceTimersByTimeAsync(500);
      await reports;
      expect(starts[1]! - starts[0]!).toBe(500);
    } finally {
      vi.useRealTimers();
    }
  });

  it("uses the official comma-separated station parameter and identifies source calculation errors", async () => {
    let requestedUrl = "";
    const client = new FintrafficStatisticsClient(
      "https://tie.digitraffic.fi/api/tms/v1",
      "TrafficTwin/Test",
      vi.fn(async (input) => {
        requestedUrl = String(input);
        return new Response("The error is:Division by zero sql", {
          status: 400,
        });
      }),
      { minimumIntervalMs: 0, retryDelayMs: 0, maximumAttempts: 1 },
    );

    await expect(
      client.getBulkReport({
        tmsNumbers: [3, 4],
        direction: 1,
        metric: "speed",
        resolution: "day",
        from: "2022-01-01",
        to: "2022-12-31",
      }),
    ).rejects.toBeInstanceOf(FintrafficStatisticsRangeError);
    expect(new URL(requestedUrl).searchParams.get("piste")).toBe("3,4");
  });
});
