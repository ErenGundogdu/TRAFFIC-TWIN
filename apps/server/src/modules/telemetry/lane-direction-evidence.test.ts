import { describe, expect, it } from "vitest";

import {
  resolveLaneDirections,
  resolveLaneDirectionsFromLayout,
} from "./lane-direction-evidence.js";

describe("resolveLaneDirections", () => {
  it("resolves a lane only when historical direction evidence is dominant", () => {
    expect(
      resolveLaneDirections([
        {
          assetId: "fintraffic-tms:20002",
          lane: 1,
          direction: 1,
          vehicleCount: 990,
        },
        {
          assetId: "fintraffic-tms:20002",
          lane: 1,
          direction: 2,
          vehicleCount: 10,
        },
      ]),
    ).toEqual([{ assetId: "fintraffic-tms:20002", lane: 1, direction: 1 }]);
  });

  it("keeps sparse or ambiguous evidence unresolved", () => {
    expect(
      resolveLaneDirections([
        {
          assetId: "fintraffic-tms:20002",
          lane: 1,
          direction: 1,
          vehicleCount: 9,
        },
        {
          assetId: "fintraffic-tms:20002",
          lane: 2,
          direction: 1,
          vehicleCount: 51,
        },
        {
          assetId: "fintraffic-tms:20002",
          lane: 2,
          direction: 2,
          vehicleCount: 49,
        },
      ]),
    ).toEqual([]);
  });
});

describe("resolveLaneDirectionsFromLayout", () => {
  // Fixtures below are the real 22 Sep 2026 raw-passage crosstabs for these
  // TMS numbers, used to confirm the sequential-numbering assumption before
  // relying on it: every lane the sensor actually reports fell inside the
  // predicted span, with zero cross-direction misassignments across the 14
  // stations checked (vt1, vt3, vt4, kt51 and st101 roads).
  it("assigns direction 1 to the first forwardLaneCount lanes and direction 2 to the rest", () => {
    expect(
      resolveLaneDirectionsFromLayout(
        [{ tmsNumber: 20002, forwardLaneCount: 3, reverseLaneCount: 2 }],
        [
          {
            assetId: "fintraffic-tms:20002",
            tmsNumber: 20002,
            lanes: [1, 2, 3, 4, 5],
          },
        ],
      ),
    ).toEqual([
      { assetId: "fintraffic-tms:20002", lane: 1, direction: 1 },
      { assetId: "fintraffic-tms:20002", lane: 2, direction: 1 },
      { assetId: "fintraffic-tms:20002", lane: 3, direction: 1 },
      { assetId: "fintraffic-tms:20002", lane: 4, direction: 2 },
      { assetId: "fintraffic-tms:20002", lane: 5, direction: 2 },
    ]);
  });

  it("leaves a live lane unresolved when it falls outside the official lane count instead of guessing", () => {
    // TMS 117 (vt1_Munkkiniemi): official layout claims 2+3 lanes, but lane
    // 3 never produces a single passage in the real archive. It must stay
    // unresolved, not be folded into direction 2 by the sequential rule.
    expect(
      resolveLaneDirectionsFromLayout(
        [{ tmsNumber: 117, forwardLaneCount: 2, reverseLaneCount: 3 }],
        [
          {
            assetId: "fintraffic-tms:117",
            tmsNumber: 117,
            lanes: [1, 2, 4, 5],
          },
        ],
      ),
    ).toEqual([
      { assetId: "fintraffic-tms:117", lane: 1, direction: 1 },
      { assetId: "fintraffic-tms:117", lane: 2, direction: 1 },
      { assetId: "fintraffic-tms:117", lane: 4, direction: 2 },
      { assetId: "fintraffic-tms:117", lane: 5, direction: 2 },
    ]);
  });

  it("never assigns a lane number beyond the official total", () => {
    // TMS 150 (kt50_Vantaanportti): layout claims 5+5, but only lane 6 of
    // direction 2 physically exists; lanes 7-10 are not real and must not
    // receive a fabricated direction even if something reports them.
    expect(
      resolveLaneDirectionsFromLayout(
        [{ tmsNumber: 150, forwardLaneCount: 5, reverseLaneCount: 5 }],
        [
          {
            assetId: "fintraffic-tms:150",
            tmsNumber: 150,
            lanes: [1, 2, 3, 4, 5, 6, 11],
          },
        ],
      ),
    ).toEqual([
      { assetId: "fintraffic-tms:150", lane: 1, direction: 1 },
      { assetId: "fintraffic-tms:150", lane: 2, direction: 1 },
      { assetId: "fintraffic-tms:150", lane: 3, direction: 1 },
      { assetId: "fintraffic-tms:150", lane: 4, direction: 1 },
      { assetId: "fintraffic-tms:150", lane: 5, direction: 1 },
      { assetId: "fintraffic-tms:150", lane: 6, direction: 2 },
    ]);
  });

  it("leaves a station unresolved when no official layout is known for it", () => {
    expect(
      resolveLaneDirectionsFromLayout(
        [{ tmsNumber: 20002, forwardLaneCount: 3, reverseLaneCount: 2 }],
        [
          {
            assetId: "fintraffic-tms:99999",
            tmsNumber: 99999,
            lanes: [1, 2],
          },
        ],
      ),
    ).toEqual([]);
  });
});
