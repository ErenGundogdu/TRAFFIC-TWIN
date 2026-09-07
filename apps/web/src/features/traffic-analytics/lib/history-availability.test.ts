import type { HistoryAssetAvailability } from "@traffic-twin/contracts";
import { describe, expect, it } from "vitest";

import {
  commonAvailableDates,
  findAssetAvailability,
} from "./history-availability";

const availability: HistoryAssetAvailability[] = [
  {
    assetId: "station-a",
    firstDate: "2026-09-01",
    lastDate: "2026-09-03",
    availableDayCount: 3,
    availableDates: ["2026-09-01", "2026-09-02", "2026-09-03"],
  },
  {
    assetId: "station-b",
    firstDate: "2026-09-02",
    lastDate: "2026-09-04",
    availableDayCount: 2,
    availableDates: ["2026-09-02", "2026-09-04"],
  },
];

describe("history availability", () => {
  it("finds availability for a selected asset", () => {
    expect(findAssetAvailability(availability, "station-a")?.lastDate).toBe(
      "2026-09-03",
    );
    expect(findAssetAvailability(availability, "missing")).toBeNull();
  });

  it("returns only dates shared by all selected assets", () => {
    expect(commonAvailableDates(availability, ["station-a"])).toEqual([
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
    ]);
    expect(
      commonAvailableDates(availability, ["station-a", "station-b"]),
    ).toEqual(["2026-09-02"]);
  });
});
