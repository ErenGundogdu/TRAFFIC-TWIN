import { describe, expect, it } from "vitest";

import { stationSensorConstantsCollectionSchema } from "./schemas.js";
import { normalizeStationReferences } from "./normalize-sensor-constants.js";

describe("normalizeStationReferences", () => {
  it("selects the station and season-specific direction references", () => {
    const constants = stationSensorConstantsCollectionSchema.parse({
      dataUpdatedTime: "2026-09-08T06:00:00Z",
      stations: [
        {
          id: 20002,
          sensorConstantValues: [
            {
              name: "VVAPAAS1",
              value: 100,
              validFrom: "04-01",
              validTo: "10-31",
            },
            {
              name: "VVAPAAS1",
              value: 90,
              validFrom: "11-01",
              validTo: "03-31",
            },
            {
              name: "VVAPAAS2",
              value: 105,
              validFrom: "01-01",
              validTo: "12-31",
            },
            { name: "MS1", value: 3600, validFrom: "01-01", validTo: "12-31" },
            { name: "MS2", value: 3200, validFrom: "01-01", validTo: "12-31" },
          ],
        },
      ],
    });

    expect(
      normalizeStationReferences(
        constants,
        20002,
        new Date("2026-09-08T07:00:00Z"),
        "Europe/Helsinki",
      ),
    ).toEqual([
      {
        direction: 1,
        freeFlowSpeedKmh: 100,
        maximumFlowVehiclesPerHour: 3600,
      },
      {
        direction: 2,
        freeFlowSpeedKmh: 105,
        maximumFlowVehiclesPerHour: 3200,
      },
    ]);
  });

  it("returns null references instead of inventing missing constants", () => {
    expect(
      normalizeStationReferences(
        null,
        20002,
        new Date("2026-09-08T07:00:00Z"),
        "Europe/Helsinki",
      ),
    ).toEqual([
      {
        direction: 1,
        freeFlowSpeedKmh: null,
        maximumFlowVehiclesPerHour: null,
      },
      {
        direction: 2,
        freeFlowSpeedKmh: null,
        maximumFlowVehiclesPerHour: null,
      },
    ]);
  });
});
