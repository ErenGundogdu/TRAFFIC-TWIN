import { createReadStream } from "node:fs";
import { Readable } from "node:stream";

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
    expect(directionOneMinute?.vehicleClassBreakdown).toEqual({
      "1": { vehicleCount: 3, speedTotalKmh: 266 },
    });
    expect(directionOneMinute?.laneBreakdown).toEqual({
      "1": { vehicleCount: 2, speedTotalKmh: 176 },
      "2": { vehicleCount: 1, speedTotalKmh: 90 },
    });
    expect(directionOneMinute?.laneVehicleClassBreakdown).toEqual({
      "1:1": { vehicleCount: 2, speedTotalKmh: 176 },
      "2:1": { vehicleCount: 1, speedTotalKmh: 90 },
    });
  });

  it("creates only the resolutions selected by the retention policy", async () => {
    const parsed = await parseFintrafficHistory(
      createReadStream(
        new URL("./__fixtures__/history.sample.csv", import.meta.url),
      ),
      ["hour", "day"],
    );

    expect(new Set(parsed.aggregates.map((item) => item.resolution))).toEqual(
      new Set(["hour", "day"]),
    );
    expect(parsed.aggregates).toHaveLength(4);
  });

  it("rejects undocumented vehicle classes and invalid speed values", async () => {
    const parsed = await parseFintrafficHistory(
      Readable.from([
        "20002;26;246;12;0;0;0;5;1;1;10;80;0;0;0;0\n",
        "20002;26;246;12;1;0;0;5;1;1;1;199;0;0;0;0\n",
      ]),
      ["minute"],
    );

    expect(parsed).toMatchObject({
      recordCount: 2,
      validRecordCount: 0,
      aggregates: [],
    });
  });
});
