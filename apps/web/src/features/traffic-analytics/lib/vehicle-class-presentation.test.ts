import { describe, expect, it } from "vitest";

import { getVehicleClassPresentation } from "./vehicle-class-presentation";

describe("getVehicleClassPresentation", () => {
  it("maps every documented Fintraffic class to a Turkish presentation", () => {
    expect(
      Array.from({ length: 9 }, (_, index) =>
        getVehicleClassPresentation(index + 1),
      ),
    ).not.toContainEqual(
      expect.objectContaining({ label: "Bilinmeyen araç sınıfı" }),
    );
  });

  it("marks only classes used by the freight proxy", () => {
    const freightClasses = Array.from(
      { length: 9 },
      (_, index) => index + 1,
    ).filter(
      (vehicleClass) => getVehicleClassPresentation(vehicleClass).freightProxy,
    );

    expect(freightClasses).toEqual([2, 4, 5, 9]);
  });
});
