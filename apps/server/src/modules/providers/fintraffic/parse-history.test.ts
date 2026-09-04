import { createReadStream } from "node:fs";

import { describe, expect, it } from "vitest";

import { finlandLocalToUtc, parseFintrafficHistory } from "./parse-history.js";

describe("Fintraffic raw history parser", () => {
  it("converts Finland standard and daylight-saving local times to UTC", () => {
    expect(finlandLocalToUtc(2026, 15, 12, 0, 0).toISOString()).toBe(
      "2026-01-15T10:00:00.000Z",
    );
    expect(finlandLocalToUtc(2026, 246, 12, 0, 0).toISOString()).toBe(
      "2026-09-03T09:00:00.000Z",
    );
  });

  it("excludes source-marked faulty rows and creates three resolutions", async () => {
    const parsed = await parseFintrafficHistory(
      createReadStream(
        new URL("./__fixtures__/history.sample.csv", import.meta.url),
      ),
    );
    const directionOneMinute = parsed.aggregates.find(
      (item) => item.resolution === "minute" && item.direction === 1,
    );

    expect(parsed.recordCount).toBe(5);
    expect(parsed.validRecordCount).toBe(4);
    expect(parsed.aggregates).toHaveLength(6);
    expect(directionOneMinute?.bucketStart.toISOString()).toBe(
      "2026-09-02T21:00:00.000Z",
    );
    expect(directionOneMinute?.averageSpeedKmh).toBeCloseTo(88.67, 2);
    expect(directionOneMinute?.vehicleCount).toBe(3);
  });
});
